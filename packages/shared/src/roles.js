export const ROLES = { CLIENTE: 'cliente', EMPLEADO: 'empleado', DUENO: 'dueno', ADMIN: 'administrador' };
export const STAFF = [ROLES.EMPLEADO, ROLES.DUENO, ROLES.ADMIN];
export const GERENCIA = [ROLES.DUENO, ROLES.ADMIN];
// Matriz de permisos B.3: validan pedidos, despachan y avisan por WhatsApp el Empleado y el Dueño (no el Administrador).
export const OPERADORES = [ROLES.EMPLEADO, ROLES.DUENO];
