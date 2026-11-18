// RF-06 (ISO 9407): el rango real viene de la tabla categorias { talla_min, talla_max | null }.
const TOPE_VISUAL_ADULTO = 48; // solo para armar selectores; la BD no tiene tope

export function tallaEnRango(talla, { talla_min, talla_max }) {
  return talla >= talla_min && (talla_max == null || talla <= talla_max);
}
export function rangoTallas({ talla_min, talla_max }) {
  const fin = talla_max ?? TOPE_VISUAL_ADULTO;
  return Array.from({ length: fin - talla_min + 1 }, (_, i) => talla_min + i);
}
export function etiquetaRango({ talla_min, talla_max }) {
  return talla_max == null ? `${talla_min} en adelante` : `${talla_min} a ${talla_max}`;
}
