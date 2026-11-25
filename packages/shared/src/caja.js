// Sprint 3 · lógica pura del punto de venta y la caja (sin dependencias de React ni de Supabase).

/** Código visible de un modelo en el POS: M0012. Se puede buscar escribiendo "M0012", "12" o el nombre. */
export const codigoModelo = (id) => `M${String(id).padStart(4, '0')}`;

const sinTildes = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** RF-15: busca por código o por nombre/marca/color, sin importar tildes ni mayúsculas. Todas las palabras deben coincidir. */
export function coincideBusqueda(modelo, texto) {
  const q = sinTildes(texto).trim();
  if (!q) return true;
  const codigo = codigoModelo(modelo.id).toLowerCase();
  if (q === codigo || q === String(modelo.id)) return true;
  const campo = sinTildes(`${codigo} ${modelo.marca} ${modelo.nombre} ${modelo.color}`);
  return q.split(/\s+/).every((p) => campo.includes(p));
}

const aCentavos = (n) => Math.round(Number(n) * 100);

/** Subtotal, descuento de fidelidad y total en Bs. Redondea igual que la BD (round(x, 2)). */
export function calcularTotales(lineas, porcentajeDescuento = 0) {
  const sub = lineas.reduce((n, l) => n + aCentavos(l.precio) * l.cantidad, 0);
  const desc = porcentajeDescuento > 0 ? Math.round((sub * porcentajeDescuento) / 100) : 0;
  return { subtotal: sub / 100, descuento: desc / 100, total: (sub - desc) / 100, unidades: lineas.reduce((n, l) => n + l.cantidad, 0) };
}

/** Agrega una unidad de modelo+talla al carrito del POS sin superar el stock. Devuelve un carrito nuevo. */
export function agregarLinea(lineas, nuevo) {
  const i = lineas.findIndex((l) => l.modeloId === nuevo.modeloId && l.talla === nuevo.talla);
  if (i < 0) return nuevo.stock >= 1 ? [...lineas, { ...nuevo, cantidad: 1 }] : lineas;
  return lineas.map((l, k) => (k === i ? { ...l, stock: nuevo.stock, cantidad: Math.min(l.cantidad + 1, nuevo.stock) } : l));
}

export function cambiarCantidadLinea(lineas, modeloId, talla, cantidad) {
  if (cantidad < 1) return lineas.filter((l) => !(l.modeloId === modeloId && l.talla === talla));
  return lineas.map((l) => (l.modeloId === modeloId && l.talla === talla ? { ...l, cantidad: Math.min(cantidad, l.stock) } : l));
}

export const FORMAS_PAGO = { efectivo: 'Efectivo', transferencia: 'Transferencia', qr: 'QR' };
export const etiquetaFormaPago = (f) => FORMAS_PAGO[f] ?? f;

/** Resultado del arqueo: diferencia = contado − esperado (RF-19). */
export function resultadoArqueo(contado, esperado) {
  const dif = Math.round((Number(contado) - Number(esperado)) * 100) / 100;
  if (dif === 0) return { dif, texto: 'La caja cuadra', clase: 'aviso--ok' };
  return dif > 0 ? { dif, texto: 'Sobra dinero', clase: 'aviso--info' } : { dif, texto: 'Falta dinero', clase: 'aviso--error' };
}

/** Fecha de hoy (AAAA-MM-DD) en la hora de Bolivia, sin importar la zona del equipo. */
export const hoyBolivia = (ahora = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(ahora);

/** Fecha y hora legibles en hora de Bolivia. */
export const fechaHoraBolivia = (iso) =>
  new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

/**
 * HU-24 / RNF-13 · monitor de conexión. Pregunta al servidor cada `intervaloMs` y avisa solo cuando CAMBIA el estado.
 * Cualquier fallo del ping congela la caja de inmediato; al primer éxito se reanuda.
 * `ping` y los temporizadores se inyectan para poder probarlo sin red.
 */
export function crearMonitorConexion({ ping, alCambiar, intervaloMs = 8000, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let enLinea = true; let temporizador = null; let activo = false; let revisando = false;
  const fijar = (valor) => { if (valor !== enLinea) { enLinea = valor; alCambiar(valor); } };
  async function revisar() {
    if (revisando) return enLinea;
    revisando = true;
    try { await ping(); fijar(true); } catch { fijar(false); } finally { revisando = false; }
    return enLinea;
  }
  const programar = () => { if (activo) temporizador = setTimer(async () => { await revisar(); programar(); }, intervaloMs); };
  return {
    iniciar() { activo = true; revisar(); programar(); },
    detener() { activo = false; clearTimer(temporizador); },
    revisar,
    /** El navegador avisó (evento online/offline) o una operación falló por red. */
    reportar: fijar,
    get enLinea() { return enLinea; },
  };
}
