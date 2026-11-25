/** HU-UI-07 · Tarjeta de sellos del programa de fidelidad (HU-18): un sello por compra del ciclo. */
export default function FidelidadBarra({ fid }) {
  const pct = Number(fid.descuento_pct) || 0;
  const activa = pct > 0;
  const ciclo = Number(fid.cada) || 10;
  const llenos = activa ? ciclo : Number(fid.compras) % ciclo;
  return (
    <section className={`fidelidad${activa ? ' fidelidad--activa' : ''}`} aria-label="Programa de fidelidad">
      <h2 className="fidelidad__titulo">{activa ? `¡Tienes ${pct} % de descuento!` : 'Programa de fidelidad'}</h2>
      <div className="fidelidad__sellos" style={{ gridTemplateColumns: `repeat(${ciclo}, 1fr)` }} role="img" aria-label={`${llenos} de ${ciclo} compras`}>
        {Array.from({ length: ciclo }, (_, i) => <span key={i} className={`fidelidad__sello${i < llenos ? ' fidelidad__sello--lleno' : ''}`} />)}
      </div>
      <p>
        {activa
          ? 'Se aplica automáticamente en tu próximo pedido, en la web o en la tienda.'
          : <>Llevas {llenos} de {ciclo} compras. Te falta{fid.faltan === 1 ? '' : 'n'} {fid.faltan} para ganar {Number(fid.porcentaje)} % de descuento en tu siguiente compra.</>}
      </p>
    </section>
  );
}
