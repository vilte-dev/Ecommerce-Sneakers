# Base de datos (Supabase)

1. Crea el proyecto en Supabase y copia `URL` y `anon key` al `.env` de la raíz.
2. En **SQL Editor** ejecuta, en orden: `0001_esquema.sql`, `0002_funciones_y_triggers.sql`,
   `0003_rls_y_vistas.sql`, `0004_storage.sql`, `0005_sprint2_pedidos.sql` y (opcional) `seed.sql`.
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

6. Sprint 2: entra al sistema interno como administrador o dueño → **Datos de pago** y carga al menos una cuenta
   bancaria o el QR. Sin eso la tienda no deja finalizar pedidos con pago anticipado (RF-08).
7. Asigna rol **empleado** a quien valida pedidos (**Usuarios**). El administrador no valida pagos (matriz de permisos B.3).

## Pruebas

```bash
npm test                                   # pruebas unitarias del paquete compartido (Node)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/sprint2.test.sql   # BD de desarrollo; termina en ROLLBACK
```

`supabase/harness/stubs.sql` solo sirve para correr las migraciones en un PostgreSQL local sin Supabase (imita `auth` y `storage`).
No lo ejecutes en un proyecto de Supabase.

## Qué hay en cada migración

- `0005_sprint2_pedidos`: `crear_pedido`, `registrar_comprobante`, `confirmar_pedido`, `rechazar_comprobante`, `cancelar_pedido`,
  `marcar_listo_retiro`, `marcar_retirado`, `asignar_despacho`, `actualizar_despacho`, `resumen_ventas`; tablas `cuentas_pago`,
  `parametros`, `despacho_historial`; buckets `comprobantes` (privado) y `pagos` (público, QR). El cliente nunca escribe en
  `pedidos` directamente: todo pasa por estas funciones.

Las tablas de ventas, caja y compras ya existen pero sin políticas (acceso denegado) hasta sus sprints (3 y 4).
