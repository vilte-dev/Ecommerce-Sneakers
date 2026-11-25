// Estados del pedido web (SRS B.2). En la BD "pagado" significa "Confirmado" (pago validado y stock descontado).
const ESTADOS = {
  pendiente_pago: { texto: 'Pendiente de pago', clase: 'insignia--aviso' },
  en_revision: { texto: 'Comprobante en revisión', clase: 'insignia--aviso' },
  pagado: { texto: 'Confirmado', clase: 'insignia--ok' },
  listo_retiro: { texto: 'Listo para retiro', clase: 'insignia--ok' },
  en_despacho: { texto: 'En despacho', clase: 'insignia--ok' },
  entregado: { texto: 'Entregado', clase: 'insignia--ok' },
  cancelado: { texto: 'Cancelado', clase: 'insignia--aji' },
};

/** Texto e insignia del estado. Un pedido contra entrega aún sin confirmar se muestra "Por confirmar". */
export function estadoPedido(pedido) {
  if (pedido.estado === 'pendiente_pago' && pedido.pago_contra_entrega) {
    return { texto: 'Por confirmar', clase: 'insignia--aviso' };
  }
  return ESTADOS[pedido.estado] ?? { texto: pedido.estado, clase: '' };
}

export const ESTADOS_DESPACHO = {
  asignado: 'Asignado',
  en_camino: 'En camino',
  entregado: 'Entregado',
  no_entregado: 'No entregado',
};

export const etiquetaDespacho = (pedido) => (pedido.metodo_despacho === 'domicilio' ? 'Envío a domicilio en Tarija' : 'Retiro en tienda');

export const etiquetaPagoContraEntrega = (v) => (v === 'qr' ? 'QR al recibir' : v === 'efectivo' ? 'Efectivo al recibir' : 'Transferencia o QR (pago anticipado)');

/** Pasos que ve el cliente en el seguimiento de su pedido. */
export function pasosPedido(pedido) {
  const anticipado = !pedido.pago_contra_entrega;
  const final = pedido.metodo_despacho === 'domicilio' ? ['en_despacho', 'entregado'] : ['listo_retiro', 'entregado'];
  const pasos = [
    ...(anticipado ? [['pendiente_pago', 'Pago pendiente'], ['en_revision', 'Comprobante en revisión']] : [['pendiente_pago', 'Por confirmar']]),
    ['pagado', 'Confirmado'],
    [final[0], pedido.metodo_despacho === 'domicilio' ? 'En despacho' : 'Listo para retiro'],
    [final[1], pedido.metodo_despacho === 'domicilio' ? 'Entregado' : 'Retirado'],
  ];
  const orden = pasos.map(([k]) => k);
  const actual = orden.indexOf(pedido.estado);
  return pasos.map(([clave, texto], i) => ({ clave, texto, hecho: actual >= 0 && i <= actual, actual: i === actual }));
}
