import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { estadoPedido, etiquetaDespacho, formatBs, mensajeError } from '@sneakers/shared';
import { listarPedidos } from '../features/pedidos/api.js';

const FILTROS = [
  ['accion', 'Por validar', (p) => p.estado === 'en_revision' || (p.estado === 'pendiente_pago' && p.pago_contra_entrega)],
  ['pago', 'Esperando pago', (p) => p.estado === 'pendiente_pago' && !p.pago_contra_entrega],
  ['entrega', 'Por entregar', (p) => ['pagado', 'listo_retiro', 'en_despacho'].includes(p.estado)],
  ['cerrados', 'Cerrados', (p) => ['entregado', 'cancelado'].includes(p.estado)],
  ['todos', 'Todos', () => true],
];

export default function Pedidos() {
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('accion');

  const cargar = useCallback(() => listarPedidos().then((d) => { setPedidos(d); setError(''); }).catch((e) => setError(mensajeError(e))), []);
  // Un solo empleado atiende tienda y web: la bandeja se refresca sola cada 30 s.
  useEffect(() => { cargar(); const t = setInterval(cargar, 30000); return () => clearInterval(t); }, [cargar]);

  const conteo = useMemo(() => Object.fromEntries(FILTROS.map(([k, , f]) => [k, (pedidos ?? []).filter(f).length])), [pedidos]);
  const visibles = useMemo(() => (pedidos ?? []).filter(FILTROS.find(([k]) => k === filtro)[2]), [pedidos, filtro]);

  return (
    <div className="pila">
      <div className="fila fila--entre">
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Pedidos web</h1>
        <button className="btn btn--chico" onClick={cargar}>Actualizar</button>
      </div>
      <div className="fila" role="tablist" aria-label="Filtrar pedidos">
        {FILTROS.map(([k, texto]) => (
          <button key={k} role="tab" aria-selected={filtro === k} className={`btn btn--chico ${filtro === k ? 'btn--primario' : ''}`} onClick={() => setFiltro(k)}>
            {texto} ({conteo[k]})
          </button>
        ))}
      </div>
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      {!pedidos && !error && <div className="cargando" style={{ height: 160 }} />}
      {pedidos && (
        <div className="tabla-envoltura"><table className="tabla">
          <thead><tr><th>N.º</th><th>Fecha</th><th>Cliente</th><th>Entrega</th><th>Pago</th><th>Total</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {visibles.length === 0 && <tr><td colSpan="8" className="tenue">No hay pedidos en esta lista.</td></tr>}
            {visibles.map((p) => {
              const e = estadoPedido(p);
              return (
                <tr key={p.id}>
                  <td><strong>{p.id}</strong></td>
                  <td>{new Date(p.fecha).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{p.clientes?.usuarios?.nombre ?? '–'}<div className="tenue chico">{p.clientes?.celular}</div></td>
                  <td>{etiquetaDespacho(p)}</td>
                  <td>{p.pago_contra_entrega ? `Contra entrega (${p.pago_contra_entrega})` : 'Anticipado'}</td>
                  <td>{formatBs(p.total)}</td>
                  <td><span className={`insignia ${e.clase}`}>{e.texto}</span></td>
                  <td><Link className="btn btn--chico" to={`/pedidos/${p.id}`}>Abrir</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
