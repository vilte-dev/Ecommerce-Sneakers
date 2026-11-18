-- 0002_funciones_y_triggers.sql
-- Helpers de rol, alta automática de usuarios, validación de tallas (RF-06) y carrito.

create or replace function public.rol_actual() returns text
language sql stable security definer set search_path = public as $$
  select r.nombre from public.usuarios u join public.roles r on r.id = u.rol_id
  where u.id = auth.uid() and u.activo
$$;

create or replace function public.es_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.rol_actual() in ('empleado','dueno','administrador'), false)
$$;

-- "Gerencia": quien administra catálogo, stock y usuarios (el dueño o el administrador).
create or replace function public.es_gerencia() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.rol_actual() in ('dueno','administrador'), false)
$$;

create or replace function public.mi_cliente_id() returns integer
language sql stable security definer set search_path = public as $$
  select id from public.clientes where usuario_id = auth.uid()
$$;

-- Alta automática: cada cuenta nueva de Supabase Auth recibe SIEMPRE el rol "cliente".
-- El rol no se toma de los metadatos del registro (cualquiera podría pedir ser administrador).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_celular text := nullif(trim(new.raw_user_meta_data ->> 'celular'), '');
  v_ci      text := nullif(trim(new.raw_user_meta_data ->> 'ci'), '');
begin
  insert into public.usuarios (id, rol_id, correo, celular, nombre)
  values (
    new.id,
    (select id from public.roles where nombre = 'cliente'),
    new.email,
    v_celular,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(new.email, '@', 1))
  );

  if v_celular is not null then
    -- Si el cliente ya existía por una venta en caja (sin cuenta), se enlaza y conserva su historial.
    insert into public.clientes (usuario_id, celular, correo, ci)
    values (new.id, v_celular, new.email, v_ci)
    on conflict (celular) do update
      set usuario_id = excluded.usuario_id, correo = excluded.correo
      where public.clientes.usuario_id is null;
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RF-06: la talla debe estar dentro del rango de la categoría del modelo.
-- Un CHECK no puede consultar otra tabla, por eso la regla vive en un trigger.
create or replace function public.trg_validar_talla() returns trigger
language plpgsql security definer set search_path = public as $$
declare v record;
begin
  select c.nombre, c.talla_min, c.talla_max into v
  from public.modelos m join public.categorias c on c.id = m.categoria_id
  where m.id = new.modelo_id;

  if not found then
    raise exception 'El modelo % no existe', new.modelo_id using errcode = 'foreign_key_violation';
  end if;
  if new.talla < v.talla_min or (v.talla_max is not null and new.talla > v.talla_max) then
    raise exception 'La talla % no es válida para la categoría % (rango: %)', new.talla, v.nombre,
      case when v.talla_max is null then v.talla_min || ' en adelante' else v.talla_min || ' a ' || v.talla_max end
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger validar_talla before insert or update of modelo_id, talla on public.stock
  for each row execute function public.trg_validar_talla();
create trigger validar_talla before insert or update of modelo_id, talla on public.items_carrito
  for each row execute function public.trg_validar_talla();
create trigger validar_talla before insert or update of modelo_id, talla on public.detalle_pedido
  for each row execute function public.trg_validar_talla();
create trigger validar_talla before insert or update of modelo_id, talla on public.detalle_venta
  for each row execute function public.trg_validar_talla();
create trigger validar_talla before insert or update of modelo_id, talla on public.compras_proveedor
  for each row execute function public.trg_validar_talla();

-- HU-07: el carrito no admite más unidades que el stock disponible.
create or replace function public.trg_validar_cantidad_carrito() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_disponible integer;
begin
  select coalesce(sum(cantidad), 0) into v_disponible
  from public.stock where modelo_id = new.modelo_id and talla = new.talla;
  if new.cantidad > v_disponible then
    raise exception 'Solo hay % unidad(es) disponibles de la talla %', v_disponible, new.talla
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger validar_cantidad before insert or update of cantidad, modelo_id, talla on public.items_carrito
  for each row execute function public.trg_validar_cantidad_carrito();

-- Guarda el carrito completo de forma atómica (security invoker: aplica RLS del cliente).
create or replace function public.guardar_carrito(p_items jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare v_cliente integer; v_carrito integer;
begin
  v_cliente := public.mi_cliente_id();
  if v_cliente is null then
    raise exception 'Tu cuenta no tiene perfil de cliente' using errcode = '42501';
  end if;
  insert into public.carritos (cliente_id) values (v_cliente) on conflict (cliente_id) do nothing;
  select id into v_carrito from public.carritos where cliente_id = v_cliente;

  delete from public.items_carrito where carrito_id = v_carrito;
  insert into public.items_carrito (carrito_id, modelo_id, talla, cantidad)
  select v_carrito, (i ->> 'modelo_id')::int, (i ->> 'talla')::int, (i ->> 'cantidad')::int
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as i;
end $$;

-- Cambio de rol / activación de cuentas (solo gerencia). Evita que alguien se quite su propio acceso.
create or replace function public.cambiar_rol_usuario(p_usuario uuid, p_rol text, p_activo boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_gerencia() then
    raise exception 'No tienes permiso para esta acción' using errcode = '42501';
  end if;
  if p_usuario = auth.uid() and (p_rol not in ('dueno','administrador') or not p_activo) then
    raise exception 'No puedes quitarte tu propio acceso de gerencia' using errcode = 'check_violation';
  end if;
  update public.usuarios
     set rol_id = (select id from public.roles where nombre = p_rol), activo = p_activo
   where id = p_usuario;
  if not found then raise exception 'El usuario no existe'; end if;
end $$;

revoke execute on function public.guardar_carrito(jsonb) from public, anon;
revoke execute on function public.cambiar_rol_usuario(uuid, text, boolean) from public, anon;
grant execute on function public.guardar_carrito(jsonb) to authenticated;
grant execute on function public.cambiar_rol_usuario(uuid, text, boolean) to authenticated;
