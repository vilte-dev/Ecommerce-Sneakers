import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatBs } from '@sneakers/shared';
import { listarCatalogo, listarOpciones } from '../features/catalog/api.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { IconoCamion, IconoQr, IconoSello, IconoFlecha } from '../components/Iconos.jsx';

const MENSAJES = ['Envío a domicilio en Tarija', 'Retiro en tienda sin costo', 'Pago por QR o transferencia', '5 % de descuento cada 10 compras', 'Niño · Juvenil · Adulto'];

export default function Inicio() {
  const { user } = useAuth();
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

  // Destacado de la portada: el modelo más reciente que tenga foto y stock.
  const destacado = novedades.find((m) => m.fotos?.[0] && m.stock_total > 0);

  return (
    <>
      <section className="portada">
        <div className="hero">
          <div>
            <p className="sobretitulo revela">Sneakers · Tarija</p>
            <h1 className="hero__titulo revela revela--2">Encuentra tu <mark>talla</mark>,<br />sin dar vueltas.</h1>
            <p className="hero__texto revela revela--3">
              Calzado para niños, jóvenes y adultos en Tarija. Elige tu rango, pide en línea y retira en tienda o recíbelo en casa.
            </p>
            <div className="hero__acciones revela revela--4">
              <Link className="btn btn--primario btn--grande" to="/catalogo">Ver el catálogo <IconoFlecha /></Link>
              <a className="btn" href="#tallas">Elegir por talla</a>
            </div>
          </div>
          {destacado && (
            <Link to={`/producto/${destacado.id}`} className="destacado revela revela--3" aria-label={`Destacado: ${destacado.marca} ${destacado.nombre} ${destacado.color}`}>
              <span className="sello">Recién llegado</span>
              <div className="destacado__foto"><img src={destacado.fotos[0]} alt="" width="420" height="420" /></div>
              <div className="destacado__pie">
                <div>
                  <div className="producto__marca">{destacado.marca}</div>
                  <div className="destacado__nombre">{destacado.nombre} {destacado.color}</div>
                </div>
                <span className="precio">{formatBs(destacado.precio)}</span>
              </div>
            </Link>
          )}
        </div>

        <div className="cinta" aria-label="Lo que ofrecemos">
          <div className="cinta__pista" aria-hidden="true">
            {[...MENSAJES, ...MENSAJES].map((m, i) => <span key={i}>{m}</span>)}
          </div>
          <span className="sr-only">{MENSAJES.join('. ')}.</span>
        </div>

        {categorias.length > 0 && (
          <div className="pila">
            <div className="seccion-titulo">
              <h2 id="tallas">Elige tu rango de talla</h2>
              <p className="tenue chico" style={{ margin: 0 }}>Toca un tramo de la regla</p>
            </div>
            <nav className="regla" aria-labelledby="tallas">
              {categorias.map((c) => (
                <Link key={c.id} to={`/catalogo?categoria=${c.id}`} className="regla__tramo">
                  <span className="regla__num">{c.talla_max == null ? `${c.talla_min}+` : `${c.talla_min}–${c.talla_max}`}</span>
                  <span className="regla__nombre">{c.nombre}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </section>

      <section className="pila" style={{ marginTop: '3rem' }}>
        <div className="seccion-titulo">
          <h2>Recién llegados</h2>
          <Link to="/catalogo">Ver todo el catálogo</Link>
        </div>
        {error && <p className="aviso aviso--error">No pudimos cargar el catálogo. Revisa tu conexión e inténtalo de nuevo.</p>}
        {!error && novedades.length === 0 && <p className="tenue">Pronto cargaremos los primeros modelos.</p>}
        <div className="rejilla">{novedades.map((m, i) => <ProductCard key={m.id} modelo={m} nuevo={i < 4} />)}</div>
      </section>

      <section className="confianza" style={{ marginTop: '3rem' }} aria-label="Cómo comprar">
        <div className="confianza__item"><span className="confianza__icono"><IconoCamion /></span><strong>Retira o recibe</strong><span>En tienda sin costo o a domicilio dentro de Tarija.</span></div>
        <div className="confianza__item"><span className="confianza__icono"><IconoQr /></span><strong>Paga como prefieras</strong><span>Transferencia o QR: subes tu comprobante y lo validamos.</span></div>
        <div className="confianza__item"><span className="confianza__icono"><IconoSello /></span><strong>Compra y gana</strong><span>Cada 10 compras, 5 % de descuento en la siguiente.</span></div>
      </section>

      <section className="banner" style={{ marginTop: '1.5rem' }}>
        <div>
          <h2>La compra 11 va con 5 % menos</h2>
          <p>Cada 10 compras confirmadas, en la web o en la tienda, ganas un descuento en la siguiente. Se repite siempre.</p>
        </div>
        <Link className="btn btn--primario" to={user ? '/mis-pedidos' : '/registro'}>{user ? 'Ver mi avance' : 'Crear mi cuenta'}</Link>
      </section>
    </>
  );
}
