import { Link } from 'react-router-dom';
export default function NoEncontrada() {
  return (
    <div className="vacio">
      <span className="vacio__num" aria-hidden="true">404</span>
      <h1 style={{ fontSize: '2rem', margin: 0 }}>Esta página no existe</h1>
      <p className="tenue">Este par no está en nuestro catálogo. Vuelve y sigue buscando tu talla.</p>
      <Link className="btn btn--primario" to="/catalogo">Ir al catálogo</Link>
    </div>
  );
}
