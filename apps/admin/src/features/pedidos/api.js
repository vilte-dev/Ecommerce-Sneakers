import { supabase } from '../../lib/supabase.js';

const EMBEBIDO_CLIENTE = 'clientes(id,celular,correo,usuarios(nombre))';

export async function listarPedidos() {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`id,fecha,estado,total,metodo_despacho,pago_contra_entrega,${EMBEBIDO_CLIENTE}`)
    .order('fecha', { ascending: false })
    .limit(300);
  if (error) throw error;
  return data;
}

/** Cuenta los pedidos que esperan acción del empleado: comprobantes por validar y contra entrega por confirmar. */
export async function contarPorValidar() {
  const [a, b] = await Promise.all([
    supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('estado', 'en_revision'),
    supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente_pago').not('pago_contra_entrega', 'is', null),
  ]);
  if (a.error || b.error) throw a.error ?? b.error;
  return (a.count ?? 0) + (b.count ?? 0);
}

export async function obtenerPedido(id) {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`*, ${EMBEBIDO_CLIENTE},
      detalle_pedido(id,talla,cantidad,precio_unitario,modelos(nombre,color,marcas(nombre))),
      comprobantes_pago(id,imagen_url,estado,motivo_rechazo,fecha_carga),
      despachos(id,estado,motivo,actualizado_en,repartidor_id,repartidores(nombre,telefono),despacho_historial(id,estado,motivo,fecha,usuarios(nombre)))`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Los comprobantes están en un bucket privado: se leen con un enlace firmado de 5 minutos. */
export async function urlComprobante(ruta) {
  const { data, error } = await supabase.storage.from('comprobantes').createSignedUrl(ruta, 300);
  if (error) throw error;
  return data.signedUrl;
}

export async function listarRepartidores() {
  const { data, error } = await supabase.from('repartidores').select('id,nombre,telefono').order('nombre');
  if (error) throw error;
  return data;
}
export async function crearRepartidor(nombre, telefono) {
  const { data, error } = await supabase.from('repartidores').insert({ nombre: nombre.trim(), telefono: telefono?.trim() || null }).select('id').single();
  if (error) throw error;
  return data.id;
}

const rpc = async (fn, args) => {
  const { error } = await supabase.rpc(fn, args);
  if (error) throw error;
};
export const confirmarPedido = (id) => rpc('confirmar_pedido', { p_pedido: id });
export const rechazarComprobante = (id, motivo) => rpc('rechazar_comprobante', { p_pedido: id, p_motivo: motivo });
export const cancelarPedido = (id) => rpc('cancelar_pedido', { p_pedido: id });
export const marcarListoRetiro = (id) => rpc('marcar_listo_retiro', { p_pedido: id });
export const marcarRetirado = (id) => rpc('marcar_retirado', { p_pedido: id });
export const asignarDespacho = (id, repartidor) => rpc('asignar_despacho', { p_pedido: id, p_repartidor: repartidor });
export const actualizarDespacho = (id, estado, motivo) => rpc('actualizar_despacho', { p_pedido: id, p_estado: estado, p_motivo: motivo || null });
