-- sprint3.test.sql · Pruebas del Sprint 3 (HU-14 a HU-18, HU-24) a nivel de base de datos.
-- Ejecutar SOLO en un proyecto de desarrollo, después de las migraciones 0001–0006:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/sprint3.test.sql
-- Todo ocurre dentro de una transacción que termina en ROLLBACK: no deja datos.
begin;

create schema tst;
grant usage on schema tst to authenticated, anon;
create table tst.u (nombre text primary key, id uuid not null);
grant select on tst.u to authenticated, anon;

-- Actúa como un usuario autenticado (equivale al JWT que envía la app).
create function tst.como(p_nombre text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', (select id from tst.u where nombre = p_nombre))::text, true);
  execute 'set local role authenticated';
end $$;
create function tst.admin() returns void language plpgsql as $$
begin execute 'reset role'; end $$;

create function tst.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_cond is not true then raise exception 'FALLÓ: %', p_msg; end if;
  raise notice 'ok  - %', p_msg;
end $$;

-- Espera que la sentencia falle y que el mensaje contenga el patrón.
create function tst.falla(p_sql text, p_patron text, p_msg text) returns void language plpgsql as $$
declare v_err text;
begin
  begin
    execute p_sql;
  exception when others then v_err := sqlerrm;
  end;
  if v_err is null then raise exception 'FALLÓ (no falló): %', p_msg; end if;
  if v_err not ilike '%' || p_patron || '%' then raise exception 'FALLÓ (otro error "%"): %', v_err, p_msg; end if;
  raise notice 'ok  - % (%)', p_msg, v_err;
end $$;
grant execute on all functions in schema tst to authenticated, anon;

-- Datos de prueba -----------------------------------------------------------------------------------------
do $$
declare n text; v_id uuid; v_suc int := (select min(id) from public.sucursales);
begin
  foreach n in array array['ana','emp','emp2','dueno','adm'] loop
    v_id := gen_random_uuid();
    insert into auth.users (id, email, raw_user_meta_data)
    values (v_id, n || '@prueba.bo', json_build_object('nombre', n, 'celular', '7' || lpad((random()*9999999)::int::text, 7, '0'))::jsonb);
    insert into tst.u values (n, v_id);
  end loop;
  update public.usuarios set rol_id = (select id from public.roles where nombre = 'empleado')      where id in (select id from tst.u where nombre in ('emp','emp2'));
  update public.usuarios set rol_id = (select id from public.roles where nombre = 'dueno')         where id = (select id from tst.u where nombre = 'dueno');
  update public.usuarios set rol_id = (select id from public.roles where nombre = 'administrador') where id = (select id from tst.u where nombre = 'adm');

  insert into public.cuentas_pago (banco, titular, numero) values ('Banco Prueba', 'Sneakers', '1000-123');
  insert into public.marcas (nombre) values ('MarcaTest');
  insert into public.modelos (marca_id, categoria_id, nombre, color, precio) values
    ((select id from public.marcas where nombre = 'MarcaTest'), (select id from public.categorias where nombre = 'Adulto'), 'ModeloTest', 'Negro', 100),
    ((select id from public.marcas where nombre = 'MarcaTest'), (select id from public.categorias where nombre = 'Adulto'), 'ModeloGrande', 'Azul', 50);
  insert into public.stock (sucursal_id, modelo_id, talla, cantidad, umbral_minimo)
  select v_suc, m.id, t.talla, t.cant, t.umbral
    from public.modelos m join (values ('ModeloTest', 42, 5, 2), ('ModeloTest', 43, 1, 0), ('ModeloGrande', 42, 500, 2)) t(nombre, talla, cant, umbral) on t.nombre = m.nombre;
end $$;

-- HU-15 · venta en caja -----------------------------------------------------------------------------------------
do $$
declare v_m int := (select id from public.modelos where nombre = 'ModeloTest'); v_v int; v_v2 int; v_k uuid := gen_random_uuid();
begin
  perform tst.como('ana');
  perform tst.falla(format($q$select public.registrar_venta_caja('[{"modelo_id":%s,"talla":42,"cantidad":1}]'::jsonb, 'efectivo')$q$, v_m), 'permiso', 'un cliente no puede vender en caja');
  perform tst.admin();
  perform tst.como('adm');
  perform tst.falla(format($q$select public.registrar_venta_caja('[{"modelo_id":%s,"talla":42,"cantidad":1}]'::jsonb, 'efectivo')$q$, v_m), 'permiso', 'el administrador no vende en caja (matriz B.3)');
  perform tst.admin();

  perform tst.como('emp');
  perform tst.falla(format($q$select public.registrar_venta_caja('[{"modelo_id":%s,"talla":42,"cantidad":1}]'::jsonb, 'cheque')$q$, v_m), 'efectivo o QR', 'solo efectivo o QR');
  perform tst.falla(format($q$select public.registrar_venta_caja('[{"modelo_id":%s,"talla":42,"cantidad":1}]'::jsonb, 'tarjeta')$q$, v_m), 'efectivo o QR', 'el pago con tarjeta ya no se acepta');
  perform tst.falla('select public.registrar_venta_caja(''[]''::jsonb, ''efectivo'')', 'al menos un producto', 'no hay venta sin productos');
  perform tst.falla(format($q$select public.registrar_venta_caja('[{"modelo_id":%s,"talla":38,"cantidad":1}]'::jsonb, 'efectivo')$q$, v_m), 'no es válida', 'talla fuera de rango rechazada (RF-06)');
  perform tst.falla(format($q$select public.registrar_venta_caja('[{"modelo_id":%s,"talla":42,"cantidad":6}]'::jsonb, 'efectivo')$q$, v_m), 'Stock insuficiente', 'no se vende más que el stock');
  perform tst.ok((select cantidad from public.stock where modelo_id = v_m and talla = 42) = 5, 'una venta fallida no descuenta stock');

  v_v := public.registrar_venta_caja(format('[{"modelo_id":%s,"talla":42,"cantidad":2},{"modelo_id":%s,"talla":43,"cantidad":1}]', v_m, v_m)::jsonb, 'efectivo', null, null, null, v_k);
  perform tst.ok((select total from public.ventas where id = v_v) = 300, 'el total sale de los precios de la BD (2×100 + 1×100)');
  perform tst.ok((select cantidad from public.stock where modelo_id = v_m and talla = 42) = 3, 'la venta descuenta el stock al instante (talla 42)');
  perform tst.ok((select cantidad from public.stock where modelo_id = v_m and talla = 43) = 0, 'la última unidad se vende (talla 43 queda en 0)');
  perform tst.falla(format($q$select public.registrar_venta_caja('[{"modelo_id":%s,"talla":43,"cantidad":1}]'::jsonb, 'efectivo')$q$, v_m), 'Stock insuficiente', 'la última unidad solo se vende una vez');
  perform tst.ok((select numero from public.ventas where id = v_v) ~ '^V-[0-9]{6}$', 'la venta recibe un número correlativo');
  v_v2 := public.registrar_venta_caja(format('[{"modelo_id":%s,"talla":42,"cantidad":2}]', v_m)::jsonb, 'efectivo', null, null, null, v_k);
  perform tst.ok(v_v2 = v_v and (select cantidad from public.stock where modelo_id = v_m and talla = 42) = 3, 'reintentar con la misma clave no duplica la venta ni el stock (HU-24)');

  -- HU-16 · comprobante
  perform tst.ok((select leyenda from public.comprobantes_venta where venta_id = v_v) = 'Documento no válido como factura', 'el comprobante lleva la leyenda de documento no fiscal (RN-07)');
  perform tst.ok((select count(*) from public.detalle_venta where venta_id = v_v) = 2, 'el comprobante tiene el detalle de la venta');
  perform tst.ok((select c.numero from public.comprobantes_venta c where venta_id = v_v) = (select numero from public.ventas where id = v_v), 'el comprobante comparte el número de la venta');
  perform tst.admin();

  -- Alertas generadas por esas ventas (HU-14)
  perform tst.ok((select cantidad_actual from public.alertas_stock a join public.stock s on s.id = a.stock_id where s.modelo_id = v_m and s.talla = 43 and not a.atendida) = 0, 'la talla agotada abre una alerta de stock mínimo');
  perform tst.ok((select count(*) from public.alertas_stock a join public.stock s on s.id = a.stock_id where s.modelo_id = v_m and s.talla = 42 and not a.atendida) = 0, 'la talla 42 (3 > mínimo 2) no tiene alerta');
end $$;

-- RN-09 / RN-08 · inalterables y visibilidad ---------------------------------------------------------------------------
do $$
declare v int := (select min(id) from public.ventas);
begin
  perform tst.falla(format('delete from public.ventas where id = %s', v), 'no se eliminan', 'una venta no se puede borrar (RN-09)');
  perform tst.falla(format('update public.ventas set total = 1 where id = %s', v), 'no se puede modificar', 'una venta no se puede editar');
  perform tst.falla(format('delete from public.detalle_venta where venta_id = %s', v), 'inalterable', 'el detalle de venta no se borra');
  perform tst.falla(format('update public.comprobantes_venta set leyenda = ''Factura'' where venta_id = %s', v), 'inalterable', 'el comprobante no se edita');

  perform tst.como('emp');
  perform tst.falla(format('update public.ventas set total = 1 where id = %s', v), 'permission denied', 'el empleado no escribe directo en ventas');
  perform tst.ok((select count(*) from public.ventas) = 1, 'el empleado ve su venta');
  perform tst.admin();
  perform tst.como('emp2');
  perform tst.ok((select count(*) from public.ventas) = 0, 'otro empleado no ve las ventas ajenas');
  perform tst.admin();
  perform tst.como('adm');
  perform tst.ok((select count(*) from public.ventas) = 0 and (select count(*) from public.cierres_caja) = 0, 'el administrador no lee ventas ni cierres (RNF-07)');
  perform tst.admin();
  perform tst.como('ana');
  perform tst.ok((select count(*) from public.ventas) = 0, 'un cliente no lee ventas');
  perform tst.admin();
  perform tst.como('dueno');
  perform tst.ok((select count(*) from public.ventas) = 1, 'el dueño ve todas las ventas');
  perform tst.admin();
  perform tst.ok(not has_function_privilege('anon', 'public.registrar_venta_caja(jsonb,text,text,text,text,uuid)', 'execute'), 'anon no puede vender');
  perform tst.ok(not has_function_privilege('authenticated', 'public._registrar_compra_cliente(integer)', 'execute'), 'nadie llama directo al contador de fidelidad');
end $$;

-- HU-18 · fidelidad en caja: ciclo repetitivo de 10 ------------------------------------------------------------------
do $$
declare v_g int := (select id from public.modelos where nombre = 'ModeloGrande'); v_c int; i int; v_v int; v_items jsonb;
begin
  v_items := format('[{"modelo_id":%s,"talla":42,"cantidad":1}]', v_g)::jsonb;   -- 50 Bs.
  perform tst.como('emp');
  perform tst.falla(format($q$select public.registrar_venta_caja(%L::jsonb, 'efectivo', '123456')$q$, v_items), 'celular', 'un cliente nuevo solo con CI exige celular');
  perform tst.falla(format($q$select public.registrar_venta_caja(%L::jsonb, 'efectivo', null, '51234567')$q$, v_items), 'celular', 'celular inválido rechazado');
  for i in 1..9 loop v_v := public.registrar_venta_caja(v_items, 'efectivo', '123456', '71112222', 'Carla Rojas'); end loop;
  select id into v_c from public.clientes where celular = '71112222';
  perform tst.ok((select contador_compras from public.clientes where id = v_c) = 9, 'tras 9 compras el contador marca 9');
  perform tst.ok((select count(*) from public.descuentos_fidelidad where cliente_id = v_c) = 0, 'aún no hay descuento');
  perform tst.ok((select ci from public.clientes where id = v_c) = '123456' and (select nombre from public.clientes where id = v_c) = 'Carla Rojas', 'se guardan CI y nombre del cliente de caja');
  v_v := public.registrar_venta_caja(v_items, 'efectivo', null, '71112222');
  perform tst.ok((select contador_compras from public.clientes where id = v_c) = 10, 'la 10.ª compra deja el contador en 10');
  perform tst.ok((select descuento from public.ventas where id = v_v) = 0, 'la 10.ª compra no lleva descuento');
  perform tst.ok((select count(*) from public.descuentos_fidelidad where cliente_id = v_c and not aplicado and porcentaje = 5) = 1, 'al confirmarse la 10.ª compra queda un descuento de 5 % pendiente');
  perform tst.ok((public.consultar_cliente('123456', null) ->> 'descuento_pct')::numeric = 5, 'el POS ve el descuento pendiente al buscar por CI');
  v_v := public.registrar_venta_caja(v_items, 'qr', null, '71112222');
  perform tst.ok((select descuento from public.ventas where id = v_v) = 2.5 and (select total from public.ventas where id = v_v) = 47.5, 'la 11.ª compra lleva 5 % sobre el importe neto (50 → 47,50)');
  perform tst.ok((select count(*) from public.descuentos_fidelidad where cliente_id = v_c and not aplicado) = 0, 'el descuento se usa una sola vez');
  v_v := public.registrar_venta_caja(v_items, 'efectivo', null, '71112222');
  perform tst.ok((select descuento from public.ventas where id = v_v) = 0, 'la 12.ª compra ya no lleva descuento');
  for i in 13..20 loop v_v := public.registrar_venta_caja(v_items, 'efectivo', null, '71112222'); end loop;
  perform tst.ok((select count(*) from public.descuentos_fidelidad where cliente_id = v_c and not aplicado) = 1, 'el ciclo se repite: la 20.ª compra genera otro descuento');
  perform tst.ok(public.consultar_cliente(null, '70000001') = '{"existe": false}'::jsonb, 'consultar un cliente inexistente no lo crea');
  perform tst.ok((select count(*) from public.clientes where celular = '70000001') = 0, 'la consulta no deja datos');
  perform tst.admin();

  -- Venta sin identificar al cliente: no acumula
  perform tst.como('emp');
  v_v := public.registrar_venta_caja(v_items, 'efectivo');
  perform tst.ok((select cliente_id from public.ventas where id = v_v) is null, 'una venta sin identificador no acumula para fidelidad');
  perform tst.admin();
end $$;

-- HU-18 · anulación de venta -----------------------------------------------------------------------------------------
do $$
declare v_g int := (select id from public.modelos where nombre = 'ModeloGrande'); v_items jsonb := format('[{"modelo_id":%s,"talla":42,"cantidad":3}]', v_g)::jsonb;
        v_v int; v_c int; v_antes int; v_n int;
begin
  perform tst.como('emp');
  select cantidad into v_antes from public.stock where modelo_id = v_g and talla = 42;
  v_v := public.registrar_venta_caja(v_items, 'efectivo', null, '73334444');
  select id, contador_compras into v_c, v_n from public.clientes where celular = '73334444';
  perform tst.falla(format('select public.anular_venta(%s, ''x'')', v_v), 'motivo', 'anular exige un motivo');
  perform public.anular_venta(v_v, 'Error de digitación');
  perform tst.ok((select anulada from public.ventas where id = v_v), 'la venta queda anulada y NO se borra (RN-09)');
  perform tst.ok((select cantidad from public.stock where modelo_id = v_g and talla = 42) = v_antes, 'anular repone el stock');
  perform tst.ok((select contador_compras from public.clientes where id = v_c) = v_n - 1, 'anular descuenta la compra del contador (H-05)');
  perform tst.falla(format('select public.anular_venta(%s, ''otra vez'')', v_v), 'ya está anulada', 'no se anula dos veces');
  perform tst.admin();
  perform tst.como('emp2');
  perform tst.falla(format('select public.anular_venta(%s, ''ajena'')', v_v), 'No encontramos', 'otro empleado no puede anular la venta ajena');
  perform tst.admin();
end $$;

-- HU-17 · cierre de caja --------------------------------------------------------------------------------------------
do $$
declare v_g int := (select id from public.modelos where nombre = 'ModeloGrande'); v_c int; v_p jsonb; v_ult int;
begin
  perform tst.como('emp2');
  perform tst.falla('select public.cerrar_caja(0)', 'No hay ventas', 'no se cierra una caja sin ventas');
  perform public.registrar_venta_caja(format('[{"modelo_id":%s,"talla":42,"cantidad":2}]', v_g)::jsonb, 'efectivo');   -- 100
  perform public.registrar_venta_caja(format('[{"modelo_id":%s,"talla":42,"cantidad":1}]', v_g)::jsonb, 'qr');         -- 50
  v_ult := public.registrar_venta_caja(format('[{"modelo_id":%s,"talla":42,"cantidad":4}]', v_g)::jsonb, 'efectivo');  -- 200
  perform public.anular_venta(v_ult, 'Cliente se arrepintió');
  v_p := public.vista_previa_cierre();
  perform tst.ok((v_p ->> 'efectivo')::numeric = 100 and (v_p ->> 'qr')::numeric = 50 and (v_p ->> 'num_ventas')::int = 2, 'la vista previa suma por forma de pago y excluye anuladas');
  perform tst.falla('select public.cerrar_caja(-1)', 'efectivo contado', 'el efectivo contado no puede ser negativo');
  v_c := public.cerrar_caja(95);
  perform tst.ok((select total_esperado from public.cierres_caja where id = v_c) = 100 and (select diferencia from public.cierres_caja where id = v_c) = -5, 'el cierre registra esperado en efectivo (100) y diferencia (−5)');
  perform tst.ok((select (detalle ->> 'qr')::numeric from public.cierres_caja where id = v_c) = 50, 'el cierre guarda el esperado por forma de pago');
  perform tst.ok((select count(*) from public.ventas where cierre_id = v_c) = 2, 'las ventas quedan enlazadas al cierre');
  perform tst.falla('select public.cerrar_caja(0)', 'No hay ventas', 'no se puede cerrar dos veces la misma jornada');
  perform tst.falla(format('select public.anular_venta((select min(id) from public.ventas where cierre_id = %s), ''tarde'')', v_c), 'cierre de caja', 'una venta ya cerrada no se anula');
  perform tst.falla(format('update public.cierres_caja set efectivo_contado = 100 where id = %s', v_c), 'permission denied', 'el empleado no edita un cierre');
  perform tst.admin();
  perform tst.falla(format('update public.cierres_caja set efectivo_contado = 100 where id = %s', v_c), 'inalterable', 'un cierre es inalterable incluso para el propietario de la BD (RN-09)');
  perform tst.falla(format('delete from public.cierres_caja where id = %s', v_c), 'inalterable', 'un cierre no se elimina');
  perform tst.como('emp');
  perform tst.ok((select count(*) from public.cierres_caja) = 0, 'un empleado no ve los cierres de otro');
  perform tst.admin();
  perform tst.como('dueno');
  perform tst.ok((select count(*) from public.cierres_caja) = 1, 'el dueño ve los cierres de todos');
  perform tst.admin();
end $$;

-- HU-18 · fidelidad en pedidos web ---------------------------------------------------------------------------------------
do $$
declare v_m int := (select id from public.modelos where nombre = 'ModeloGrande'); v_cl int; v_p int; v_p2 int; v_f jsonb;
begin
  perform tst.como('ana');
  v_cl := public.mi_cliente_id();
  perform tst.admin();
  update public.clientes set contador_compras = 9 where id = v_cl;       -- la compra web N.º 10
  perform tst.como('ana');
  v_p := public.crear_pedido(format('[{"modelo_id":%s,"talla":42,"cantidad":2}]', v_m)::jsonb, 'retiro');   -- 100 Bs.
  perform tst.ok((select descuento from public.pedidos where id = v_p) = 0, 'el pedido 10 no lleva descuento');
  perform tst.admin();
  perform tst.como('emp');
  perform tst.falla(format('select public.confirmar_pedido(%s)', v_p), 'comprobante', 'sin comprobante no se confirma (regresión Sprint 2)');
  perform tst.admin();
  insert into public.comprobantes_pago (pedido_id, imagen_url) values (v_p, (select id from tst.u where nombre = 'ana') || '/x.jpg');
  update public.pedidos set estado = 'en_revision' where id = v_p;
  perform tst.como('emp');
  perform public.confirmar_pedido(v_p);
  perform tst.admin();
  perform tst.ok((select contador_compras from public.clientes where id = v_cl) = 10, 'confirmar el pedido web cuenta para la fidelidad');
  perform tst.ok((select count(*) from public.descuentos_fidelidad where cliente_id = v_cl and not aplicado) = 1, 'la 10.ª compra web deja el descuento pendiente');

  perform tst.como('ana');
  v_f := public.mi_fidelidad();
  perform tst.ok((v_f ->> 'compras')::int = 10 and (v_f ->> 'descuento_pct')::numeric = 5, 'el cliente ve su avance y su descuento disponible');
  v_p2 := public.crear_pedido(format('[{"modelo_id":%s,"talla":42,"cantidad":2}]', v_m)::jsonb, 'retiro');   -- 100 Bs.
  perform tst.ok((select descuento from public.pedidos where id = v_p2) = 5 and (select total from public.pedidos where id = v_p2) = 95, 'el siguiente pedido online lleva 5 % (100 → 95)');
  perform tst.ok((public.mi_fidelidad() ->> 'descuento_pct') is null, 'el descuento queda reservado por el pedido');
  perform public.cancelar_pedido(v_p2);
  perform tst.ok((public.mi_fidelidad() ->> 'descuento_pct')::numeric = 5, 'cancelar el pedido libera el descuento');
  perform tst.falla('update public.clientes set contador_compras = 99', 'permission denied', 'el cliente no puede inflar su contador');
  perform tst.admin();
  perform tst.como('emp');
  perform tst.ok((public.consultar_cliente(null, (select celular from public.clientes where id = v_cl)) ->> 'descuento_pct')::numeric = 5, 'la caja ve el descuento ganado online (fidelidad omnicanal)');
  perform tst.admin();
end $$;

-- HU-14 · alertas de stock mínimo -----------------------------------------------------------------------------------------
do $$
declare v_m int := (select id from public.modelos where nombre = 'ModeloTest'); v_s int; v_a int;
begin
  select id into v_s from public.stock where modelo_id = v_m and talla = 42;       -- cantidad 3, mínimo 2
  update public.stock set cantidad = 2 where id = v_s;
  perform tst.ok((select count(*) from public.alertas_stock where stock_id = v_s and not atendida) = 1, 'al llegar al mínimo (2) aparece la alerta');
  update public.stock set cantidad = 1 where id = v_s;
  perform tst.ok((select count(*) from public.alertas_stock where stock_id = v_s and not atendida) = 1 and (select cantidad_actual from public.alertas_stock where stock_id = v_s and not atendida) = 1, 'seguir bajando no duplica la alerta y actualiza el stock actual');
  update public.stock set cantidad = 10 where id = v_s;
  perform tst.ok((select count(*) from public.alertas_stock where stock_id = v_s and not atendida) = 0, 'al reponer sobre el mínimo la alerta se cierra sola');
  update public.stock set umbral_minimo = 10 where id = v_s;
  perform tst.ok((select count(*) from public.alertas_stock where stock_id = v_s and not atendida) = 1, 'subir el mínimo por encima del stock abre la alerta');
  select id into v_a from public.alertas_stock where stock_id = v_s and not atendida;

  perform tst.como('emp');
  perform tst.falla(format('select public.atender_alerta(%s)', v_a), 'permiso', 'el empleado no gestiona alertas');
  perform tst.falla(format('update public.alertas_stock set atendida = true where id = %s', v_a), 'permission denied', 'nadie edita alertas por fuera de la función');
  perform tst.admin();
  perform tst.como('adm');
  perform tst.ok((select count(*) from public.alertas_stock where not atendida) >= 1, 'el administrador ve las alertas');
  perform public.atender_alerta(v_a);
  perform tst.ok((select atendida and atendida_por is not null from public.alertas_stock where id = v_a), 'el administrador marca la alerta como atendida');
  perform tst.falla(format('select public.atender_alerta(%s)', v_a), 'ya fue atendida', 'una alerta atendida no se atiende otra vez');
  update public.stock set umbral_minimo = 4 where id = v_s;
  perform tst.ok((select umbral_minimo from public.stock where id = v_s) = 4, 'el administrador define el umbral por modelo/talla (RF-14)');
  perform tst.admin();
end $$;

-- RF-03 · resumen ejecutivo con caja ---------------------------------------------------------------------------------------
do $$
declare r record;
begin
  perform tst.como('dueno');
  select sum(total_caja) as caja, sum(total_web) as web, sum(total_bs) as tot, sum(num_ventas) as nv into r
    from public.resumen_ventas(current_date - 1, current_date + 1);
  perform tst.ok(r.caja = (select sum(total) from public.ventas where canal = 'caja' and not anulada), 'el resumen suma las ventas de caja no anuladas');
  perform tst.ok(r.web = 100 and r.tot = r.caja + r.web, 'el resumen suma el pedido web confirmado (100) y el total combinado');
  perform tst.admin();
  perform tst.como('emp');
  perform tst.falla('select * from public.resumen_ventas(current_date - 1, current_date + 1)', 'permiso', 'el empleado sigue sin ver el resumen (RN-08)');
  perform tst.admin();
end $$;

rollback;
