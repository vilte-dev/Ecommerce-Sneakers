// Iconos de trazo (24×24), sin dependencias. Decorativos: el texto vecino ya dice lo mismo.
const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false' };

export const IconoBolsa = (p) => <svg {...base} {...p}><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>;
export const IconoLupa = (p) => <svg {...base} width="18" height="18" {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const IconoCheck = (p) => <svg {...base} width="18" height="18" {...p}><path d="m5 12 5 5 9-10" /></svg>;
export const IconoFlecha = (p) => <svg {...base} width="18" height="18" {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const IconoCamion = (p) => <svg {...base} {...p}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></svg>;
export const IconoQr = (p) => <svg {...base} {...p}><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><path d="M14 14h3v3h-3zM20 14v6h-3" /></svg>;
export const IconoSello = (p) => <svg {...base} {...p}><path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3Z" /></svg>;
