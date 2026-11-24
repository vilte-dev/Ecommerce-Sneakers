import { ROLES, STAFF, GERENCIA, OPERADORES } from '@sneakers/shared';

// Módulos del sistema interno. `sprint` indica cuándo se construye (null = ya disponible).
// Matriz de permisos (SRS B.3): Empleado y Dueño operan pedidos y caja; el Administrador gestiona catálogo y parámetros;
// los paneles ejecutivos son solo del Dueño (RN-08).
export const MODULOS = [
  { ruta: '/', texto: 'Inicio', roles: STAFF, sprint: null, fin: true },
  { ruta: '/pedidos', texto: 'Pedidos web', roles: OPERADORES, sprint: null },
  { ruta: '/inventario', texto: 'Inventario', roles: STAFF, sprint: null },
  { ruta: '/modelos', texto: 'Modelos', roles: GERENCIA, sprint: null },
  { ruta: '/marcas', texto: 'Marcas', roles: GERENCIA, sprint: null },
  { ruta: '/pagos', texto: 'Datos de pago', roles: GERENCIA, sprint: null },
  { ruta: '/resumen', texto: 'Resumen ejecutivo', roles: [ROLES.DUENO], sprint: null },
  { ruta: '/pos', texto: 'Punto de venta', roles: OPERADORES, sprint: 3, historias: 'HU-15, HU-16, HU-24',
    detalle: 'Venta en tienda en 4 clics o menos, comprobante no fiscal y bloqueo si se pierde internet.' },
  { ruta: '/caja', texto: 'Cierre de caja', roles: OPERADORES, sprint: 3, historias: 'HU-17',
    detalle: 'Arqueo diario de la sucursal.' },
  { ruta: '/alertas', texto: 'Alertas de stock', roles: GERENCIA, sprint: 3, historias: 'HU-14',
    detalle: 'Avisos cuando un modelo o talla baja del mínimo.' },
  { ruta: '/panel', texto: 'Panel del dueño', roles: [ROLES.DUENO], sprint: 4, historias: 'HU-19 a HU-22',
    detalle: 'Tendencia estacional, retorno por marca, rotación y simulador de presupuesto.' },
  { ruta: '/usuarios', texto: 'Usuarios', roles: GERENCIA, sprint: null },
];
