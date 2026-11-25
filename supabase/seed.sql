-- seed.sql · DATOS FICTICIOS de prueba. Se reemplazan con el catálogo real del dueño (tarea T10).
insert into public.marcas (nombre) values ('Volta'), ('Aurora'), ('Tarija Sport');

insert into public.modelos (marca_id, categoria_id, nombre, color, precio)
select (select id from public.marcas where nombre = v.marca),
       (select id from public.categorias where nombre = v.cat), v.nombre, v.color, v.precio
from (values
  ('Volta','Adulto','Runner Pro','Negro',450),
  ('Volta','Adulto','Runner Pro','Blanco',450),
  ('Aurora','Adulto','Street','Gris',380),
  ('Tarija Sport','Adulto','Classic','Rojo',320),
  ('Aurora','Adulto','Trail','Verde',520),
  ('Volta','Juvenil','Flex Jr','Azul',290),
  ('Aurora','Juvenil','Street Jr','Negro',260),
  ('Tarija Sport','Niño','Kids Jump','Celeste',180),
  ('Volta','Niño','Mini','Rosado',160)
) as v(marca, cat, nombre, color, precio);

insert into public.stock (sucursal_id, modelo_id, talla, cantidad, umbral_minimo)
select (select id from public.sucursales order by id limit 1), m.id, gs.talla,
       case when (m.id + gs.talla) % 7 = 0 then 0 else 1 + (m.id * gs.talla) % 6 end, 2
from public.modelos m
join public.categorias c on c.id = m.categoria_id
cross join lateral generate_series(
  case c.nombre when 'Niño' then 28 else c.talla_min end,
  case c.nombre when 'Adulto' then 45 else c.talla_max end
) as gs(talla);

-- Sprint 2 · datos de pago y repartidor FICTICIOS para probar el flujo (reemplazar con los reales del negocio).
insert into public.cuentas_pago (banco, titular, numero, tipo) values
  ('Banco Ejemplo', 'Sneakers Tarija (ficticio)', '1000-000000-1', 'Caja de ahorro');
insert into public.repartidores (nombre, telefono) values ('Moto Express Tarija (ficticio)', '70000000');
