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
