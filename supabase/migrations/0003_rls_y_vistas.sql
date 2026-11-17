-- 0003_rls_y_vistas.sql
-- HU-01 / RNF-07: seguridad por fila. Las tablas de Sprint 2+ quedan con RLS activa y SIN políticas
-- (denegado por defecto) hasta que se implemente su módulo.

alter table public.roles               enable row level security;
alter table public.usuarios            enable row level security;
alter table public.clientes            enable row level security;
alter table public.sucursales          enable row level security;
alter table public.categorias          enable row level security;
alter table public.marcas              enable row level security;
alter table public.modelos             enable row level security;
alter table public.stock               enable row level security;
alter table public.alertas_stock       enable row level security;
alter table public.carritos            enable row level security;
alter table public.items_carrito       enable row level security;
alter table public.repartidores        enable row level security;
alter table public.pedidos             enable row level security;
alter table public.detalle_pedido      enable row level security;
alter table public.comprobantes_pago   enable row level security;
alter table public.despachos           enable row level security;
alter table public.ventas              enable row level security;
alter table public.detalle_venta       enable row level security;
alter table public.comprobantes_venta  enable row level security;
alter table public.descuentos_fidelidad enable row level security;
alter table public.cierres_caja        enable row level security;
alter table public.compras_proveedor   enable row level security;

-- Privilegios por columna: nadie puede cambiarse el rol ni inflar su contador de compras.
revoke insert, update, delete on public.usuarios from anon, authenticated;
grant  update (nombre, celular) on public.usuarios to authenticated;
revoke insert, update on public.clientes from anon, authenticated;
grant  insert (usuario_id, ci, celular, correo) on public.clientes to authenticated;
grant  update (ci, celular, correo) on public.clientes to authenticated;

-- roles / usuarios / clientes
create policy roles_lectura on public.roles for select to authenticated using (true);

create policy usuarios_lectura on public.usuarios for select to authenticated
  using (id = (select auth.uid()) or public.es_gerencia());
create policy usuarios_edicion_propia on public.usuarios for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy clientes_lectura on public.clientes for select to authenticated
  using (usuario_id = (select auth.uid()) or public.es_staff());
create policy clientes_alta on public.clientes for insert to authenticated
  with check (usuario_id = (select auth.uid()) or public.es_staff());
create policy clientes_edicion on public.clientes for update to authenticated
  using (usuario_id = (select auth.uid()) or public.es_staff())
  with check (usuario_id = (select auth.uid()) or public.es_staff());

-- Datos públicos de la tienda
create policy sucursales_lectura on public.sucursales for select to anon, authenticated using (true);
create policy sucursales_escritura on public.sucursales for all to authenticated
  using (public.es_gerencia()) with check (public.es_gerencia());

create policy categorias_lectura on public.categorias for select to anon, authenticated using (true);
create policy categorias_escritura on public.categorias for all to authenticated
  using (public.es_gerencia()) with check (public.es_gerencia());

create policy marcas_lectura on public.marcas for select to anon, authenticated
  using (activo or public.es_staff());
create policy marcas_escritura on public.marcas for all to authenticated
  using (public.es_gerencia()) with check (public.es_gerencia());

create policy modelos_lectura on public.modelos for select to anon, authenticated
  using (activo or public.es_staff());
create policy modelos_escritura on public.modelos for all to authenticated
  using (public.es_gerencia()) with check (public.es_gerencia());

-- Stock: interno. El público lo ve solo a través de las vistas de abajo.
create policy stock_lectura on public.stock for select to authenticated using (public.es_staff());
create policy stock_escritura on public.stock for all to authenticated
  using (public.es_gerencia()) with check (public.es_gerencia());

create policy alertas_lectura on public.alertas_stock for select to authenticated using (public.es_staff());
create policy alertas_edicion on public.alertas_stock for update to authenticated
  using (public.es_staff()) with check (public.es_staff());

-- Carrito: cada cliente solo ve y edita el suyo.
create policy carritos_propios on public.carritos for all to authenticated
  using (cliente_id = public.mi_cliente_id()) with check (cliente_id = public.mi_cliente_id());
create policy items_carrito_propios on public.items_carrito for all to authenticated
  using (carrito_id in (select id from public.carritos where cliente_id = public.mi_cliente_id()))
  with check (carrito_id in (select id from public.carritos where cliente_id = public.mi_cliente_id()));

-- RNF-07: inversión en mercadería solo para gerencia. El empleado no la ve.
create policy compras_proveedor_gerencia on public.compras_proveedor for all to authenticated
  using (public.es_gerencia()) with check (public.es_gerencia());

-- Vistas públicas del catálogo. Se ejecutan con los permisos del dueño de la vista a propósito:
-- exponen solo disponibilidad (no umbrales ni sucursales). El aviso "security definer view" del linter es esperado.
create or replace view public.catalogo as
select m.id, m.nombre, m.color, m.precio, m.fotos,
       ma.id as marca_id, ma.nombre as marca,
       c.id as categoria_id, c.nombre as categoria, c.talla_min, c.talla_max,
       coalesce(sum(s.cantidad), 0)::int as stock_total
from public.modelos m
join public.marcas ma on ma.id = m.marca_id
join public.categorias c on c.id = m.categoria_id
left join public.stock s on s.modelo_id = m.id
where m.activo and ma.activo
group by m.id, ma.id, c.id;

create or replace view public.catalogo_tallas as
select s.modelo_id, s.talla, sum(s.cantidad)::int as cantidad
from public.stock s
join public.modelos m on m.id = s.modelo_id and m.activo
group by s.modelo_id, s.talla;

grant select on public.catalogo, public.catalogo_tallas to anon, authenticated;
