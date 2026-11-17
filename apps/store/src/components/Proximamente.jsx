import { Link } from 'react-router-dom';

export default function Proximamente({ titulo, sprint, historias, detalle }) {
  return (
    <section className="tarjeta pila" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: '1.8rem' }}>{titulo}</h1>
      <p>{detalle}</p>
      <p className="ayuda">Se construye en el Sprint {sprint} ({historias}).</p>
      <Link className="btn" to="/catalogo">Volver al catálogo</Link>
    </section>
  );
}
