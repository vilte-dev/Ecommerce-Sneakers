-- SOLO PARA PRUEBAS LOCALES (no se ejecuta en Supabase): imita lo mínimo de los esquemas auth y storage.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
grant usage on schema auth, storage to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
grant select, insert on storage.objects to authenticated; grant select on storage.buckets to authenticated;
-- 0001_esquema.sql
-- Esquema físico de Sneakers. Fuente: docs/base-de-datos/Sneakers_10_Modelo_Fisico_PostgreSQL.drawio
-- Los CHECK de estados y formas de pago salen del diagrama de clases (docs/diagrama-de-clases).
-- Los estados de "pedidos" no están definidos en los diagramas: son una propuesta a validar con el equipo.

create table public.roles (
  id     integer generated always as identity primary key,
  nombre varchar(30) not null unique
);

create table public.usuarios (
  id        uuid primary key references auth.users (id) on delete cascade,
  rol_id    integer not null references public.roles (id),
  correo    varchar(120) not null unique,
  celular   varchar(20),
  nombre    varchar(100) not null,
  activo    boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.clientes (
  id               integer generated always as identity primary key,
  usuario_id       uuid unique references public.usuarios (id) on delete set null,
  ci               varchar(20) unique,
  celular          varchar(20) not null unique,
  correo           varchar(120),
  contador_compras integer not null default 0 check (contador_compras >= 0)
);

create table public.sucursales (
  id        integer generated always as identity primary key,
  nombre    varchar(60) not null,
  direccion text
);

create table public.categorias (
  id        integer generated always as identity primary key,
  nombre    varchar(20) not null unique,
  talla_min integer not null,
  talla_max integer,                       -- null = sin tope ("40 en adelante")
  check (talla_max is null or talla_max >= talla_min)
);

create table public.marcas (
  id     integer generated always as identity primary key,
  nombre varchar(60) not null unique,
  activo boolean not null default true
);

create table public.modelos (
  id           integer generated always as identity primary key,
  marca_id     integer not null references public.marcas (id),
  categoria_id integer not null references public.categorias (id),
  nombre       varchar(100) not null,
  color        varchar(30) not null,
  precio       numeric(10,2) not null check (precio >= 0),
  fotos        text[],
  activo       boolean not null default true
);
create index on public.modelos (marca_id);
create index on public.modelos (categoria_id);

create table public.stock (
  id            integer generated always as identity primary key,
  sucursal_id   integer not null references public.sucursales (id),
  modelo_id     integer not null references public.modelos (id) on delete cascade,
  talla         integer not null,
  cantidad      integer not null default 0 check (cantidad >= 0),
  umbral_minimo integer not null default 2 check (umbral_minimo >= 0),
  unique (sucursal_id, modelo_id, talla)
);
create index on public.stock (modelo_id);

create table public.alertas_stock (
  id              integer generated always as identity primary key,
  stock_id        integer not null references public.stock (id) on delete cascade,
  fecha           timestamptz not null default now(),
  cantidad_actual integer not null,
  atendida        boolean not null default false
);

create table public.carritos (
  id         integer generated always as identity primary key,
  cliente_id integer not null unique references public.clientes (id) on delete cascade,
  creado_en  timestamptz not null default now()
);

create table public.items_carrito (
  id         integer generated always as identity primary key,
  carrito_id integer not null references public.carritos (id) on delete cascade,
  modelo_id  integer not null references public.modelos (id),
  talla      integer not null,
  cantidad   integer not null check (cantidad > 0),
  unique (carrito_id, modelo_id, talla)
);

-- Sprint 2 ------------------------------------------------------------------
create table public.repartidores (
  id       integer generated always as identity primary key,
  nombre   varchar(100) not null,
  telefono varchar(20)
);

create table public.pedidos (
  id                  integer generated always as identity primary key,
  cliente_id          integer not null references public.clientes (id),
  fecha               timestamptz not null default now(),
  estado              varchar(20) not null default 'pendiente_pago'
    check (estado in ('pendiente_pago','en_revision','pagado','en_despacho','entregado','cancelado')),
  total               numeric(10,2) not null check (total >= 0),
  descuento           numeric(10,2) not null default 0 check (descuento >= 0),
  metodo_despacho     varchar(10) not null check (metodo_despacho in ('domicilio','retiro')),
  direccion           text,
  telefono            varchar(20),
  pago_contra_entrega varchar(10) check (pago_contra_entrega in ('efectivo','qr'))
);
create index on public.pedidos (cliente_id);
create index on public.pedidos (estado);

create table public.detalle_pedido (
  id              integer generated always as identity primary key,
  pedido_id       integer not null references public.pedidos (id) on delete cascade,
  modelo_id       integer not null references public.modelos (id),
  talla           integer not null,
  cantidad        integer not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0)
);

create table public.comprobantes_pago (
  id             integer generated always as identity primary key,
  pedido_id      integer not null references public.pedidos (id) on delete cascade,
  imagen_url     text not null,
  fecha_carga    timestamptz not null default now(),
  estado         varchar(15) not null default 'pendiente'
    check (estado in ('pendiente','validado','rechazado')),
  validado_por   uuid references public.usuarios (id),
  motivo_rechazo text
);

create table public.despachos (
  id             integer generated always as identity primary key,
  pedido_id      integer not null unique references public.pedidos (id) on delete cascade,
  repartidor_id  integer references public.repartidores (id),
  estado         varchar(15) not null default 'asignado'
    check (estado in ('asignado','en_camino','entregado','no_entregado')),
  motivo         text,
  actualizado_en timestamptz not null default now()
);

-- Sprint 3 ------------------------------------------------------------------
create table public.ventas (
  id               integer generated always as identity primary key,
  numero           varchar(20) not null unique,
  pedido_id        integer unique references public.pedidos (id),
  cliente_id       integer references public.clientes (id),
  usuario_id       uuid not null references public.usuarios (id),
  sucursal_id      integer not null references public.sucursales (id),
  fecha            timestamptz not null default now(),
  canal            varchar(10) not null check (canal in ('web','caja')),
  -- El diagrama de clases solo lista efectivo|tarjeta, pero las ventas web se pagan por transferencia o QR.
  forma_pago       varchar(15) not null check (forma_pago in ('efectivo','tarjeta','transferencia','qr')),
  subtotal         numeric(10,2) not null check (subtotal >= 0),
  descuento        numeric(10,2) not null default 0 check (descuento >= 0),
  total            numeric(10,2) not null check (total >= 0),
  anulada          boolean not null default false,
  motivo_anulacion text
);

create table public.detalle_venta (
  id              integer generated always as identity primary key,
  venta_id        integer not null references public.ventas (id) on delete cascade,
  modelo_id       integer not null references public.modelos (id),
  talla           integer not null,
  cantidad        integer not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0)
);

create table public.comprobantes_venta (
  id            integer generated always as identity primary key,
  venta_id      integer not null unique references public.ventas (id) on delete cascade,
  numero        varchar(20) not null,
  fecha_emision timestamptz not null default now(),
  leyenda       text
);

create table public.descuentos_fidelidad (
  id               integer generated always as identity primary key,
  cliente_id       integer not null references public.clientes (id),
  venta_id         integer references public.ventas (id),
  porcentaje       numeric(4,2) not null default 5,
  aplicado         boolean not null default false,
  fecha_generacion date not null default current_date
);

create table public.cierres_caja (
  id               integer generated always as identity primary key,
  usuario_id       uuid not null references public.usuarios (id),
  fecha            date not null default current_date,
  efectivo_contado numeric(10,2) not null,
  total_esperado   numeric(10,2) not null,
  diferencia       numeric(10,2) not null,
  creado_en        timestamptz not null default now()
);

-- Sprint 4 ------------------------------------------------------------------
create table public.compras_proveedor (
  id             integer generated always as identity primary key,
  modelo_id      integer not null references public.modelos (id),
  fecha          date not null default current_date,
  proveedor      varchar(100) not null,
  talla          integer not null,
  cantidad       integer not null check (cantidad > 0),
  costo_unitario numeric(10,2) not null check (costo_unitario >= 0)
);

-- Datos de referencia (no son datos de prueba) --------------------------------
insert into public.roles (nombre) values ('cliente'), ('empleado'), ('dueno'), ('administrador');

-- Regla de negocio RF-06 / ISO 9407: Niño 20-34, Juvenil 35-39, Adulto 40 en adelante.
insert into public.categorias (nombre, talla_min, talla_max) values
  ('Niño', 20, 34), ('Juvenil', 35, 39), ('Adulto', 40, null);

insert into public.sucursales (nombre, direccion) values ('Sneakers Tarija', null);
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
-- 0004_storage.sql · Fotos de modelos (HU-04). Lectura pública, escritura solo gerencia.
insert into storage.buckets (id, name, public) values ('modelos', 'modelos', true)
on conflict (id) do nothing;

create policy fotos_modelos_lectura on storage.objects for select
  using (bucket_id = 'modelos');
create policy fotos_modelos_subida on storage.objects for insert to authenticated
  with check (bucket_id = 'modelos' and public.es_gerencia());
create policy fotos_modelos_edicion on storage.objects for update to authenticated
  using (bucket_id = 'modelos' and public.es_gerencia());
create policy fotos_modelos_borrado on storage.objects for delete to authenticated
  using (bucket_id = 'modelos' and public.es_gerencia());
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
