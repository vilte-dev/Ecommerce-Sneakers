# Base de datos (Supabase)

1. Crea el proyecto en Supabase y copia `URL` y `anon key` al `.env` de la raíz.
2. En **SQL Editor** ejecuta, en orden: `0001_esquema.sql`, `0002_funciones_y_triggers.sql`,
   `0003_rls_y_vistas.sql`, `0004_storage.sql` y (opcional) `seed.sql`.
   Con la CLI: `supabase link` y `supabase db push`.
3. Regístrate desde la tienda y, en el SQL Editor, conviértete en administrador (el rol nunca se
   puede elegir desde el registro):

```sql
update public.usuarios
   set rol_id = (select id from public.roles where nombre = 'administrador')
 where correo = 'tu-correo@ejemplo.com';
```

4. Desde el sistema interno (**Usuarios**) puedes asignar rol a empleados y al dueño.
5. En Authentication > URL Configuration agrega la URL de la tienda para el enlace de recuperación de contraseña.

Las tablas de pedidos, ventas y caja ya existen pero sin políticas (acceso denegado) hasta sus sprints.
