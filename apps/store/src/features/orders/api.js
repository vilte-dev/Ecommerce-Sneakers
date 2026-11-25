import { supabase } from '../../lib/supabase.js';

const TIPOS = ['image/jpeg', 'image/png'];

/** HU-09 · cuentas bancarias activas, QR estático y costo de envío configurados por el negocio. */
export async function datosDePago() {
  const [cuentas, params] = await Promise.all([
    supabase.from('cuentas_pago').select('id,banco,titular,numero,tipo').eq('activo', true).order('id'),
    supabase.from('parametros').select('clave,valor').in('clave', ['qr_pago_url', 'costo_envio']),
  ]);
  if (cuentas.error) throw cuentas.error;
  if (params.error) throw params.error;
  const p = Object.fromEntries(params.data.map((r) => [r.clave, r.valor]));
  return { cuentas: cuentas.data, qr: p.qr_pago_url || null, costoEnvio: Number(p.costo_envio) || 0 };
}

/** HU-08 · el servidor recalcula precios y total; aquí solo se envía qué y cuánto. */
export async function crearPedido({ items, metodo, direccion, telefono, contraEntrega }) {
  const { data, error } = await supabase.rpc('crear_pedido', {
    p_items: items.map((i) => ({ modelo_id: i.modeloId, talla: i.talla, cantidad: i.cantidad })),
    p_metodo: metodo,
    p_direccion: direccion || null,
    p_telefono: telefono || null,
    p_contra_entrega: contraEntrega || null,
  });
  if (error) throw error;
  return data;
}

/** HU-18 · avance del cliente hacia su descuento: { compras, cada, faltan, descuento_pct, porcentaje } (null si no hay perfil). */
export async function miFidelidad() {
  const { data, error } = await supabase.rpc('mi_fidelidad');
  if (error) throw error;
  return data;
}

export async function listarMisPedidos() {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id,fecha,estado,total,metodo_despacho,pago_contra_entrega')
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}

export async function obtenerPedido(id) {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`*,
      detalle_pedido(id,talla,cantidad,precio_unitario,modelos(id,nombre,color,fotos,marcas(nombre))),
      comprobantes_pago(id,estado,motivo_rechazo,fecha_carga),
      despachos(estado,motivo,actualizado_en)`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function validarImagen(archivo) {
  if (!archivo) return 'Elige una imagen de tu comprobante.';
  if (!TIPOS.includes(archivo.type)) return 'Formato no admitido. Sube una imagen JPG o PNG.';
  if (archivo.size > 15 * 1024 * 1024) return 'La imagen es demasiado pesada (máximo 15 MB).';
  return null;
}

/** HU-10 · comprime la foto, la sube a la carpeta privada del cliente y la asocia al pedido. */
export async function subirComprobante(pedidoId, userId, archivo) {
  const { default: imageCompression } = await import('browser-image-compression');
  const comprimida = await imageCompression(archivo, { maxSizeMB: 0.6, maxWidthOrHeight: 1600, useWebWorker: true });
  const ext = archivo.type === 'image/png' ? 'png' : 'jpg';
  const ruta = `${userId}/${pedidoId}-${Date.now()}.${ext}`;
  const { error: errSubida } = await supabase.storage.from('comprobantes').upload(ruta, comprimida, { contentType: archivo.type });
  if (errSubida) throw errSubida;
  const { error } = await supabase.rpc('registrar_comprobante', { p_pedido: pedidoId, p_ruta: ruta });
  if (error) throw error;
}

export async function cancelarPedido(id) {
  const { error } = await supabase.rpc('cancelar_pedido', { p_pedido: id });
  if (error) throw error;
}
