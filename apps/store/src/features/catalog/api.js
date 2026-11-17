import { supabase } from '../../lib/supabase.js';

export const POR_PAGINA = 12;

export async function listarOpciones() {
  const [marcas, categorias, colores] = await Promise.all([
    supabase.from('marcas').select('id,nombre').eq('activo', true).order('nombre'),
    supabase.from('categorias').select('id,nombre,talla_min,talla_max').order('talla_min'),
    supabase.from('catalogo').select('color'),
  ]);
  for (const r of [marcas, categorias, colores]) if (r.error) throw r.error;
  return {
    marcas: marcas.data,
    categorias: categorias.data,
    colores: [...new Set(colores.data.map((c) => c.color))].sort(),
  };
}

/** RF-05: filtros por categoría, marca, color, precio y disponibilidad. */
export async function listarCatalogo(f, pagina = 0) {
  let q = supabase
    .from('catalogo')
    .select('*', { count: 'exact' })
    .order('id', { ascending: false })
    .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);
  if (f.categoria) q = q.eq('categoria_id', Number(f.categoria));
  if (f.marca) q = q.eq('marca_id', Number(f.marca));
  if (f.color) q = q.eq('color', f.color);
  if (f.min) q = q.gte('precio', Number(f.min));
  if (f.max) q = q.lte('precio', Number(f.max));
  if (f.disp) q = q.gt('stock_total', 0);
  if (f.q) q = q.ilike('nombre', `%${f.q.replace(/[%,]/g, ' ').trim()}%`);
  const { data, count, error } = await q;
  if (error) throw error;
  return { data, count: count ?? 0 };
}

export async function obtenerModelo(id) {
  const [modelo, tallas] = await Promise.all([
    supabase.from('catalogo').select('*').eq('id', id).maybeSingle(),
    supabase.from('catalogo_tallas').select('talla,cantidad').eq('modelo_id', id).order('talla'),
  ]);
  if (modelo.error) throw modelo.error;
  if (tallas.error) throw tallas.error;
  return { modelo: modelo.data, tallas: tallas.data };
}

export async function stockPorModelos(ids) {
  if (!ids.length) return [];
  const { data, error } = await supabase.from('catalogo_tallas').select('modelo_id,talla,cantidad').in('modelo_id', ids);
  if (error) throw error;
  return data;
}
