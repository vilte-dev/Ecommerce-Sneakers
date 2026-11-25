import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { etiquetaFormaPago, fechaHoraBolivia, formatBs, hoyBolivia, mensajeError } from '@sneakers/shared';
import { listarVentas } from '../features/caja/api.js';

// Ventas de caja de un día (hora de Bolivia). Permite reimprimir el comprobante (RF-18) y ver cuáles siguen sin cerrar.
const limites = (dia) => {
  const sig = new Date(`${dia}T12:00:00Z`); sig.setUTCDate(sig.getUTCDate() + 1);
  return [`${dia}T00:00:00-04:00`, `${sig.toISOString().slice(0, 10)}T00:00:00-04:00`];
};

export default function Ventas() {
  const [dia, setDia] = useState(hoyBolivia());
  const [ventas, setVentas] = useState(null);
  const [error, setError] = useState('');
  const cargar = useCallback(() => {
    setVentas(null);
    listarVentas(...limites(dia)).then((d) => { setVentas(d); setError(''); }).catch((e) => setError(mensajeError(e)));
  }, [dia]);
  useEffect(() => { cargar(); }, [cargar]);

  const kpi = useMemo(() => {
    const ok = (ventas ?? []).filter((v) => !v.anulada);
    const suma = (f) => ok.filter((v) => !f || v.forma_pago === f).reduce((n, v) => n + Number(v.total), 0);
    return { n: ok.length, total: suma(), efectivo: suma('efectivo'), qr: suma('qr') };
  }, [ventas]);

  return (
    <div className="pila">
      <div className="fila fila--entre">
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Ventas en caja</h1>
        <Link className="btn btn--primario" to="/pos">Nueva venta</Link>
      </div>
      <div className="campo" style={{ maxWidth: 200 }}><label htmlFor="dia">Día</label><input id="dia" className="entrada" type="date" value={dia} max={hoyBolivia()} onChange={(e) => e.target.value && setDia(e.target.value)} /></div>
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      {!ventas && !error && <div className="cargando" style={{ height: 120 }} />}
      {ventas && (
        <>
          <div className="indicadores">
            <div className="tarjeta indicador"><span className="tenue chico">Ventas</span><strong>{kpi.n}</strong></div>
            <div className="tarjeta indicador"><span className="tenue chico">Total</span><strong>{formatBs(kpi.total)}</strong></div>
            <div className="tarjeta indicador"><span className="tenue chico">Efectivo</span><strong>{formatBs(kpi.efectivo)}</strong></div>
            <div className="tarjeta indicador"><span className="tenue chico">QR</span><strong>{formatBs(kpi.qr)}</strong></div>
          </div>
          <div className="tabla-envoltura"><table className="tabla">
            <thead><tr><th>N.º</th><th>Hora</th><th>Atendió</th><th>Cliente</th><th>Pago</th><th>Total</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {ventas.length === 0 && <tr><td colSpan="8" className="tenue">No hay ventas este día.</td></tr>}
              {ventas.map((v) => (
                <tr key={v.id}>
                  <td><strong>{v.numero}</strong></td><td>{fechaHoraBolivia(v.fecha)}</td>
                  <td>{v.usuarios?.nombre}</td>
                  <td>{v.clientes ? v.clientes.nombre || `Cel. ${v.clientes.celular}` : <span className="tenue">—</span>}</td>
                  <td>{etiquetaFormaPago(v.forma_pago)}</td>
                  <td>{formatBs(v.total)}{Number(v.descuento) > 0 && <span className="insignia insignia--ok" style={{ marginLeft: '.4rem' }}>−5 %</span>}</td>
                  <td>{v.anulada ? <span className="insignia insignia--aji">Anulada</span> : v.cierre_id ? <span className="insignia">Cerrada</span> : <span className="insignia insignia--aviso">Sin cerrar</span>}</td>
                  <td><Link className="btn btn--chico" to={`/ventas/${v.id}`}>Comprobante</Link></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}
    </div>
  );
}
