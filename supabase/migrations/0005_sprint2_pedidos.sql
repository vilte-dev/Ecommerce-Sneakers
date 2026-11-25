-- 0005_sprint2_pedidos.sql · Sprint 2
-- HU-08 (pedido + despacho), HU-09 (cuentas y QR), HU-10 (comprobante), HU-11 (validación + stock),
-- HU-12 (despacho y WhatsApp), HU-13 (stock), HU-03 (acceso por rol del dueño).
--
-- Todas las escrituras sobre pedidos, comprobantes y despachos pasan por funciones (RPC): ninguna
-- tabla de pedidos tiene políticas de INSERT/UPDATE para el cliente, así que no puede alterar precios,
-- totales ni estados desde el navegador (RNF-07).

-- 1. Cambios de esquema ---------------------------------------------------------------------------
-- Estado nuevo "listo_retiro" (B.2 del SRS). "pagado" se muestra en pantalla como "Confirmado".
alter table public.pedidos drop constraint pedidos_estado_check;
alter table public.pedidos add constraint pedidos_estado_check
  check (estado in ('pendiente_pago','en_revision','pagado','listo_retiro','en_despacho','entregado','cancelado'));

alter table public.pedidos
  add column costo_envio   numeric(10,2) not null default 0 check (costo_envio >= 0),
  add column confirmado_en timestamptz,
  add column confirmado_por uuid references public.usuarios (id);

-- RF-08: cuentas bancarias del negocio (el QR es un parámetro con la URL de la imagen).
create table public.cuentas_pago (
  id      integer generated always as identity primary key,
  banco   varchar(60)  not null,
  titular varchar(100) not null,
  numero  varchar(40)  not null,
  tipo    varchar(30)  not null default 'Caja de ahorro',
  activo  boolean      not null default true
);

-- Parámetros configurables por gerencia (SRS 2.1 h). H-17: el costo de envío queda en 0 hasta que el dueño lo defina.
create table public.parametros (
  clave varchar(40) primary key,
  valor text not null
);
insert into public.parametros (clave, valor) values ('costo_envio', '0');

-- RF-20: historial de cambios del despacho con fecha y usuario.
create table public.despacho_historial (
  id          integer generated always as identity primary key,
  despacho_id integer not null references public.despachos (id) on delete cascade,
  estado      varchar(15) not null,
  motivo      text,
  usuario_id  uuid references public.usuarios (id),
  fecha       timestamptz not null default now()
);
create index on public.despacho_historial (despacho_id);

alter table public.cuentas_pago       enable row level security;
alter table public.parametros         enable row level security;
alter table public.despacho_historial enable row level security;

-- 2. Roles ------------------------------------------------------------------------------------------
-- Matriz de permisos B.3: validar pedidos, despachos y WhatsApp lo hacen el Empleado y el Dueño.
-- El Administrador gestiona catálogo y parámetros, pero no valida pagos (H-08). La celda "?" del Dueño
-- queda como "Sí" mientras el negocio no confirme lo contrario.
create or replace function public.es_operador() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.rol_actual() in ('empleado','dueno'), false)
$$;

-- 3. Políticas de lectura ---------------------------------------------------------------------------
-- El operador necesita el nombre del cliente de cada pedido y el del compañero que registró un cambio del despacho.
create policy usuarios_lectura_operador on public.usuarios for select to authenticated
  using (public.es_operador());

create policy pedidos_lectura on public.pedidos for select to authenticated
  using (cliente_id = public.mi_cliente_id() or public.es_operador());

create policy detalle_pedido_lectura on public.detalle_pedido for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id));

create policy comprobantes_pago_lectura on public.comprobantes_pago for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id));

create policy despachos_lectura on public.despachos for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id));

create policy despacho_historial_lectura on public.despacho_historial for select to authenticated
  using (public.es_operador());

create policy repartidores_lectura on public.repartidores for select to authenticated using (public.es_operador());
create policy repartidores_alta on public.repartidores for insert to authenticated with check (public.es_operador());
create policy repartidores_edicion on public.repartidores for update to authenticated
  using (public.es_gerencia()) with check (public.es_gerencia());

create policy cuentas_pago_lectura on public.cuentas_pago for select to authenticated
  using (activo or public.es_gerencia());
create policy cuentas_pago_escritura on public.cuentas_pago for all to authenticated
  using (public.es_gerencia()) with check (public.es_gerencia());

create policy parametros_lectura on public.parametros for select to authenticated using (true);
create policy parametros_escritura on public.parametros for all to authenticated
  using (public.es_gerencia()) with check (public.es_gerencia());

-- 4. Alertas de stock mínimo (RF-12 evalúa el umbral tras descontar; la pantalla llega en el Sprint 3, HU-14) --
create or replace function public.trg_alerta_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.cantidad <= new.umbral_minimo and new.cantidad <> old.cantidad
     and not exists (select 1 from public.alertas_stock where stock_id = new.id and not atendida) then
    insert into public.alertas_stock (stock_id, cantidad_actual) values (new.id, new.cantidad);
  end if;
  return new;
end $$;

create trigger alerta_stock after update of cantidad on public.stock
  for each row execute function public.trg_alerta_stock();

-- 5. Funciones internas ------------------------------------------------------------------------------
-- Resta el stock de un pedido. Bloquea las filas (FOR UPDATE) para que dos ventas por la última unidad
-- no se concreten a la vez (RF-12): la segunda espera, ve 0 y falla. Si algo falta se revierte todo.
create or replace function public._descontar_stock_pedido(p_pedido integer) returns void
language plpgsql security definer set search_path = public as $$
declare d record; s record; falta integer; toma integer;
begin
  for d in select modelo_id, talla, sum(cantidad)::int as cantidad
             from public.detalle_pedido where pedido_id = p_pedido
            group by modelo_id, talla order by modelo_id, talla loop
    falta := d.cantidad;
    for s in select id, cantidad from public.stock
              where modelo_id = d.modelo_id and talla = d.talla and cantidad > 0
              order by sucursal_id, id for update loop
      exit when falta = 0;
      toma := least(s.cantidad, falta);
      update public.stock set cantidad = cantidad - toma where id = s.id;
      falta := falta - toma;
    end loop;
    if falta > 0 then
      raise exception 'Stock insuficiente: ya no quedan % unidad(es) de la talla % de este modelo.', falta, d.talla
        using errcode = 'check_violation';
    end if;
  end loop;
end $$;
revoke execute on function public._descontar_stock_pedido(integer) from public, anon, authenticated;

-- 6. HU-08: crear el pedido ----------------------------------------------------------------------------
-- Los precios y el total salen de la BD, nunca del navegador. p_items = [{modelo_id, talla, cantidad}].
create or replace function public.crear_pedido(
  p_items jsonb, p_metodo text, p_direccion text default null,
  p_telefono text default null, p_contra_entrega text default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_cliente integer := public.mi_cliente_id();
  v_total numeric(10,2) := 0; v_envio numeric(10,2) := 0; v_pedido integer; r record; v_disp integer;
begin
  if v_cliente is null then
    raise exception 'Tu cuenta no tiene perfil de cliente' using errcode = '42501';
  end if;
  if p_metodo not in ('domicilio','retiro') then
    raise exception 'Elige envío a domicilio o retiro en tienda.' using errcode = 'check_violation';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Tu carrito está vacío.' using errcode = 'check_violation';
  end if;

  if p_metodo = 'domicilio' then
    if length(trim(coalesce(p_direccion, ''))) < 5 then
      raise exception 'Escribe la dirección de entrega en Tarija.' using errcode = 'check_violation';
    end if;
    if coalesce(p_telefono, '') !~ '^[67][0-9]{7}$' then
      raise exception 'Ingresa un celular de contacto de 8 dígitos.' using errcode = 'check_violation';
    end if;
    if p_contra_entrega is not null and p_contra_entrega not in ('efectivo','qr') then
      raise exception 'El pago contra entrega es en efectivo o QR.' using errcode = 'check_violation';
    end if;
    v_envio := coalesce((select valor::numeric from public.parametros where clave = 'costo_envio'), 0);
  else
    p_contra_entrega := null;   -- el retiro en tienda se paga por adelantado
    p_direccion := null;
  end if;

  -- RF-08: sin cuentas ni QR no se puede pagar por adelantado.
  if p_contra_entrega is null and not (
       exists (select 1 from public.cuentas_pago where activo)
       or exists (select 1 from public.parametros where clave = 'qr_pago_url' and valor <> '')) then
    raise exception 'El negocio aún no configuró sus datos de pago. Inténtalo más tarde.' using errcode = 'check_violation';
  end if;

  -- Valida cada línea contra el catálogo y el stock reales y calcula el total.
  for r in
    select (i ->> 'modelo_id')::int as modelo_id, (i ->> 'talla')::int as talla, sum((i ->> 'cantidad')::int)::int as cantidad
      from jsonb_array_elements(p_items) i group by 1, 2 order by 1, 2
  loop
    if r.cantidad is null or r.cantidad < 1 then
      raise exception 'Cantidad inválida.' using errcode = 'check_violation';
    end if;
    if not exists (select 1 from public.modelos m join public.marcas ma on ma.id = m.marca_id
                    where m.id = r.modelo_id and m.activo and ma.activo) then
      raise exception 'Un producto de tu carrito ya no está disponible.' using errcode = 'check_violation';
    end if;
    select coalesce(sum(cantidad), 0) into v_disp from public.stock where modelo_id = r.modelo_id and talla = r.talla;
    if r.cantidad > v_disp then
      raise exception 'Solo hay % unidad(es) disponibles de la talla % de un producto de tu carrito.', v_disp, r.talla
        using errcode = 'check_violation';
    end if;
    v_total := v_total + r.cantidad * (select precio from public.modelos where id = r.modelo_id);
  end loop;

  insert into public.pedidos (cliente_id, total, metodo_despacho, direccion, telefono, pago_contra_entrega, costo_envio)
  values (v_cliente, v_total + v_envio, p_metodo, nullif(trim(p_direccion), ''), nullif(trim(p_telefono), ''), p_contra_entrega, v_envio)
  returning id into v_pedido;

  insert into public.detalle_pedido (pedido_id, modelo_id, talla, cantidad, precio_unitario)
  select v_pedido, g.modelo_id, g.talla, g.cantidad, m.precio
    from (select (i ->> 'modelo_id')::int as modelo_id, (i ->> 'talla')::int as talla, sum((i ->> 'cantidad')::int)::int as cantidad
            from jsonb_array_elements(p_items) i group by 1, 2) g
    join public.modelos m on m.id = g.modelo_id;

  -- El carrito guardado ya se convirtió en pedido.
  delete from public.items_carrito where carrito_id in (select id from public.carritos where cliente_id = v_cliente);
  return v_pedido;
end $$;

-- 7. HU-10: registrar el comprobante ------------------------------------------------------------------
create or replace function public.registrar_comprobante(p_pedido integer, p_ruta text) returns integer
language plpgsql security definer set search_path = public as $$
declare p record; v_id integer;
begin
  select * into p from public.pedidos where id = p_pedido and cliente_id = public.mi_cliente_id() for update;
  if not found then raise exception 'No encontramos ese pedido.' using errcode = 'check_violation'; end if;
  if p.pago_contra_entrega is not null then
    raise exception 'Este pedido se paga contra entrega: no necesita comprobante.' using errcode = 'check_violation';
  end if;
  if p.estado not in ('pendiente_pago','en_revision') then
    raise exception 'Este pedido ya no admite comprobantes.' using errcode = 'check_violation';
  end if;
  -- Solo se aceptan archivos que el propio cliente subió a su carpeta.
  if p_ruta is null or p_ruta not like auth.uid()::text || '/%' then
    raise exception 'Archivo no válido.' using errcode = 'check_violation';
  end if;

  update public.comprobantes_pago
     set estado = 'rechazado', motivo_rechazo = 'Reemplazado por el cliente'
   where pedido_id = p_pedido and estado = 'pendiente';
  insert into public.comprobantes_pago (pedido_id, imagen_url) values (p_pedido, p_ruta) returning id into v_id;
  update public.pedidos set estado = 'en_revision' where id = p_pedido;
  return v_id;
end $$;

-- 8. HU-11: validar, rechazar y confirmar ---------------------------------------------------------------
-- Pago anticipado: el empleado verificó los fondos y valida el comprobante → se descuenta el stock (RN-03, RN-04).
-- Contra entrega (H-03): no hay comprobante; el stock se descuenta cuando el empleado confirma el pedido.
create or replace function public.confirmar_pedido(p_pedido integer) returns void
language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if not public.es_operador() then
    raise exception 'No tienes permiso para esta acción' using errcode = '42501';
  end if;
  select * into p from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'No encontramos ese pedido.' using errcode = 'check_violation'; end if;

  if p.pago_contra_entrega is null then
    if p.estado <> 'en_revision' or not exists (
         select 1 from public.comprobantes_pago where pedido_id = p_pedido and estado = 'pendiente') then
      raise exception 'Solo se puede validar un pedido con comprobante cargado.' using errcode = 'check_violation';
    end if;
    update public.comprobantes_pago set estado = 'validado', validado_por = auth.uid()
     where pedido_id = p_pedido and estado = 'pendiente';
  elsif p.estado <> 'pendiente_pago' then
    raise exception 'Este pedido ya fue confirmado o cerrado.' using errcode = 'check_violation';
  end if;

  perform public._descontar_stock_pedido(p_pedido);   -- si falta stock se revierte todo
  update public.pedidos set estado = 'pagado', confirmado_en = now(), confirmado_por = auth.uid() where id = p_pedido;
end $$;

create or replace function public.rechazar_comprobante(p_pedido integer, p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if not public.es_operador() then
    raise exception 'No tienes permiso para esta acción' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'Escribe el motivo del rechazo para que el cliente lo vea.' using errcode = 'check_violation';
  end if;
  select * into p from public.pedidos where id = p_pedido for update;
  if not found or p.estado <> 'en_revision' then
    raise exception 'Solo se puede rechazar un pedido con comprobante en revisión.' using errcode = 'check_violation';
  end if;
  update public.comprobantes_pago set estado = 'rechazado', motivo_rechazo = trim(p_motivo), validado_por = auth.uid()
   where pedido_id = p_pedido and estado = 'pendiente';
  update public.pedidos set estado = 'pendiente_pago' where id = p_pedido;   -- el cliente puede subir otro comprobante
end $$;

-- Sin stock reservado (RF-29, fuera de este sprint) cancelar solo es posible antes de confirmar.
create or replace function public.cancelar_pedido(p_pedido integer) returns void
language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select * into p from public.pedidos where id = p_pedido for update;
  if not found or not (p.cliente_id = public.mi_cliente_id() or public.es_operador()) then
    raise exception 'No encontramos ese pedido.' using errcode = 'check_violation';
  end if;
  if p.estado not in ('pendiente_pago','en_revision') then
    raise exception 'Un pedido confirmado ya no se puede cancelar desde aquí. Comunícate con la tienda.' using errcode = 'check_violation';
  end if;
  update public.comprobantes_pago set estado = 'rechazado', motivo_rechazo = 'Pedido cancelado'
   where pedido_id = p_pedido and estado = 'pendiente';
  update public.pedidos set estado = 'cancelado' where id = p_pedido;
end $$;

-- 9. HU-12: entrega ------------------------------------------------------------------------------------
create or replace function public.marcar_listo_retiro(p_pedido integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_operador() then raise exception 'No tienes permiso para esta acción' using errcode = '42501'; end if;
  update public.pedidos set estado = 'listo_retiro'
   where id = p_pedido and metodo_despacho = 'retiro' and estado = 'pagado';
  if not found then raise exception 'Solo un pedido confirmado con retiro en tienda puede quedar listo.' using errcode = 'check_violation'; end if;
end $$;

create or replace function public.marcar_retirado(p_pedido integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_operador() then raise exception 'No tienes permiso para esta acción' using errcode = '42501'; end if;
  update public.pedidos set estado = 'entregado'
   where id = p_pedido and metodo_despacho = 'retiro' and estado = 'listo_retiro';
  if not found then raise exception 'El pedido no está listo para retiro.' using errcode = 'check_violation'; end if;
end $$;

-- RF-20: no se despacha un pedido sin confirmar. También permite reasignar tras una entrega fallida.
create or replace function public.asignar_despacho(p_pedido integer, p_repartidor integer) returns void
language plpgsql security definer set search_path = public as $$
declare p record; v_desp integer; v_estado text;
begin
  if not public.es_operador() then raise exception 'No tienes permiso para esta acción' using errcode = '42501'; end if;
  if not exists (select 1 from public.repartidores where id = p_repartidor) then
    raise exception 'Elige un repartidor.' using errcode = 'check_violation';
  end if;
  select * into p from public.pedidos where id = p_pedido for update;
  if not found or p.metodo_despacho <> 'domicilio' then
    raise exception 'Solo los pedidos a domicilio se despachan.' using errcode = 'check_violation';
  end if;
  if p.estado not in ('pagado','en_despacho') then
    raise exception 'El pedido debe estar confirmado antes de despacharlo.' using errcode = 'check_violation';
  end if;
  select id, estado into v_desp, v_estado from public.despachos where pedido_id = p_pedido;
  if v_desp is null then
    insert into public.despachos (pedido_id, repartidor_id) values (p_pedido, p_repartidor) returning id into v_desp;
  elsif v_estado = 'no_entregado' then
    update public.despachos set repartidor_id = p_repartidor, estado = 'asignado', motivo = null, actualizado_en = now() where id = v_desp;
  else
    raise exception 'Este pedido ya tiene un despacho en curso.' using errcode = 'check_violation';
  end if;
  insert into public.despacho_historial (despacho_id, estado, usuario_id) values (v_desp, 'asignado', auth.uid());
  update public.pedidos set estado = 'en_despacho' where id = p_pedido;
end $$;

create or replace function public.actualizar_despacho(p_pedido integer, p_estado text, p_motivo text default null) returns void
language plpgsql security definer set search_path = public as $$
declare d record;
begin
  if not public.es_operador() then raise exception 'No tienes permiso para esta acción' using errcode = '42501'; end if;
  if p_estado not in ('asignado','en_camino','entregado','no_entregado') then
    raise exception 'Estado de despacho no válido.' using errcode = 'check_violation';
  end if;
  if p_estado = 'no_entregado' and length(trim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'Escribe el motivo por el que no se entregó.' using errcode = 'check_violation';
  end if;
  select * into d from public.despachos where pedido_id = p_pedido for update;
  if not found then raise exception 'El pedido aún no tiene despacho.' using errcode = 'check_violation'; end if;
  if d.estado = 'entregado' then raise exception 'La entrega ya fue registrada.' using errcode = 'check_violation'; end if;

  update public.despachos set estado = p_estado, motivo = nullif(trim(p_motivo), ''), actualizado_en = now() where id = d.id;
  insert into public.despacho_historial (despacho_id, estado, motivo, usuario_id)
  values (d.id, p_estado, nullif(trim(p_motivo), ''), auth.uid());
  if p_estado = 'entregado' then update public.pedidos set estado = 'entregado' where id = p_pedido; end if;
end $$;

-- 10. HU-03 / RF-03: resumen ejecutivo, solo para el Dueño (RN-08) --------------------------------------
-- Ventas por día de pedidos web confirmados. La utilidad llega con los costos de compra (Sprint 4).
create or replace function public.resumen_ventas(p_desde date, p_hasta date)
returns table (dia date, num_pedidos integer, total_bs numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.rol_actual() is distinct from 'dueno' then
    raise exception 'No tienes permiso para esta acción' using errcode = '42501';
  end if;
  return query
    select (p.confirmado_en at time zone 'America/La_Paz')::date, count(*)::int, sum(p.total)
      from public.pedidos p
     where p.estado in ('pagado','listo_retiro','en_despacho','entregado')
       and (p.confirmado_en at time zone 'America/La_Paz')::date between p_desde and p_hasta
     group by 1 order by 1;
end $$;

-- 11. Permisos de ejecución ------------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'crear_pedido(jsonb,text,text,text,text)', 'registrar_comprobante(integer,text)', 'confirmar_pedido(integer)',
    'rechazar_comprobante(integer,text)', 'cancelar_pedido(integer)', 'marcar_listo_retiro(integer)',
    'marcar_retirado(integer)', 'asignar_despacho(integer,integer)', 'actualizar_despacho(integer,text,text)',
    'resumen_ventas(date,date)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- 12. Storage ---------------------------------------------------------------------------------------------
-- Comprobantes: bucket privado. El cliente sube solo a su carpeta (<uid>/...); lo ve él y los operadores.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 5242880, array['image/jpeg','image/png'])
on conflict (id) do nothing;

create policy comprobantes_subida on storage.objects for insert to authenticated
  with check (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy comprobantes_lectura on storage.objects for select to authenticated
  using (bucket_id = 'comprobantes' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.es_operador()));

-- QR de pago del negocio: imagen pública (se muestra al cliente), solo la gerencia la cambia.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pagos', 'pagos', true, 2097152, array['image/jpeg','image/png'])
on conflict (id) do nothing;

create policy pagos_lectura on storage.objects for select using (bucket_id = 'pagos');
create policy pagos_subida on storage.objects for insert to authenticated
  with check (bucket_id = 'pagos' and public.es_gerencia());
create policy pagos_edicion on storage.objects for update to authenticated
  using (bucket_id = 'pagos' and public.es_gerencia());
create policy pagos_borrado on storage.objects for delete to authenticated
  using (bucket_id = 'pagos' and public.es_gerencia());
