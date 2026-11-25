// RF-22 / RN-13: el sistema NUNCA envía mensajes. Solo arma el enlace de WhatsApp con el texto prellenado
// y el empleado lo envía con un clic desde su propio WhatsApp.

/** Celular boliviano de 8 dígitos (6xxxxxxx / 7xxxxxxx) → "591XXXXXXXX". Devuelve null si no es válido. */
export function normalizarCelular(valor) {
  const d = String(valor ?? '').replace(/\D/g, '');
  if (/^[67]\d{7}$/.test(d)) return `591${d}`;
  if (/^591[67]\d{7}$/.test(d)) return d;
  return null;
}

const nombrePila = (n) => String(n ?? '').trim().split(/\s+/)[0] || 'cliente';

/** Plantillas predefinidas (el negocio puede ajustar el texto aquí). */
export const PLANTILLAS = {
  confirmado: {
    etiqueta: 'Pedido confirmado',
    texto: ({ nombre, pedido }) =>
      `Hola ${nombrePila(nombre)}, confirmamos tu pedido N.º ${pedido} en Sneakers. ¡Gracias por tu compra! Te avisaremos cuando esté listo.`,
  },
  rechazado: {
    etiqueta: 'Comprobante rechazado',
    texto: ({ nombre, pedido, motivo }) =>
      `Hola ${nombrePila(nombre)}, no pudimos validar el comprobante de tu pedido N.º ${pedido}${motivo ? ` (${motivo})` : ''}. Súbelo de nuevo desde "Mis pedidos" en nuestra tienda.`,
  },
  listo_retiro: {
    etiqueta: 'Listo para retiro',
    texto: ({ nombre, pedido }) =>
      `Hola ${nombrePila(nombre)}, tu pedido N.º ${pedido} ya está listo para retirar en la tienda Sneakers Tarija. ¡Te esperamos!`,
  },
  en_camino: {
    etiqueta: 'En camino',
    texto: ({ nombre, pedido, repartidor }) =>
      `Hola ${nombrePila(nombre)}, tu pedido N.º ${pedido} va en camino${repartidor ? ` con ${repartidor}` : ''}. Ten listo tu celular para recibirlo.`,
  },
  no_entregado: {
    etiqueta: 'No se pudo entregar',
    texto: ({ nombre, pedido }) =>
      `Hola ${nombrePila(nombre)}, no pudimos entregar tu pedido N.º ${pedido}. Responde este mensaje para coordinar una nueva entrega.`,
  },
};

/** Enlace wa.me con el mensaje prellenado, o null si el cliente no tiene un número válido (botón deshabilitado). */
export function enlaceWhatsApp(telefono, texto) {
  const n = normalizarCelular(telefono);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null;
}
