import { useEffect, useMemo, useState } from 'react';
import { formatBs, mensajeError } from '@sneakers/shared';
import { supabase } from '../lib/supabase.js';

const iso = (d) => d.toISOString().slice(0, 10);
const hoy = () => new Date();
const haceDias = (n) => { const d = hoy(); d.setDate(d.getDate() - n); return d; };

// HU-03 / RF-03 · Módulo ejecutivo exclusivo del Dueño. La BD rechaza la consulta a cualquier otro rol (RN-08).
export default function Resumen() {
  const [desde, setDesde] = useState(iso(haceDias(30)));
  const [hasta, setHasta] = useState(iso(hoy()));
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (desde > hasta) return setError('La fecha inicial no puede ser posterior a la final.');
    setError(''); setFilas(null);
    supabase.rpc('resumen_ventas', { p_desde: desde, p_hasta: hasta }).then(({ data, error: err }) => (err ? setError(mensajeError(err)) : setFilas(data)));
  }, [desde, hasta]);

  const kpi = useMemo(() => {
    const total = (filas ?? []).reduce((n, r) => n + Number(r.total_bs), 0);
    const pedidos = (filas ?? []).reduce((n, r) => n + r.num_pedidos, 0);
    return { total, pedidos, promedio: pedidos ? total / pedidos : 0 };
  }, [filas]);

  return (
    <div className="pila">
      <h1 style={{ fontSize: '2rem' }}>Resumen ejecutivo</h1>
      <p className="tenue">Ventas de pedidos web confirmados (en Bs.). Las ventas en caja se suman en el Sprint 3 y la utilidad llega con los costos de compra (Sprint 4).</p>
      <div className="fila">
        <div className="campo"><label htmlFor="desde">Desde</label><input id="desde" className="entrada" type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} /></div>
        <div className="campo"><label htmlFor="hasta">Hasta</label><input id="hasta" className="entrada" type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} /></div>
      </div>
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      {!filas && !error && <div className="cargando" style={{ height: 120 }} />}
      {filas && filas.length === 0 && <p className="aviso aviso--info">Sin información en el periodo seleccionado.</p>}
      {filas && filas.length > 0 && (
        <>
          <div className="indicadores">
            <div className="tarjeta indicador"><span className="tenue chico">Ventas del periodo</span><strong>{formatBs(kpi.total)}</strong></div>
            <div className="tarjeta indicador"><span className="tenue chico">Pedidos confirmados</span><strong>{kpi.pedidos}</strong></div>
            <div className="tarjeta indicador"><span className="tenue chico">Ticket promedio</span><strong>{formatBs(kpi.promedio)}</strong></div>
          </div>
          <div className="tabla-envoltura"><table className="tabla">
            <thead><tr><th>Día</th><th>Pedidos</th><th>Total</th></tr></thead>
            <tbody>{filas.map((r) => <tr key={r.dia}><td>{new Date(`${r.dia}T12:00:00`).toLocaleDateString('es-BO')}</td><td>{r.num_pedidos}</td><td>{formatBs(r.total_bs)}</td></tr>)}</tbody>
          </table></div>
        </>
      )}
    </div>
  );
}
