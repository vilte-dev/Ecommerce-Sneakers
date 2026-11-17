import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarCatalogo, listarOpciones } from '../features/catalog/api.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Inicio() {
  const [categorias, setCategorias] = useState([]);
  const [novedades, setNovedades] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([listarOpciones(), listarCatalogo({ disp: true }, 0)])
      .then(([o, c]) => {
        setCategorias(o.categorias);
        setNovedades(c.data.slice(0, 8));
      })
      .catch(() => setError(true));
  }, []);

  return (
    <>
      <section className="portada">
        <h1>Encuentra tu talla,<br />sin dar vueltas.</h1>
        <p className="tenue" style={{ maxWidth: 520 }}>
          Calzado para niños, jóvenes y adultos en Tarija. Elige tu rango, pide en línea y retira en tienda o recíbelo en casa.
        </p>
        {categorias.length > 0 && (
          <nav className="regla" aria-label="Elegir por talla">
            {categorias.map((c) => (
              <Link key={c.id} to={`/catalogo?categoria=${c.id}`} className="regla__tramo">
                <span className="regla__num">{c.talla_max == null ? `${c.talla_min}+` : `${c.talla_min}–${c.talla_max}`}</span>
                <span className="regla__nombre">{c.nombre}</span>
              </Link>
            ))}
          </nav>
        )}
      </section>
      <section className="pila" style={{ marginTop: '1.5rem' }}>
        <div className="fila fila--entre">
          <h2>Recién llegados</h2>
          <Link to="/catalogo">Ver todo el catálogo</Link>
        </div>
        {error && <p className="aviso aviso--error">No pudimos cargar el catálogo. Revisa tu conexión e inténtalo de nuevo.</p>}
        {!error && novedades.length === 0 && <p className="tenue">Pronto cargaremos los primeros modelos.</p>}
        <div className="rejilla">{novedades.map((m) => <ProductCard key={m.id} modelo={m} />)}</div>
      </section>
    </>
  );
}
