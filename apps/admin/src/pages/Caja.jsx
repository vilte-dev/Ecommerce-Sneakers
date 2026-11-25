import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fechaHoraBolivia, formatBs, hoyBolivia, mensajeError, resultadoArqueo } from '@sneakers/shared';
import { cerrarCaja, listarCierres, vistaPreviaCierre, ventasPendientesAntiguas } from '../features/caja/api.js';
import { useConexion } from '../lib/ConexionContext.jsx';
import BloqueoCaja from '../components/BloqueoCaja.jsx';

// HU-17 · Cierre de caja: cada empleado cuenta su efectivo al terminar su jornada (RN-14).
// El cierre queda guardado e inalterable (RN-09); no se puede cerrar dos veces lo mismo.
export default function Caja() {
  const { enLinea } = useConexion();
  const [prev, setPrev] = useState(null);
  const [cierres, setCierres] = useState(null);
  const [antiguas, setAntiguas] = useState(0);
  const [contado, setContado] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [p, c, a] = await Promise.all([vistaPreviaCierre(), listarCierres(), ventasPendientesAntiguas(`${hoyBolivia()}T00:00:00-04:00`)]);
      setPrev(p); setCierres(c); setAntiguas(a); setError('');
    } catch (e) { setError(mensajeError(e)); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const esperado = Number(prev?.efectivo ?? 0);
  const valido = contado !== '' && Number(contado) >= 0 && !Number.isNaN(Number(contado));
  const arqueo = valido ? resultadoArqueo(contado, esperado) : null;

  async function cerrar(e) {
    e.preventDefault(); setError('');
    if (!valido) return setError('Escribe el efectivo contado (0 o más).');
    if (!confirmar) return setConfirmar(true);          // IU-05
    setCerrando(true);
    try {
      await cerrarCaja(Number(contado));
      setResultado({ contado: Number(contado), esperado, qr: Number(prev.qr), n: prev.num_ventas, ...resultadoArqueo(contado, esperado) });
      setContado(''); setConfirmar(false); await cargar();
    } catch (err) { setError(mensajeError(err)); setConfirmar(false); } finally { setCerrando(false); }
  }

  const hayVentas = (prev?.num_ventas ?? 0) > 0;
  return (
    <div className="pila" style={{ maxWidth: 820 }}>
      <BloqueoCaja />
      <h1 style={{ fontSize: '2rem' }}>Cierre de caja</h1>
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      {antiguas > 0 && <p className="aviso aviso--info">Hay {antiguas} venta(s) de días anteriores sin cerrar: entrarán en este cierre.</p>}

      {resultado && (
        <section className={`aviso ${resultado.clase} pila`} role="status">
          <strong>Caja cerrada · {resultado.texto}</strong>
          <span>{resultado.n} venta(s). Esperado en efectivo {formatBs(resultado.esperado)}, contado {formatBs(resultado.contado)}, diferencia {formatBs(resultado.dif)}. QR registrado: {formatBs(resultado.qr)}.</span>
        </section>
      )}

      {!prev && !error && <div className="cargando" style={{ height: 140 }} />}
      {prev && !hayVentas && <p className="aviso aviso--info">No tienes ventas por cerrar. <Link to="/pos">Ir al punto de venta</Link></p>}
      {prev && hayVentas && (
        <form className="tarjeta pila" onSubmit={cerrar}>
          <h2>Tu jornada</h2>
          <div className="indicadores">
            <div className="indicador"><span className="tenue chico">Ventas</span><strong>{prev.num_ventas}</strong></div>
            <div className="indicador"><span className="tenue chico">Efectivo esperado</span><strong>{formatBs(prev.efectivo)}</strong><span className="tenue chico">{prev.num_efectivo} venta(s)</span></div>
            <div className="indicador"><span className="tenue chico">QR (solo registro)</span><strong>{formatBs(prev.qr)}</strong><span className="tenue chico">{prev.num_qr} venta(s)</span></div>
            <div className="indicador"><span className="tenue chico">Total vendido</span><strong>{formatBs(prev.total)}</strong></div>
          </div>
          <p className="ayuda">Desde {fechaHoraBolivia(prev.desde)} hasta {fechaHoraBolivia(prev.hasta)}. Las ventas anuladas no se cuentan.</p>
          <div className="campo" style={{ maxWidth: 280 }}>
            <label htmlFor="contado">Efectivo contado (Bs.)</label>
            <input id="contado" className="entrada" type="number" inputMode="decimal" min="0" step="0.01" required value={contado} onChange={(e) => { setContado(e.target.value); setConfirmar(false); }} />
          </div>
          {arqueo && <p className={`aviso ${arqueo.clase}`} role="status">{arqueo.texto}{arqueo.dif !== 0 && `: ${formatBs(Math.abs(arqueo.dif))}`}</p>}
          {confirmar && <p className="aviso aviso--error" role="alert">El cierre queda guardado y no se puede editar. Pulsa de nuevo para confirmar.</p>}
          <div className="fila"><button className="btn btn--primario" disabled={cerrando || !enLinea}>{confirmar ? 'Sí, cerrar la caja' : 'Cerrar caja'}</button>
            {confirmar && <button type="button" className="btn" onClick={() => setConfirmar(false)}>Volver</button>}</div>
        </form>
      )}

      <h2>Cierres anteriores</h2>
      <div className="tabla-envoltura"><table className="tabla">
        <thead><tr><th>Fecha</th><th>Empleado</th><th>Ventas</th><th>Esperado</th><th>Contado</th><th>Diferencia</th></tr></thead>
        <tbody>
          {cierres?.length === 0 && <tr><td colSpan="6" className="tenue">Aún no hay cierres.</td></tr>}
          {cierres?.map((c) => (
            <tr key={c.id}>
              <td>{fechaHoraBolivia(c.creado_en)}</td><td>{c.usuarios?.nombre}</td><td>{c.detalle?.num_ventas}</td>
              <td>{formatBs(c.total_esperado)}</td><td>{formatBs(c.efectivo_contado)}</td>
              <td><span className={`insignia ${Number(c.diferencia) === 0 ? 'insignia--ok' : 'insignia--aji'}`}>{formatBs(c.diferencia)}</span></td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}
