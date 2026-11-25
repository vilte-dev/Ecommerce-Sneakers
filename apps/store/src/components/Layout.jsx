import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { useCart } from '../features/cart/CartContext.jsx';
import { IconoBolsa, IconoLupa } from './Iconos.jsx';

export default function Layout() {
  const { user, salir } = useAuth();
  const { cantidadTotal, vaciar } = useCart();
  const navegar = useNavigate();
  const [q, setQ] = useState('');
  // Al salir se limpia el carrito local (equipo compartido); el guardado en la BD se conserva.
  const cerrarSesion = async () => {
    await salir();
    vaciar();
  };
  // HU-UI-02: el buscador de la cabecera lleva al catálogo con el filtro «q» ya aplicado.
  const buscar = (e) => {
    e.preventDefault();
    const texto = q.trim();
    navegar(texto ? `/catalogo?q=${encodeURIComponent(texto)}` : '/catalogo');
    setQ('');
  };
  return (
    <div className="tienda">
      <div className="anuncio">
        <div className="contenedor anuncio__texto">
          <span>Retiro en tienda sin costo o envío a domicilio en Tarija</span>
          <span>5 % de descuento cada 10 compras</span>
        </div>
      </div>
      <header className="cabecera">
        <div className="contenedor cabecera__barra">
          <Link to="/" className="marca">Sneakers</Link>
          <form className="buscador" role="search" onSubmit={buscar}>
            <IconoLupa />
            <label htmlFor="buscar-cabecera" className="sr-only">Buscar calzado por nombre</label>
            <input id="buscar-cabecera" type="search" placeholder="Buscar calzado…" value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
          <nav className="nav" aria-label="Principal">
            <NavLink to="/catalogo" className={({ isActive }) => (isActive ? 'activo' : undefined)}>Catálogo</NavLink>
            {user ? (
              <>
                <NavLink to="/mis-pedidos">Mis pedidos</NavLink>
                <button className="btn btn--chico" onClick={cerrarSesion}>Salir</button>
              </>
            ) : (
              <NavLink to="/ingresar">Ingresar</NavLink>
            )}
            <Link to="/carrito" className="bolsa" aria-label={`Carrito, ${cantidadTotal} producto(s)`}>
              <IconoBolsa />
              {cantidadTotal > 0 && <span className="bolsa__n">{cantidadTotal}</span>}
            </Link>
          </nav>
        </div>
      </header>
      <main className="contenedor principal">
        <Outlet />
      </main>
      <footer className="pie">
        <div className="contenedor">
          <div className="pie__rejilla">
            <div>
              <h2>Sneakers · Tarija</h2>
              <p style={{ maxWidth: 360 }}>Calzado para niños, jóvenes y adultos. Pide en línea y retira en tienda o recíbelo en casa. Precios en bolivianos (Bs.).</p>
            </div>
            <div>
              <h2>Tienda</h2>
              <ul>
                <li><Link to="/catalogo">Catálogo</Link></li>
                <li><Link to="/carrito">Carrito</Link></li>
                <li><Link to={user ? '/mis-pedidos' : '/ingresar'}>{user ? 'Mis pedidos' : 'Ingresar'}</Link></li>
              </ul>
            </div>
            <div>
              <h2>Ayuda</h2>
              <ul>
                <li><Link to="/terminos">Términos, cambios y devoluciones</Link></li>
              </ul>
            </div>
          </div>
          <p className="pie__marca" aria-hidden="true">Sneakers</p>
          <p className="pie__legal chico">© {new Date().getFullYear()} Sneakers · Tarija, Bolivia.</p>
        </div>
      </footer>
    </div>
  );
}
