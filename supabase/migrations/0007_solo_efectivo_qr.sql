-- 0007 · Solo efectivo y QR en caja. Quita el pago con tarjeta del POS y del cierre de caja.
-- Úsalo SOLO si tu base ya corrió 0006 antes de este cambio (en una instalación nueva 0006 ya trae esto).
-- Es seguro repetirlo: solo redefine dos funciones. Los permisos (grant) se conservan.

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
