import { Link } from 'react-router-dom';
export default function NoEncontrada() {
  return (
    <div className="pila" style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: '2rem' }}>Esta página no existe</h1>
      <Link className="btn btn--primario" to="/catalogo">Ir al catálogo</Link>
    </div>
  );
}
