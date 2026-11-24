import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { MODULOS } from '../navegacion.js';

export default function Shell() {
  const { perfil, rol, salir } = useAuth();
  const visibles = MODULOS.filter((m) => m.roles.includes(rol));
  return (
    <div className="interno">
      <aside className="lateral">
        <div>
          <span className="marca">Sneakers</span>
          <div className="chico" style={{ opacity: 0.7 }}>Sistema interno</div>
        </div>
        <nav className="lateral__nav" aria-label="Módulos">
          {visibles.map((m) => (
            <NavLink key={m.ruta} to={m.ruta} end={m.fin} className={({ isActive }) => (isActive ? 'activo' : undefined)}>
              {m.texto}
              {m.sprint && <small>S{m.sprint}</small>}
            </NavLink>
          ))}
        </nav>
        <div className="chico" style={{ marginTop: 'auto' }}>
          <div>{perfil?.nombre}</div>
          <div style={{ opacity: 0.7 }}>{rol}</div>
          <button className="btn btn--chico" style={{ marginTop: '.5rem' }} onClick={salir}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="interno__contenido"><Outlet /></main>
    </div>
  );
}
