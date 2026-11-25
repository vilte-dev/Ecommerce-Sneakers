import { supabase } from '../../lib/supabase.js';

const rpc = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
};

/** POS · todas las existencias con los datos del modelo. Se filtra en el navegador para responder al instante. */
export async function cargarCatalogoPos() {
  const { data, error } = await supabase
    .from('stock')
    .select('id,talla,cantidad,modelo_id,modelos(id,nombre,color,precio,fotos,activo,marcas(nombre,activo))')
    .order('talla');
  if (error) throw error;
  const porModelo = new Map();
  for (const r of data) {
    const m = r.modelos;
    if (!m?.activo || !m.marcas?.activo) continue;
    if (!porModelo.has(m.id)) porModelo.set(m.id, { id: m.id, nombre: m.nombre, color: m.color, precio: Number(m.precio), foto: m.fotos?.[0] ?? null, marca: m.marcas.nombre, tallas: new Map() });
    const g = porModelo.get(m.id);
    g.tallas.set(r.talla, (g.tallas.get(r.talla) ?? 0) + r.cantidad);
  }
  return [...porModelo.values()]
    .map((g) => ({ ...g, tallas: [...g.tallas].map(([talla, cantidad]) => ({ talla, cantidad })).sort((a, b) => a.talla - b.talla) }))
    .sort((a, b) => `${a.marca} ${a.nombre}`.localeCompare(`${b.marca} ${b.nombre}`, 'es'));
}

export const consultarCliente = ({ ci, celular }) => rpc('consultar_cliente', { p_ci: ci || null, p_celular: celular || null });

/** HU-15 · `clave` identifica el intento: si se corta internet y se reintenta, la venta no se duplica (HU-24). */
export const registrarVenta = ({ lineas, forma, ci, celular, nombre, clave }) =>
  rpc('registrar_venta_caja', {
    p_items: lineas.map((l) => ({ modelo_id: l.modeloId, talla: l.talla, cantidad: l.cantidad })),
    p_forma_pago: forma, p_ci: ci || null, p_celular: celular || null, p_nombre: nombre || null, p_clave: clave,
  });

export const anularVenta = (id, motivo) => rpc('anular_venta', { p_venta: id, p_motivo: motivo });

export async function obtenerVenta(id) {
  const { data, error } = await supabase
    .from('ventas')
    .select(`id,numero,fecha,canal,forma_pago,subtotal,descuento,total,anulada,motivo_anulacion,cierre_id,
      usuarios(nombre), clientes(celular,ci,nombre,usuarios(nombre)),
      detalle_venta(id,talla,cantidad,precio_unitario,modelos(nombre,color,marcas(nombre))),
      comprobantes_venta(numero,fecha_emision,leyenda)`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listarVentas(desdeIso, hastaIso) {
  const { data, error } = await supabase
    .from('ventas')
    .select('id,numero,fecha,forma_pago,total,descuento,anulada,cierre_id,usuarios(nombre),clientes(celular,nombre)')
    .eq('canal', 'caja').gte('fecha', desdeIso).lt('fecha', hastaIso)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}

export async function datosNegocio() {
  const { data } = await supabase.from('parametros').select('clave,valor').in('clave', ['negocio_nombre', 'negocio_direccion', 'negocio_telefono']);
  const p = Object.fromEntries((data ?? []).map((r) => [r.clave, r.valor]));
  return { nombre: p.negocio_nombre || 'Sneakers', direccion: p.negocio_direccion || '', telefono: p.negocio_telefono || '' };
}

export const vistaPreviaCierre = () => rpc('vista_previa_cierre');
export const cerrarCaja = (contado) => rpc('cerrar_caja', { p_efectivo_contado: contado });

export async function listarCierres() {
  const { data, error } = await supabase
    .from('cierres_caja')
    .select('id,fecha,creado_en,efectivo_contado,total_esperado,diferencia,detalle,usuarios(nombre)')
    .order('creado_en', { ascending: false }).limit(30);
  if (error) throw error;
  return data;
}

/** Ventas de caja de días anteriores que siguen sin cerrar (aviso en la pantalla de cierre). */
export async function ventasPendientesAntiguas(hoyIso) {
  const { count, error } = await supabase.from('ventas').select('id', { count: 'exact', head: true })
    .eq('canal', 'caja').eq('anulada', false).is('cierre_id', null).lt('fecha', hoyIso);
  if (error) throw error;
  return count ?? 0;
}
