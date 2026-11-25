import { formatBs, etiquetaFormaPago, fechaHoraBolivia } from '@sneakers/shared';

/** RF-18 · comprobante NO fiscal, legible en pantalla y en tiquetera térmica de 80 mm. Importes en Bs. */
export default function Comprobante({ venta, negocio }) {
  const cli = venta.clientes;
  const comp = venta.comprobantes_venta?.[0] ?? venta.comprobantes_venta;
  return (
    <article className="comprobante" aria-label={`Comprobante ${venta.numero}`}>
      <header className="comprobante__cab">
        <strong className="comprobante__negocio">{negocio.nombre}</strong>
        {negocio.direccion && <div>{negocio.direccion}</div>}
        {negocio.telefono && <div>Tel. {negocio.telefono}</div>}
        <div className="comprobante__titulo">COMPROBANTE DE VENTA</div>
        <div>N.º {comp?.numero ?? venta.numero}</div>
        {venta.anulada && <div className="comprobante__anulada">*** VENTA ANULADA ***</div>}
      </header>
      <div className="comprobante__datos">
        <div>Fecha: {fechaHoraBolivia(venta.fecha)}</div>
        <div>Atendió: {venta.usuarios?.nombre}</div>
        {cli && <div>Cliente: {cli.nombre || cli.usuarios?.nombre || `Cel. ${cli.celular}`}</div>}
      </div>
      <table className="comprobante__tabla">
        <thead><tr><th>Cant.</th><th>Descripción</th><th>Importe</th></tr></thead>
        <tbody>
          {venta.detalle_venta.map((d) => (
            <tr key={d.id}>
              <td>{d.cantidad}</td>
              <td>{d.modelos?.marcas?.nombre} {d.modelos?.nombre} {d.modelos?.color} · T{d.talla}<div className="comprobante__unit">{formatBs(d.precio_unitario)} c/u</div></td>
              <td>{formatBs(d.cantidad * d.precio_unitario)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="comprobante__totales">
        <div><span>Subtotal</span><span>{formatBs(venta.subtotal)}</span></div>
        {Number(venta.descuento) > 0 && <div><span>Descuento fidelidad</span><span>−{formatBs(venta.descuento)}</span></div>}
        <div className="comprobante__total"><span>TOTAL</span><span>{formatBs(venta.total)}</span></div>
        <div><span>Forma de pago</span><span>{etiquetaFormaPago(venta.forma_pago)}</span></div>
      </div>
      <footer className="comprobante__pie">
        <strong>{comp?.leyenda ?? 'Documento no válido como factura'}</strong>
        <div>¡Gracias por tu compra!</div>
      </footer>
    </article>
  );
}
