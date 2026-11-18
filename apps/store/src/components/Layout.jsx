import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { useCart } from '../features/cart/CartContext.jsx';

export default function Layout() {
  const { user, salir } = useAuth();
  const { cantidadTotal, vaciar } = useCart();
  // Al salir se limpia el carrito local (equipo compartido); el guardado en la BD se conserva.
  const cerrarSesion = async () => {
    await salir();
    vaciar();
  };
  return (
    <>
      <header className="cabecera">
        <div className="contenedor cabecera__barra">
          <Link to="/" className="marca">Sneakers</Link>
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
              Carrito
              {cantidadTotal > 0 && <span className="bolsa__n">{cantidadTotal}</span>}
            </Link>
          </nav>
        </div>
      </header>
      <main className="contenedor principal">
        <Outlet />
      </main>
      <footer className="pie">
        <div className="contenedor fila fila--entre">
          <span>Sneakers · Tarija, Bolivia. Precios en bolivianos (Bs.).</span>
          <Link to="/terminos">Términos, cambios y devoluciones</Link>
        </div>
      </footer>
    </>
  );
}
