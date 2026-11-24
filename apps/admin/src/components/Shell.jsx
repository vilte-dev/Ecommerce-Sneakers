import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { OPERADORES } from '@sneakers/shared';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { MODULOS } from '../navegacion.js';
import { contarPorValidar } from '../features/pedidos/api.js';
import { useInactividad } from '../lib/useInactividad.js';

const MINUTOS_INACTIVIDAD = 30;

export default function Shell() {
  const { perfil, rol, salir } = useAuth();
  const [porValidar, setPorValidar] = useState(0);
  const visibles = MODULOS.filter((m) => m.roles.includes(rol));

  useInactividad(MINUTOS_INACTIVIDAD * 60 * 1000, salir);

  // Un solo empleado atiende todo: la barra avisa cuántos pedidos web esperan su validación.
  useEffect(() => {
    if (!OPERADORES.includes(rol)) return undefined;
    const leer = () => contarPorValidar().then(setPorValidar).catch(() => {});
    leer();
    const t = setInterval(leer, 30000);
    return () => clearInterval(t);
  }, [rol]);

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
              {m.ruta === '/pedidos' && porValidar > 0 && <span className="insignia insignia--aji" aria-label={`${porValidar} pedidos por validar`}>{porValidar}</span>}
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
