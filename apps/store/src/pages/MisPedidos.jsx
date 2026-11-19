import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { estadoPedido, etiquetaDespacho, formatBs } from '@sneakers/shared';
import { listarMisPedidos } from '../features/orders/api.js';

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => { listarMisPedidos().then(setPedidos).catch(() => setError(true)); }, []);

  return (
    <div className="pila" style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: '2rem' }}>Mis pedidos</h1>
      {error && <p className="aviso aviso--error">No pudimos cargar tus pedidos. Inténtalo de nuevo.</p>}
      {!pedidos && !error && <div className="cargando" style={{ height: 120 }} aria-label="Cargando" />}
      {pedidos?.length === 0 && (
        <div className="pila"><p className="tenue">Aún no tienes pedidos.</p><Link className="btn btn--primario" to="/catalogo">Ver el catálogo</Link></div>
      )}
      {pedidos?.map((p) => {
        const e = estadoPedido(p);
        return (
          <Link key={p.id} to={`/pedido/${p.id}`} className="tarjeta fila fila--entre" style={{ color: 'inherit', textDecoration: 'none' }}>
            <div>
              <strong>Pedido N.º {p.id}</strong>
              <div className="tenue chico">{new Date(p.fecha).toLocaleDateString('es-BO')} · {etiquetaDespacho(p)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="precio">{formatBs(p.total)}</div>
              <span className={`insignia ${e.clase}`}>{e.texto}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
