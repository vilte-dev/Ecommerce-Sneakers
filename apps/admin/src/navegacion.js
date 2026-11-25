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
  { ruta: '/pos', texto: 'Punto de venta', roles: OPERADORES, sprint: null },
  { ruta: '/ventas', texto: 'Ventas en caja', roles: OPERADORES, sprint: null },
  { ruta: '/caja', texto: 'Cierre de caja', roles: OPERADORES, sprint: null },
  { ruta: '/alertas', texto: 'Alertas de stock', roles: GERENCIA, sprint: null },
  { ruta: '/panel', texto: 'Panel del dueño', roles: [ROLES.DUENO], sprint: 4, historias: 'HU-19 a HU-22',
    detalle: 'Tendencia estacional, retorno por marca, rotación y simulador de presupuesto.' },
  { ruta: '/usuarios', texto: 'Usuarios', roles: GERENCIA, sprint: null },
];
