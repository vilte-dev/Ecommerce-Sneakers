import { supabase } from '../../lib/supabase.js';
import { stockPorModelos } from '../catalog/api.js';

/** Carga el carrito guardado en la BD (HU-07: persistencia) con lo necesario para mostrarlo. */
export async function cargarCarritoRemoto() {
  const { data, error } = await supabase
    .from('items_carrito')
    .select('modelo_id,talla,cantidad,modelos(id,nombre,color,precio,fotos,marcas(nombre))');
  if (error) throw error;
  const stock = await stockPorModelos([...new Set(data.map((i) => i.modelo_id))]);
  return data
    .filter((i) => i.modelos)
    .map((i) => ({
      modeloId: i.modelo_id,
      talla: i.talla,
      cantidad: i.cantidad,
      nombre: i.modelos.nombre,
      color: i.modelos.color,
      marca: i.modelos.marcas?.nombre ?? '',
      precio: Number(i.modelos.precio),
      foto: i.modelos.fotos?.[0] ?? null,
      stockMax: stock.find((s) => s.modelo_id === i.modelo_id && s.talla === i.talla)?.cantidad ?? 0,
    }))
    .filter((i) => i.stockMax > 0);
}

export async function guardarCarritoRemoto(items) {
  const { error } = await supabase.rpc('guardar_carrito', {
    p_items: items.map((i) => ({ modelo_id: i.modeloId, talla: i.talla, cantidad: i.cantidad })),
  });
  if (error) throw error;
}
