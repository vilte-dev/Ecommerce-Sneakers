import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { formatBs, mensajeError } from '@sneakers/shared';
import { anularVenta, datosNegocio, obtenerVenta } from '../features/caja/api.js';
import Comprobante from '../components/Comprobante.jsx';
import BloqueoCaja from '../components/BloqueoCaja.jsx';
import { useConexion } from '../lib/ConexionContext.jsx';

// HU-16 · Comprobante de venta no fiscal: se imprime en tiquetera (80 mm) o se guarda como PDF desde el diálogo de impresión.
export default function VentaDetalle() {
  const { id } = useParams();
  const { state } = useLocation();
  const { enLinea } = useConexion();
  const [venta, setVenta] = useState(undefined);
  const [negocio, setNegocio] = useState({ nombre: 'Sneakers', direccion: '', telefono: '' });
  const [error, setError] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [confirmar, setConfirmar] = useState(false);

  const cargar = () => obtenerVenta(Number(id)).then(setVenta).catch((e) => { setError(mensajeError(e)); setVenta(null); });
  useEffect(() => { cargar(); datosNegocio().then(setNegocio); /* eslint-disable-next-line */ }, [id]);

  async function anular(e) {
    e.preventDefault(); setError('');
    if (!confirmar) return setConfirmar(true);          // IU-05: confirmar antes de una acción irreversible
    setAnulando(true);
    try { await anularVenta(venta.id, motivo); setConfirmar(false); setMotivo(''); await cargar(); }
    catch (err) { setError(mensajeError(err)); setConfirmar(false); } finally { setAnulando(false); }
  }

  if (venta === undefined) return <div className="cargando" style={{ height: 240 }} aria-label="Cargando" />;
  if (!venta) return <div className="pila"><p className="aviso aviso--error">{error || 'No encontramos esa venta.'}</p><Link className="btn" to="/ventas">Volver a ventas</Link></div>;

  const puedeAnular = !venta.anulada && !venta.cierre_id;
  return (
    <div className="pila" style={{ maxWidth: 520 }}>
      <BloqueoCaja />
      <div className="no-imprimir pila">
        {state?.nueva && <p className="aviso aviso--ok" role="status">Venta registrada: {formatBs(venta.total)}. El stock ya se descontó.</p>}
        <div className="fila">
          <button className="btn btn--primario" onClick={() => window.print()}>Imprimir / guardar PDF</button>
          <Link className="btn" to="/pos">Nueva venta</Link>
          <Link className="btn" to="/ventas">Ventas del día</Link>
        </div>
        {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      </div>

      <Comprobante venta={venta} negocio={negocio} />

      {puedeAnular && (
        <form className="tarjeta pila no-imprimir" onSubmit={anular}>
          <h3>Anular esta venta</h3>
          <p className="ayuda">La venta no se borra: queda registrada como anulada, el stock se repone y se descuenta de la fidelidad. Solo antes del cierre de caja.</p>
          <div className="campo"><label htmlFor="motivo">Motivo</label><input id="motivo" className="entrada" required minLength={3} maxLength={120} value={motivo} onChange={(e) => { setMotivo(e.target.value); setConfirmar(false); }} /></div>
          {confirmar && <p className="aviso aviso--error" role="alert">¿Seguro? Esta acción no se puede deshacer. Pulsa de nuevo para confirmar.</p>}
          <button className="btn btn--peligro" disabled={anulando || !enLinea}>{confirmar ? 'Sí, anular venta' : 'Anular venta'}</button>
        </form>
      )}
      {venta.anulada && <p className="aviso aviso--error no-imprimir">Venta anulada: {venta.motivo_anulacion}</p>}
      {venta.cierre_id && !venta.anulada && <p className="tenue chico no-imprimir">Esta venta ya está incluida en un cierre de caja.</p>}
    </div>
  );
}
