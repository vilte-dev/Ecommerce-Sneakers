const bs = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' });
/** RNF-10: todo importe se muestra en bolivianos. */
export const formatBs = (n) => bs.format(Number(n) || 0);
