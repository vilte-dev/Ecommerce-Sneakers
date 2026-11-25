import { supabase } from '../../lib/supabase.js';

const SELECT = 'id,fecha,cantidad_actual,atendida,atendida_en,stock(id,talla,cantidad,umbral_minimo,modelo_id,modelos(nombre,color,marcas(nombre)))';

export async function listarAlertas(atendidas = false) {
  let q = supabase.from('alertas_stock').select(SELECT);
  q = atendidas ? q.eq('atendida', true).order('atendida_en', { ascending: false }).limit(40) : q.eq('atendida', false).order('fecha');
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function contarAlertas() {
  const { count, error } = await supabase.from('alertas_stock').select('id', { count: 'exact', head: true }).eq('atendida', false);
  if (error) throw error;
  return count ?? 0;
}

export async function atenderAlerta(id) {
  const { error } = await supabase.rpc('atender_alerta', { p_alerta: id });
  if (error) throw error;
}

export async function listarStockModelo(modeloId) {
  const { data, error } = await supabase.from('stock').select('id,talla,cantidad,umbral_minimo').eq('modelo_id', modeloId).order('talla');
  if (error) throw error;
  return data;
}

export async function listarModelosActivos() {
  const { data, error } = await supabase.from('modelos').select('id,nombre,color,marcas(nombre)').eq('activo', true).order('nombre');
  if (error) throw error;
  return data;
}

/** RF-14 · el administrador define el mínimo por modelo/talla (entero ≥ 0). */
export async function guardarUmbrales(cambios) {
  for (const { id, umbral } of cambios) {
    const { error } = await supabase.from('stock').update({ umbral_minimo: umbral }).eq('id', id);
    if (error) throw error;
  }
}
