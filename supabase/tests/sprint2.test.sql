-- sprint2.test.sql · Pruebas del Sprint 2 (HU-03, HU-08 a HU-13) a nivel de base de datos.
-- Ejecutar SOLO en un proyecto de desarrollo, después de las migraciones 0001–0005:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/sprint2.test.sql
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
declare n text; v_id uuid; v_modelo int;
begin
  foreach n in array array['ana','beto','emp','dueno','adm'] loop
    v_id := gen_random_uuid();
    insert into auth.users (id, email, raw_user_meta_data)
    values (v_id, n || '@prueba.bo', json_build_object('nombre', n, 'celular', '7' || lpad((random()*9999999)::int::text, 7, '0'))::jsonb);
    insert into tst.u values (n, v_id);
  end loop;
  update public.usuarios set rol_id = (select id from public.roles where nombre = 'empleado')       where id = (select id from tst.u where nombre = 'emp');
  update public.usuarios set rol_id = (select id from public.roles where nombre = 'dueno')          where id = (select id from tst.u where nombre = 'dueno');
  update public.usuarios set rol_id = (select id from public.roles where nombre = 'administrador')  where id = (select id from tst.u where nombre = 'adm');

  insert into public.cuentas_pago (banco, titular, numero) values ('Banco Prueba', 'Sneakers', '1000-123');
  insert into public.marcas (nombre) values ('MarcaTest');
  insert into public.modelos (marca_id, categoria_id, nombre, color, precio)
  values ((select id from public.marcas where nombre = 'MarcaTest'), (select id from public.categorias where nombre = 'Adulto'), 'ModeloTest', 'Negro', 100)
  returning id into v_modelo;
  insert into public.stock (sucursal_id, modelo_id, talla, cantidad, umbral_minimo)
  values ((select min(id) from public.sucursales), v_modelo, 42, 3, 1), ((select min(id) from public.sucursales), v_modelo, 43, 1, 0);
  insert into public.repartidores (nombre, telefono) values ('Moto Rápido', '71111111');
end $$;

-- HU-08 · crear pedido ----------------------------------------------------------------------------------------
do $$
declare v_m int := (select id from public.modelos where nombre = 'ModeloTest'); v_p int; v_total numeric;
begin
  perform tst.como('ana');
  perform tst.falla(format($q$select public.crear_pedido('[{"modelo_id":%s,"talla":42,"cantidad":4}]'::jsonb, 'retiro')$q$, v_m),
                    'Solo hay 3', 'no se puede pedir más que el stock');
  perform tst.falla(format($q$select public.crear_pedido('[{"modelo_id":%s,"talla":38,"cantidad":1}]'::jsonb, 'retiro')$q$, v_m),
                    'disponibles', 'una talla fuera del rango de la categoría no se puede pedir (RF-06)');
  perform tst.falla(format($q$select public.crear_pedido('[{"modelo_id":%s,"talla":42,"cantidad":1}]'::jsonb, 'domicilio', 'Ca 1', '71234567')$q$, v_m),
                    'dirección', 'domicilio exige dirección de al menos 5 caracteres');
  perform tst.falla(format($q$select public.crear_pedido('[{"modelo_id":%s,"talla":42,"cantidad":1}]'::jsonb, 'domicilio', 'Calle Bolívar 123, Tarija', '123')$q$, v_m),
                    'celular', 'domicilio exige celular válido');
  perform tst.falla('select public.crear_pedido(''[]''::jsonb, ''retiro'')', 'vacío', 'no se crea un pedido con carrito vacío');

  v_p := public.crear_pedido(format('[{"modelo_id":%s,"talla":42,"cantidad":2},{"modelo_id":%s,"talla":42,"cantidad":1}]', v_m, v_m)::jsonb, 'retiro');
  perform tst.admin();
  select total into v_total from public.pedidos where id = v_p;
  perform tst.ok(v_total = 300, 'el total sale de los precios de la BD (3 × 100 = 300) y suma líneas repetidas');
  perform tst.ok((select estado from public.pedidos where id = v_p) = 'pendiente_pago', 'el pedido nace pendiente de pago');
  perform tst.ok((select cantidad from public.stock where modelo_id = v_m and talla = 42) = 3, 'crear el pedido NO descuenta stock (RN-04)');
end $$;

-- Seguridad: un cliente no ve ni altera pedidos ajenos ni los suyos directamente (RNF-07) --------------------------
do $$
declare v_p int := (select min(id) from public.pedidos);
begin
  perform tst.como('beto');
  perform tst.ok((select count(*) from public.pedidos) = 0, 'otro cliente no ve el pedido de Ana');
  perform tst.admin();
  perform tst.como('ana');
  perform tst.ok((select count(*) from public.pedidos) = 1, 'Ana ve su pedido');
  update public.pedidos set total = 1, estado = 'pagado' where id = v_p;   -- RLS sin política de UPDATE: 0 filas
  perform tst.ok((select total from public.pedidos where id = v_p) = 300 and (select estado from public.pedidos where id = v_p) = 'pendiente_pago', 'el cliente no puede modificar total ni estado de su pedido');
  perform tst.falla('insert into public.pedidos (cliente_id, total, metodo_despacho) values (1, 1, ''retiro'')', 'row-level security', 'el cliente no puede insertar pedidos directamente');
  perform tst.falla(format('select public.confirmar_pedido(%s)', v_p), 'permiso', 'el cliente no puede confirmar pedidos');
  perform tst.admin();
end $$;

-- HU-10 · comprobante -------------------------------------------------------------------------------------------
do $$
declare v_p int := (select min(id) from public.pedidos); v_ana uuid := (select id from tst.u where nombre = 'ana');
        v_beto uuid := (select id from tst.u where nombre = 'beto');
begin
  perform tst.como('ana');
  perform tst.falla(format('select public.registrar_comprobante(%s, %L)', v_p, v_beto || '/falso.jpg'), 'Archivo', 'no se acepta un archivo de la carpeta de otro usuario');
  perform tst.admin();
  perform tst.como('beto');
  perform tst.falla(format('select public.registrar_comprobante(%s, %L)', v_p, v_beto || '/x.jpg'), 'No encontramos', 'otro cliente no puede cargar comprobante a un pedido ajeno');
  perform tst.admin();
  perform tst.como('ana');
  perform public.registrar_comprobante(v_p, v_ana || '/' || v_p || '-1.jpg');
  perform tst.admin();
  perform tst.ok((select estado from public.pedidos where id = v_p) = 'en_revision', 'al cargar el comprobante el pedido pasa a en_revision');
  perform tst.como('ana');
  perform public.registrar_comprobante(v_p, v_ana || '/' || v_p || '-2.jpg');
  perform tst.admin();
  perform tst.ok((select count(*) from public.comprobantes_pago where pedido_id = v_p and estado = 'pendiente') = 1, 'un nuevo comprobante reemplaza al anterior (solo uno pendiente)');
end $$;

-- HU-11 · rechazar y validar --------------------------------------------------------------------------------------
do $$
declare v_p int := (select min(id) from public.pedidos); v_ana uuid := (select id from tst.u where nombre = 'ana'); v_m int := (select id from public.modelos where nombre = 'ModeloTest');
begin
  perform tst.como('adm');
  perform tst.falla(format('select public.confirmar_pedido(%s)', v_p), 'permiso', 'el administrador no valida pagos (matriz de permisos)');
  perform tst.admin();
  perform tst.como('emp');
  perform tst.falla(format('select public.rechazar_comprobante(%s, '' '')', v_p), 'motivo', 'rechazar exige motivo');
  perform public.rechazar_comprobante(v_p, 'La imagen no se ve');
  perform tst.admin();
  perform tst.ok((select estado from public.pedidos where id = v_p) = 'pendiente_pago', 'tras el rechazo el cliente puede volver a subir un comprobante');
  perform tst.ok((select motivo_rechazo from public.comprobantes_pago where pedido_id = v_p and estado = 'rechazado' order by id desc limit 1) = 'La imagen no se ve', 'el motivo queda guardado');

  perform tst.como('emp');
  perform tst.falla(format('select public.confirmar_pedido(%s)', v_p), 'comprobante cargado', 'no se valida un pedido sin comprobante');
  perform tst.admin();
  perform tst.como('ana');
  perform public.registrar_comprobante(v_p, v_ana || '/' || v_p || '-3.jpg');
  perform tst.admin();
  perform tst.como('emp');
  perform tst.ok((select count(*) from public.usuarios where nombre = 'ana') = 1, 'el empleado ve el nombre del cliente del pedido');
  perform public.confirmar_pedido(v_p);
  perform tst.admin();
  perform tst.ok((select estado from public.pedidos where id = v_p) = 'pagado', 'el pedido queda confirmado');
  perform tst.ok((select cantidad from public.stock where modelo_id = v_m and talla = 42) = 0, 'el stock se descuenta al validar (3 − 3 = 0)');
  perform tst.ok((select estado from public.comprobantes_pago where pedido_id = v_p and imagen_url like '%-3.jpg') = 'validado', 'el comprobante queda validado');
  perform tst.ok(exists (select 1 from public.alertas_stock a join public.stock s on s.id = a.stock_id where s.modelo_id = v_m and s.talla = 42 and not a.atendida), 'al llegar al mínimo se genera una alerta de stock (RF-12)');
  perform tst.como('emp');
  perform tst.falla(format('select public.confirmar_pedido(%s)', v_p), 'comprobante cargado', 'no se puede confirmar dos veces');
  perform tst.admin();
end $$;

-- RF-12 · la última unidad solo se vende una vez --------------------------------------------------------------------
do $$
declare v_m int := (select id from public.modelos where nombre = 'ModeloTest'); v_a int; v_b int;
        v_ana uuid := (select id from tst.u where nombre = 'ana'); v_beto uuid := (select id from tst.u where nombre = 'beto');
begin
  perform tst.como('ana');
  v_a := public.crear_pedido(format('[{"modelo_id":%s,"talla":43,"cantidad":1}]', v_m)::jsonb, 'retiro');
  perform public.registrar_comprobante(v_a, v_ana || '/a.jpg');
  perform tst.admin();
  perform tst.como('beto');
  v_b := public.crear_pedido(format('[{"modelo_id":%s,"talla":43,"cantidad":1}]', v_m)::jsonb, 'retiro');
  perform public.registrar_comprobante(v_b, v_beto || '/b.jpg');
  perform tst.admin();
  perform tst.como('emp');
  perform public.confirmar_pedido(v_a);
  perform tst.falla(format('select public.confirmar_pedido(%s)', v_b), 'Stock insuficiente', 'el segundo pedido por la última unidad se bloquea');
  perform tst.admin();
  perform tst.ok((select estado from public.pedidos where id = v_b) = 'en_revision', 'el pedido bloqueado queda sin confirmar');
  perform tst.ok((select cantidad from public.stock where modelo_id = v_m and talla = 43) = 0, 'el stock nunca queda negativo');
  perform tst.falla(format('update public.stock set cantidad = -1 where modelo_id = %s and talla = 43', v_m), 'check', 'la BD rechaza stock negativo');
  perform tst.como('beto');
  perform public.cancelar_pedido(v_b);
  perform tst.admin();
  perform tst.ok((select estado from public.pedidos where id = v_b) = 'cancelado', 'el cliente puede cancelar un pedido sin confirmar');
  perform tst.como('ana');
  perform tst.falla(format('select public.cancelar_pedido(%s)', v_a), 'confirmado', 'un pedido confirmado no se cancela');
  perform tst.admin();
end $$;

-- HU-12 · retiro en tienda ------------------------------------------------------------------------------------------
do $$
declare v_a int := (select id from public.pedidos where estado = 'pagado' and metodo_despacho = 'retiro' order by id desc limit 1);
begin
  perform tst.como('emp');
  perform tst.falla(format('select public.marcar_retirado(%s)', v_a), 'no está listo', 'no se entrega algo que no está listo');
  perform public.marcar_listo_retiro(v_a);
  perform public.marcar_retirado(v_a);
  perform tst.admin();
  perform tst.ok((select estado from public.pedidos where id = v_a) = 'entregado', 'retiro: pagado → listo para retiro → entregado');
end $$;

-- HU-08 + HU-12 · domicilio contra entrega y despacho ---------------------------------------------------------------
do $$
declare v_m int; v_p int; v_rep int := (select min(id) from public.repartidores); v_h int;
begin
  insert into public.stock (sucursal_id, modelo_id, talla, cantidad, umbral_minimo)
  select (select min(id) from public.sucursales), id, 44, 5, 1 from public.modelos where nombre = 'ModeloTest';
  select id into v_m from public.modelos where nombre = 'ModeloTest';

  perform tst.como('beto');
  v_p := public.crear_pedido(format('[{"modelo_id":%s,"talla":44,"cantidad":2}]', v_m)::jsonb, 'domicilio', 'Av. La Paz 456, Tarija', '71234567', 'efectivo');
  perform tst.admin();
  perform tst.ok((select pago_contra_entrega from public.pedidos where id = v_p) = 'efectivo', 'el pedido guarda el pago contra entrega elegido');

  perform tst.como('emp');
  perform tst.falla(format('select public.asignar_despacho(%s, %s)', v_p, v_rep), 'confirmado', 'no se despacha un pedido sin confirmar');
  perform public.confirmar_pedido(v_p);   -- H-03: contra entrega se confirma sin comprobante
  perform tst.admin();
  perform tst.ok((select cantidad from public.stock where modelo_id = v_m and talla = 44) = 3, 'contra entrega: el stock se descuenta al confirmar el pedido (H-03)');

  perform tst.como('emp');
  perform public.asignar_despacho(v_p, v_rep);
  perform tst.admin();
  perform tst.ok((select estado from public.pedidos where id = v_p) = 'en_despacho', 'asignar repartidor deja el pedido en despacho');
  perform tst.como('emp');
  perform public.actualizar_despacho(v_p, 'en_camino');
  perform tst.falla(format('select public.actualizar_despacho(%s, ''no_entregado'', '''')', v_p), 'motivo', 'no_entregado exige motivo');
  perform public.actualizar_despacho(v_p, 'no_entregado', 'Nadie en casa');
  perform public.asignar_despacho(v_p, v_rep);     -- reasignación tras entrega fallida
  perform public.actualizar_despacho(v_p, 'entregado');
  perform tst.falla(format('select public.actualizar_despacho(%s, ''en_camino'')', v_p), 'ya fue registrada', 'una entrega registrada no se modifica');
  perform tst.admin();
  perform tst.ok((select estado from public.pedidos where id = v_p) = 'entregado', 'entregado cierra el pedido');
  select count(*) into v_h from public.despacho_historial where despacho_id = (select id from public.despachos where pedido_id = v_p);
  perform tst.ok(v_h = 5, 'el historial guarda cada cambio con usuario y fecha (5 registros)');
  perform tst.ok((select count(*) from public.despacho_historial where usuario_id is null) = 0, 'cada cambio del historial tiene usuario');
end $$;

-- HU-09 · datos de pago ------------------------------------------------------------------------------------------------
do $$
declare v_m int := (select id from public.modelos where nombre = 'ModeloTest');
begin
  update public.cuentas_pago set activo = false;
  perform tst.como('ana');
  perform tst.falla(format('select public.crear_pedido(''[{"modelo_id":%s,"talla":44,"cantidad":1}]''::jsonb, ''retiro'')', v_m), 'datos de pago', 'sin cuentas ni QR no se puede pagar por adelantado');
  perform tst.ok((select count(*) from public.cuentas_pago) = 0, 'el cliente solo ve cuentas activas');
  perform tst.admin();
  update public.cuentas_pago set activo = true;
  perform tst.como('ana');
  perform tst.ok((select count(*) from public.cuentas_pago where banco = 'Banco Prueba') = 1, 'con cuenta activa el cliente la ve');
  update public.cuentas_pago set numero = '0';
  perform tst.ok((select count(*) from public.cuentas_pago where numero = '0') = 0, 'el cliente no puede editar las cuentas de pago');
  perform tst.admin();
end $$;

-- HU-03 · acceso por rol ---------------------------------------------------------------------------------------------------
do $$
begin
  perform tst.como('emp');
  perform tst.falla('select * from public.resumen_ventas(current_date - 30, current_date)', 'permiso', 'el empleado no ve el resumen ejecutivo (RN-08)');
  perform tst.ok((select count(*) from public.compras_proveedor) = 0, 'el empleado no lee compras ni inversión');
  perform tst.admin();
  perform tst.como('adm');
  perform tst.falla('select * from public.resumen_ventas(current_date - 30, current_date)', 'permiso', 'el administrador tampoco ve el resumen ejecutivo (H-08)');
  perform tst.ok((select count(*) from public.pedidos) = 0, 'el administrador no lee pedidos');
  perform tst.admin();
  perform tst.como('dueno');
  perform tst.ok((select coalesce(sum(total_bs), 0) from public.resumen_ventas(current_date - 1, current_date + 1)) = 300 + 100 + 200, 'el dueño ve las ventas confirmadas del periodo (300 + 100 + 200)');
  perform tst.admin();
  perform tst.ok(not has_function_privilege('anon', 'public.crear_pedido(jsonb,text,text,text,text)', 'execute'), 'anon no puede ejecutar crear_pedido');
  perform tst.ok(not has_function_privilege('authenticated', 'public._descontar_stock_pedido(integer)', 'execute'), 'nadie llama directo a la función interna de stock');
end $$;

rollback;
