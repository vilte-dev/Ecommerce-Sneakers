-- 0006_sprint3_caja.sql · Sprint 3
-- HU-14 (alertas de stock mínimo), HU-15 (POS), HU-16 (comprobante no fiscal), HU-17 (cierre de caja),
-- HU-18 (descuento de fidelidad), HU-24 (caja sin conexión: la parte de BD es la clave de idempotencia de la venta).
--
-- Igual que en el Sprint 2, el navegador nunca escribe en ventas, cierres ni descuentos: todo pasa por funciones (RPC)
-- que validan el rol y recalculan precios y totales en la BD (RNF-07). RN-09: las ventas y los cierres no se eliminan.

-- 1. Cambios de esquema ---------------------------------------------------------------------------
alter table public.clientes
  add column nombre varchar(100);                       -- cliente de caja sin cuenta web (el comprobante puede llevar su nombre)

alter table public.ventas
  add column clave_idem uuid unique,                    -- HU-24: reintentar una venta tras un corte no la duplica
  add column cierre_id  integer references public.cierres_caja (id);
create index on public.ventas (usuario_id, fecha);
create index on public.ventas (cierre_id) where cierre_id is null;
create index on public.ventas (cliente_id);

alter table public.cierres_caja
  add column detalle jsonb not null default '{}'::jsonb; -- esperado por forma de pago y número de ventas (RF-19)

alter table public.descuentos_fidelidad
  add column pedido_id integer references public.pedidos (id);
-- Un cliente solo puede tener UN descuento pendiente a la vez: "aparece una sola vez por ciclo" (RF-21).
create unique index descuentos_un_pendiente on public.descuentos_fidelidad (cliente_id) where not aplicado;

alter table public.alertas_stock
  add column atendida_en  timestamptz,
  add column atendida_por uuid references public.usuarios (id);
create unique index alertas_una_abierta on public.alertas_stock (stock_id) where not atendida;

create sequence public.venta_numero_seq;

-- Parámetros configurables (SRS 2.1 h). H-05: ciclo repetitivo cada 10 compras confirmadas, 5 %.
insert into public.parametros (clave, valor) values
  ('fidelidad_compras', '10'), ('fidelidad_porcentaje', '5'),
  ('negocio_nombre', 'Sneakers Tarija'), ('negocio_direccion', 'Tarija, Bolivia'), ('negocio_telefono', '')
on conflict (clave) do nothing;

-- 2. Ayudas internas ----------------------------------------------------------------------------------
create or replace function public._param_num(p_clave text, p_defecto numeric) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select valor::numeric from public.parametros where clave = p_clave and valor ~ '^[0-9]+(\.[0-9]+)?$'), p_defecto)
$$;

create or replace function public._sucursal_principal() returns integer
language sql stable security definer set search_path = public as $$
  select min(id) from public.sucursales
$$;

-- Resta unidades de un modelo/talla bloqueando las filas (FOR UPDATE): dos ventas por la última unidad no se
-- concretan a la vez (RF-12). Es la misma lógica del Sprint 2, ahora reutilizable por el POS.
create or replace function public._descontar_stock(p_modelo integer, p_talla integer, p_cantidad integer) returns void
language plpgsql security definer set search_path = public as $$
declare s record; falta integer := p_cantidad; toma integer;
begin
  for s in select id, cantidad from public.stock
            where modelo_id = p_modelo and talla = p_talla and cantidad > 0
            order by sucursal_id, id for update loop
    exit when falta = 0;
    toma := least(s.cantidad, falta);
    update public.stock set cantidad = cantidad - toma where id = s.id;
    falta := falta - toma;
  end loop;
  if falta > 0 then
    raise exception 'Stock insuficiente: ya no quedan % unidad(es) de la talla % de este modelo.', falta, p_talla
      using errcode = 'check_violation';
  end if;
end $$;

create or replace function public._reponer_stock(p_modelo integer, p_talla integer, p_cantidad integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.stock (sucursal_id, modelo_id, talla, cantidad)
  values (public._sucursal_principal(), p_modelo, p_talla, p_cantidad)
  on conflict (sucursal_id, modelo_id, talla) do update set cantidad = public.stock.cantidad + excluded.cantidad;
end $$;

create or replace function public._descontar_stock_pedido(p_pedido integer) returns void
language plpgsql security definer set search_path = public as $$
declare d record;
begin
  for d in select modelo_id, talla, sum(cantidad)::int as cantidad
             from public.detalle_pedido where pedido_id = p_pedido
            group by modelo_id, talla order by modelo_id, talla loop
    perform public._descontar_stock(d.modelo_id, d.talla, d.cantidad);
  end loop;
end $$;

-- 3. HU-14 · Alertas de stock mínimo ------------------------------------------------------------------
-- H-12: el canal es el panel interno y el mínimo por defecto es 2 (valor por defecto de la columna).
-- La alerta se abre al llegar al mínimo, se mantiene actualizada mientras siga bajo, y se cierra sola al reponer.
create or replace function public.trg_alerta_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.cantidad <= new.umbral_minimo then
    update public.alertas_stock set cantidad_actual = new.cantidad where stock_id = new.id and not atendida;
    if not found then
      insert into public.alertas_stock (stock_id, cantidad_actual) values (new.id, new.cantidad);
    end if;
  else
    update public.alertas_stock set atendida = true, atendida_en = now() where stock_id = new.id and not atendida;
  end if;
  return new;
end $$;

drop trigger if exists alerta_stock on public.stock;
create trigger alerta_stock_alta after insert on public.stock
  for each row when (new.cantidad <= new.umbral_minimo) execute function public.trg_alerta_stock();
create trigger alerta_stock after update of cantidad, umbral_minimo on public.stock
  for each row when (old.cantidad is distinct from new.cantidad or old.umbral_minimo is distinct from new.umbral_minimo)
  execute function public.trg_alerta_stock();

-- Alertas de lo que ya estaba bajo el mínimo antes de este sprint.
insert into public.alertas_stock (stock_id, cantidad_actual)
select s.id, s.cantidad from public.stock s
 where s.cantidad <= s.umbral_minimo
   and not exists (select 1 from public.alertas_stock a where a.stock_id = s.id and not a.atendida);

-- Solo se marca como atendida mediante la función (no se puede editar la cantidad registrada).
drop policy if exists alertas_edicion on public.alertas_stock;
revoke update on public.alertas_stock from anon, authenticated;

create or replace function public.atender_alerta(p_alerta integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_gerencia() then raise exception 'No tienes permiso para esta acción' using errcode = '42501'; end if;
  update public.alertas_stock set atendida = true, atendida_en = now(), atendida_por = auth.uid()
   where id = p_alerta and not atendida;
  if not found then raise exception 'La alerta ya fue atendida.' using errcode = 'check_violation'; end if;
end $$;

-- 4. HU-18 · Fidelidad ---------------------------------------------------------------------------------
-- Cuenta una compra confirmada. Al llegar a un múltiplo de 10 deja un descuento PENDIENTE (5 %) para la siguiente
-- compra, presencial u online. El ciclo se repite cada 10 (H-05).
create or replace function public._registrar_compra_cliente(p_cliente integer) returns void
language plpgsql security definer set search_path = public as $$
declare v_n integer; v_cada integer := public._param_num('fidelidad_compras', 10)::int;
begin
  if p_cliente is null then return; end if;
  update public.clientes set contador_compras = contador_compras + 1 where id = p_cliente returning contador_compras into v_n;
  if v_n % v_cada = 0 and not exists (select 1 from public.descuentos_fidelidad where cliente_id = p_cliente and not aplicado) then
    insert into public.descuentos_fidelidad (cliente_id, porcentaje) values (p_cliente, public._param_num('fidelidad_porcentaje', 5));
  end if;
end $$;

-- Resuelve al cliente por celular y/o CI (RF-15, H-05). Con p_crear crea al cliente de caja que aún no existe.
create or replace function public._resolver_cliente(p_ci text, p_celular text, p_crear boolean) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_ci  text := nullif(upper(regexp_replace(coalesce(p_ci, ''), '\s', '', 'g')), '');
  v_cel text := nullif(regexp_replace(coalesce(p_celular, ''), '\D', '', 'g'), '');
  v_por_cel integer; v_por_ci integer; v_id integer;
begin
  if v_cel is not null then
    if v_cel ~ '^591[67][0-9]{7}$' then v_cel := substr(v_cel, 4); end if;
    if v_cel !~ '^[67][0-9]{7}$' then
      raise exception 'El celular debe tener 8 dígitos y empezar con 6 o 7.' using errcode = 'check_violation';
    end if;
    select id into v_por_cel from public.clientes where celular = v_cel;
  end if;
  if v_ci is not null then
    if v_ci !~ '^[0-9]{5,10}(-?[0-9A-Z]{1,3})?$' then
      raise exception 'El CI no es válido. Escribe solo el número (y el complemento, si tiene).' using errcode = 'check_violation';
    end if;
    select id into v_por_ci from public.clientes where ci = v_ci;
  end if;
  if v_por_cel is not null and v_por_ci is not null and v_por_cel <> v_por_ci then
    raise exception 'El CI y el celular pertenecen a clientes distintos. Revisa los datos.' using errcode = 'check_violation';
  end if;
  if v_cel is not null and v_por_cel is null and v_por_ci is not null then
    raise exception 'Ese CI ya está registrado con otro celular. Usa el celular registrado o solo el CI.' using errcode = 'check_violation';
  end if;
  v_id := coalesce(v_por_cel, v_por_ci);
  if v_id is not null then
    if v_ci is not null then update public.clientes set ci = v_ci where id = v_id and ci is null; end if;
    return v_id;
  end if;
  if p_crear and (v_cel is not null or v_ci is not null) then
    if v_cel is null then
      raise exception 'Cliente nuevo: ingresa también su celular para registrarlo.' using errcode = 'check_violation';
    end if;
    insert into public.clientes (celular, ci) values (v_cel, v_ci) returning id into v_id;
  end if;
  return v_id;
end $$;

-- Consulta para el POS: ¿existe el cliente?, ¿cuántas compras lleva?, ¿tiene un descuento pendiente?
create or replace function public.consultar_cliente(p_ci text default null, p_celular text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id integer; c record; v_cada integer := public._param_num('fidelidad_compras', 10)::int; v_pct numeric;
begin
  if not public.es_operador() then raise exception 'No tienes permiso para esta acción' using errcode = '42501'; end if;
  v_id := public._resolver_cliente(p_ci, p_celular, false);
  if v_id is null then return jsonb_build_object('existe', false); end if;
  select c2.id, coalesce(c2.nombre, u.nombre) as nombre, c2.celular, c2.ci, c2.contador_compras into c
    from public.clientes c2 left join public.usuarios u on u.id = c2.usuario_id where c2.id = v_id;
  select porcentaje into v_pct from public.descuentos_fidelidad where cliente_id = v_id and not aplicado;
  return jsonb_build_object('existe', true, 'nombre', c.nombre, 'celular', c.celular, 'ci', c.ci,
    'compras', c.contador_compras, 'faltan', v_cada - (c.contador_compras % v_cada), 'descuento_pct', v_pct);
end $$;

-- Estado de fidelidad del cliente que inició sesión en la tienda.
create or replace function public.mi_fidelidad() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_id integer := public.mi_cliente_id(); v_n integer; v_cada integer := public._param_num('fidelidad_compras', 10)::int; v_pct numeric;
begin
  if v_id is null then return null; end if;
  select contador_compras into v_n from public.clientes where id = v_id;
  select porcentaje into v_pct from public.descuentos_fidelidad where cliente_id = v_id and not aplicado;
  return jsonb_build_object('compras', v_n, 'cada', v_cada, 'faltan', v_cada - (v_n % v_cada),
    'descuento_pct', v_pct, 'porcentaje', public._param_num('fidelidad_porcentaje', 5));
end $$;

-- 5. Ventas inalterables (RN-09) ----------------------------------------------------------------------
-- Una venta registrada no se borra ni se edita. Solo cambian, mediante funciones, cierre_id (al cerrar la caja)
-- y anulada/motivo_anulacion (anulación registrada).
create or replace function public.trg_ventas_inmutables() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Las ventas no se eliminan: se anulan con un motivo.' using errcode = 'check_violation';
  end if;
  if (to_jsonb(new) - 'cierre_id' - 'anulada' - 'motivo_anulacion') is distinct from (to_jsonb(old) - 'cierre_id' - 'anulada' - 'motivo_anulacion') then
    raise exception 'Una venta registrada no se puede modificar.' using errcode = 'check_violation';
  end if;
  if old.anulada and not new.anulada then
    raise exception 'Una venta anulada no se puede reactivar.' using errcode = 'check_violation';
  end if;
  if old.cierre_id is not null and new.cierre_id is distinct from old.cierre_id then
    raise exception 'La venta ya pertenece a un cierre de caja.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger ventas_inmutables before update or delete on public.ventas
  for each row execute function public.trg_ventas_inmutables();

create or replace function public.trg_solo_lectura() returns trigger
language plpgsql as $$
begin
  raise exception 'Este registro es inalterable (cierres de caja, detalle y comprobantes de venta).' using errcode = 'check_violation';
end $$;
create trigger detalle_venta_solo_lectura before update or delete on public.detalle_venta for each row execute function public.trg_solo_lectura();
create trigger comprobantes_venta_solo_lectura before update or delete on public.comprobantes_venta for each row execute function public.trg_solo_lectura();
create trigger cierres_caja_solo_lectura before update or delete on public.cierres_caja for each row execute function public.trg_solo_lectura();

-- 6. HU-15 / HU-16 · Venta en caja ------------------------------------------------------------------
-- p_items = [{modelo_id, talla, cantidad}]. Los precios salen de la BD. p_clave evita duplicar la venta si el
-- cliente web reintenta tras un corte de internet (HU-24). Devuelve el id de la venta; el comprobante se emite con ella.
create or replace function public.registrar_venta_caja(
  p_items jsonb, p_forma_pago text, p_ci text default null, p_celular text default null,
  p_nombre text default null, p_clave uuid default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid(); v_cliente integer; v_venta integer; r record; d record; v_cat record;
  v_sub numeric(10,2) := 0; v_desc numeric(10,2) := 0; v_num text;
begin
  if not public.es_operador() then
    raise exception 'No tienes permiso para esta acción' using errcode = '42501';
  end if;
  if p_clave is not null then
    select id into v_venta from public.ventas where clave_idem = p_clave and usuario_id = v_user;
    if found then return v_venta; end if;
  end if;
  if p_forma_pago not in ('efectivo', 'qr') then
    raise exception 'Elige efectivo o QR.' using errcode = 'check_violation';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Agrega al menos un producto a la venta.' using errcode = 'check_violation';
  end if;

  -- Valida cada línea y calcula el subtotal con los precios reales.
  for r in
    select (i ->> 'modelo_id')::int as modelo_id, (i ->> 'talla')::int as talla, sum((i ->> 'cantidad')::int)::int as cantidad
      from jsonb_array_elements(p_items) i group by 1, 2 order by 1, 2
  loop
    if r.cantidad is null or r.cantidad < 1 then
      raise exception 'Cantidad inválida.' using errcode = 'check_violation';
    end if;
    select m.precio, c.nombre as categoria, c.talla_min, c.talla_max into v_cat
      from public.modelos m join public.marcas ma on ma.id = m.marca_id join public.categorias c on c.id = m.categoria_id
     where m.id = r.modelo_id and m.activo and ma.activo;
    if not found then
      raise exception 'Un producto de la venta ya no está disponible.' using errcode = 'check_violation';
    end if;
    if r.talla < v_cat.talla_min or (v_cat.talla_max is not null and r.talla > v_cat.talla_max) then
      raise exception 'La talla % no es válida para la categoría % (RF-06).', r.talla, v_cat.categoria using errcode = 'check_violation';
    end if;
    v_sub := v_sub + r.cantidad * v_cat.precio;
  end loop;

  -- Cliente (opcional) y descuento de fidelidad pendiente.
  v_cliente := public._resolver_cliente(p_ci, p_celular, true);
  if v_cliente is not null then
    select id, porcentaje into d from public.descuentos_fidelidad where cliente_id = v_cliente and not aplicado order by id limit 1 for update;
    if found then v_desc := round(v_sub * d.porcentaje / 100, 2); end if;
  end if;

  v_num := 'V-' || lpad(nextval('public.venta_numero_seq')::text, 6, '0');
  insert into public.ventas (numero, cliente_id, usuario_id, sucursal_id, canal, forma_pago, subtotal, descuento, total, clave_idem)
  values (v_num, v_cliente, v_user, public._sucursal_principal(), 'caja', p_forma_pago, v_sub, v_desc, v_sub - v_desc, p_clave)
  returning id into v_venta;

  -- Detalle y stock: bloquea las filas; si falta una unidad se revierte toda la venta (RF-12).
  for r in
    select (i ->> 'modelo_id')::int as modelo_id, (i ->> 'talla')::int as talla, sum((i ->> 'cantidad')::int)::int as cantidad
      from jsonb_array_elements(p_items) i group by 1, 2 order by 1, 2
  loop
    insert into public.detalle_venta (venta_id, modelo_id, talla, cantidad, precio_unitario)
    values (v_venta, r.modelo_id, r.talla, r.cantidad, (select precio from public.modelos where id = r.modelo_id));
    perform public._descontar_stock(r.modelo_id, r.talla, r.cantidad);
  end loop;

  insert into public.comprobantes_venta (venta_id, numero, leyenda)
  values (v_venta, v_num, 'Documento no válido como factura');   -- RN-07 / RF-18

  if v_cliente is not null then
    if d.id is not null and v_desc > 0 then
      update public.descuentos_fidelidad set aplicado = true, venta_id = v_venta where id = d.id;
    end if;
    update public.clientes set nombre = left(nullif(trim(p_nombre), ''), 100) where id = v_cliente and nombre is null and usuario_id is null;
    perform public._registrar_compra_cliente(v_cliente);
  end if;
  return v_venta;
end $$;

-- RN-09: las correcciones se hacen por anulación registrada. Solo antes del cierre de caja y por quien vendió (o el Dueño).
create or replace function public.anular_venta(p_venta integer, p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
declare v record; l record; v_n integer; v_cada integer := public._param_num('fidelidad_compras', 10)::int;
begin
  if not public.es_operador() then raise exception 'No tienes permiso para esta acción' using errcode = '42501'; end if;
  if length(trim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'Escribe el motivo de la anulación.' using errcode = 'check_violation';
  end if;
  select * into v from public.ventas where id = p_venta for update;
  if not found or not (v.usuario_id = auth.uid() or public.rol_actual() = 'dueno') then
    raise exception 'No encontramos esa venta.' using errcode = 'check_violation';
  end if;
  if v.anulada then raise exception 'La venta ya está anulada.' using errcode = 'check_violation'; end if;
  if v.cierre_id is not null then
    raise exception 'La venta ya fue incluida en un cierre de caja y no se puede anular.' using errcode = 'check_violation';
  end if;

  for l in select modelo_id, talla, cantidad from public.detalle_venta where venta_id = p_venta loop
    perform public._reponer_stock(l.modelo_id, l.talla, l.cantidad);
  end loop;

  if v.cliente_id is not null then
    select contador_compras into v_n from public.clientes where id = v.cliente_id for update;
    -- Si esta compra fue la que generó el descuento pendiente (múltiplo del ciclo), se retira.
    if v_n > 0 and v_n % v_cada = 0 then
      delete from public.descuentos_fidelidad where cliente_id = v.cliente_id and not aplicado;
    end if;
    -- Si usó un descuento, vuelve a quedar disponible.
    update public.descuentos_fidelidad set aplicado = false, venta_id = null where venta_id = p_venta;
    if v_n > 0 then update public.clientes set contador_compras = contador_compras - 1 where id = v.cliente_id; end if;
  end if;

  update public.ventas set anulada = true, motivo_anulacion = trim(p_motivo) where id = p_venta;
end $$;

-- 7. HU-17 · Cierre de caja (RF-19, RN-14) ----------------------------------------------------------
-- Cada empleado cierra SU jornada: reúne sus ventas en caja aún sin cerrar y no anuladas.
create or replace function public._resumen_cierre(p_usuario uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'num_ventas',   count(*),
    'num_efectivo', count(*) filter (where forma_pago = 'efectivo'),
    'num_qr',       count(*) filter (where forma_pago = 'qr'),
    'efectivo',     coalesce(sum(total) filter (where forma_pago = 'efectivo'), 0),
    'qr',           coalesce(sum(total) filter (where forma_pago = 'qr'), 0),
    'total',        coalesce(sum(total), 0),
    'desde',        min(fecha), 'hasta', max(fecha))
  from public.ventas
  where usuario_id = p_usuario and canal = 'caja' and not anulada and cierre_id is null
$$;

create or replace function public.vista_previa_cierre() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.es_operador() then raise exception 'No tienes permiso para esta acción' using errcode = '42501'; end if;
  return public._resumen_cierre(auth.uid());
end $$;

create or replace function public.cerrar_caja(p_efectivo_contado numeric) returns integer
language plpgsql security definer set search_path = public as $$
declare v_res jsonb; v_esperado numeric(10,2); v_id integer;
begin
  if not public.es_operador() then raise exception 'No tienes permiso para esta acción' using errcode = '42501'; end if;
  if p_efectivo_contado is null or p_efectivo_contado < 0 then
    raise exception 'Escribe el efectivo contado (0 o más).' using errcode = 'check_violation';
  end if;
  perform pg_advisory_xact_lock(hashtext('cierre:' || auth.uid()::text));   -- dos clics seguidos no cierran dos veces
  v_res := public._resumen_cierre(auth.uid());
  if (v_res ->> 'num_ventas')::int = 0 then
    raise exception 'No hay ventas por cerrar.' using errcode = 'check_violation';
  end if;
  v_esperado := (v_res ->> 'efectivo')::numeric;
  insert into public.cierres_caja (usuario_id, fecha, efectivo_contado, total_esperado, diferencia, detalle)
  values (auth.uid(), (now() at time zone 'America/La_Paz')::date, round(p_efectivo_contado, 2), v_esperado, round(p_efectivo_contado, 2) - v_esperado, v_res)
  returning id into v_id;
  update public.ventas set cierre_id = v_id
   where usuario_id = auth.uid() and canal = 'caja' and not anulada and cierre_id is null;
  return v_id;
end $$;

-- 8. Resumen ejecutivo: ahora suma web + caja (RF-03, RN-08: solo el Dueño) -------------------------
drop function public.resumen_ventas(date, date);
create function public.resumen_ventas(p_desde date, p_hasta date)
returns table (dia date, num_pedidos integer, total_web numeric, num_ventas integer, total_caja numeric, total_bs numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.rol_actual() is distinct from 'dueno' then
    raise exception 'No tienes permiso para esta acción' using errcode = '42501';
  end if;
  return query
    with web as (
      select (p.confirmado_en at time zone 'America/La_Paz')::date as d, count(*)::int as n, sum(p.total) as t
        from public.pedidos p
       where p.estado in ('pagado','listo_retiro','en_despacho','entregado')
         and (p.confirmado_en at time zone 'America/La_Paz')::date between p_desde and p_hasta
       group by 1),
    caja as (
      select (v.fecha at time zone 'America/La_Paz')::date as d, count(*)::int as n, sum(v.total) as t
        from public.ventas v
       where v.canal = 'caja' and not v.anulada
         and (v.fecha at time zone 'America/La_Paz')::date between p_desde and p_hasta
       group by 1)
    select coalesce(web.d, caja.d), coalesce(web.n, 0), coalesce(web.t, 0), coalesce(caja.n, 0), coalesce(caja.t, 0),
           coalesce(web.t, 0) + coalesce(caja.t, 0)
      from web full join caja on caja.d = web.d
     order by 1;
end $$;

-- 9. Políticas de lectura -----------------------------------------------------------------------------
-- El empleado ve sus propias ventas y cierres; el Dueño ve todos; el Administrador no accede (H-08, RNF-07).
create policy ventas_lectura on public.ventas for select to authenticated
  using (usuario_id = (select auth.uid()) or public.rol_actual() = 'dueno');
create policy detalle_venta_lectura on public.detalle_venta for select to authenticated
  using (exists (select 1 from public.ventas v where v.id = venta_id));
create policy comprobantes_venta_lectura on public.comprobantes_venta for select to authenticated
  using (exists (select 1 from public.ventas v where v.id = venta_id));
create policy cierres_lectura on public.cierres_caja for select to authenticated
  using (usuario_id = (select auth.uid()) or public.rol_actual() = 'dueno');
create policy descuentos_lectura on public.descuentos_fidelidad for select to authenticated
  using (cliente_id = public.mi_cliente_id() or public.es_operador());

revoke insert, update, delete on public.ventas, public.detalle_venta, public.comprobantes_venta,
  public.cierres_caja, public.descuentos_fidelidad from anon, authenticated;


-- 10. Pedidos web con fidelidad (reemplazan a las del Sprint 2; solo cambia lo marcado HU-18) -------------
create or replace function public.crear_pedido(
  p_items jsonb, p_metodo text, p_direccion text default null,
  p_telefono text default null, p_contra_entrega text default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_cliente integer := public.mi_cliente_id();
  v_total numeric(10,2) := 0; v_envio numeric(10,2) := 0; v_pedido integer; r record; v_disp integer;
  v_desc numeric(10,2) := 0; d record;
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

  -- HU-18: descuento de fidelidad pendiente = % sobre el importe neto (sin envío).
  select id, porcentaje into d from public.descuentos_fidelidad where cliente_id = v_cliente and not aplicado order by id limit 1 for update;
  if found then v_desc := round(v_total * d.porcentaje / 100, 2); end if;

  insert into public.pedidos (cliente_id, total, descuento, metodo_despacho, direccion, telefono, pago_contra_entrega, costo_envio)
  values (v_cliente, v_total - v_desc + v_envio, v_desc, p_metodo, nullif(trim(p_direccion), ''), nullif(trim(p_telefono), ''), p_contra_entrega, v_envio)
  returning id into v_pedido;

  insert into public.detalle_pedido (pedido_id, modelo_id, talla, cantidad, precio_unitario)
  select v_pedido, g.modelo_id, g.talla, g.cantidad, m.precio
    from (select (i ->> 'modelo_id')::int as modelo_id, (i ->> 'talla')::int as talla, sum((i ->> 'cantidad')::int)::int as cantidad
            from jsonb_array_elements(p_items) i group by 1, 2) g
    join public.modelos m on m.id = g.modelo_id;

  if d.id is not null then
    update public.descuentos_fidelidad set aplicado = true, pedido_id = v_pedido where id = d.id;
  end if;

  -- El carrito guardado ya se convirtió en pedido.
  delete from public.items_carrito where carrito_id in (select id from public.carritos where cliente_id = v_cliente);
  return v_pedido;
end $$;

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
  perform public._registrar_compra_cliente(p.cliente_id);   -- HU-18
end $$;

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
  -- HU-18: el descuento reservado por este pedido vuelve a quedar disponible.
  update public.descuentos_fidelidad set aplicado = false, pedido_id = null where pedido_id = p_pedido;
end $$;

-- 11. Permisos de ejecución ------------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'atender_alerta(integer)', 'consultar_cliente(text,text)', 'mi_fidelidad()',
    'registrar_venta_caja(jsonb,text,text,text,text,uuid)', 'anular_venta(integer,text)',
    'vista_previa_cierre()', 'cerrar_caja(numeric)', 'resumen_ventas(date,date)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array[
    '_param_num(text,numeric)', '_sucursal_principal()', '_descontar_stock(integer,integer,integer)',
    '_reponer_stock(integer,integer,integer)', '_registrar_compra_cliente(integer)',
    '_resolver_cliente(text,text,boolean)', '_resumen_cierre(uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
