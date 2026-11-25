import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatBs } from '@sneakers/shared';
import { useCart } from '../features/cart/CartContext.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { stockPorModelos } from '../features/catalog/api.js';

export default function Carrito() {
  const { items, cambiarCantidad, quitar, total, ajustarStock } = useCart();
  const { user } = useAuth();
  const navegar = useNavigate();

  // Al abrir el carrito se revalida contra el stock real (HU-07: no más unidades que el stock).
  const claves = items.map((i) => i.modeloId).join(',');
  useEffect(() => {
    const ids = [...new Set(items.map((i) => i.modeloId))];
    stockPorModelos(ids).then(ajustarStock).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claves]);

  if (items.length === 0) {
    return (
      <div className="vacio">
        <span className="vacio__num" aria-hidden="true">0</span>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Tu carrito está vacío</h1>
        <p className="tenue">Cero pares por ahora. Elige un modelo y tu talla para empezar.</p>
        <Link className="btn btn--primario" to="/catalogo">Ver el catálogo</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <p className="sobretitulo">Sneakers · Tarija</p>
      <h1 style={{ fontSize: '2rem' }}>Tu carrito</h1>
      <div>
        {items.map((i) => (
          <div className="linea" key={`${i.modeloId}-${i.talla}`}>
            <div className="linea__foto">{i.foto ? <img src={i.foto} alt="" /> : <span aria-hidden="true">👟</span>}</div>
            <div className="pila" style={{ gap: '.5rem' }}>
              <div className="fila fila--entre">
                <div>
                  <Link to={`/producto/${i.modeloId}`} style={{ color: 'inherit', fontWeight: 600 }}>{i.marca} {i.nombre} {i.color}</Link>
                  <div className="tenue chico">Talla {i.talla} · {formatBs(i.precio)} c/u</div>
                </div>
                <strong>{formatBs(i.precio * i.cantidad)}</strong>
              </div>
              <div className="fila fila--entre">
                <div className="cantidad" role="group" aria-label={`Cantidad de ${i.nombre} talla ${i.talla}`}>
                  <button aria-label="Quitar una unidad" disabled={i.cantidad <= 1} onClick={() => cambiarCantidad(i.modeloId, i.talla, i.cantidad - 1)}>−</button>
                  <span>{i.cantidad}</span>
                  <button aria-label="Agregar una unidad" disabled={i.cantidad >= i.stockMax} onClick={() => cambiarCantidad(i.modeloId, i.talla, i.cantidad + 1)}>+</button>
                </div>
                {i.cantidad >= i.stockMax && <span className="ayuda">Máximo disponible</span>}
                <button className="btn btn--chico btn--peligro" onClick={() => quitar(i.modeloId, i.talla)}>Quitar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="resumen pila">
        <div className="fila fila--entre"><span>Total</span><span className="precio" style={{ fontSize: '1.6rem' }}>{formatBs(total)}</span></div>
        <button className="btn btn--primario btn--bloque" onClick={() => navegar(user ? '/pedido' : '/ingresar?next=/pedido')}>
          {user ? 'Continuar con el pedido' : 'Ingresa para continuar'}
        </button>
      </div>
    </div>
  );
}
