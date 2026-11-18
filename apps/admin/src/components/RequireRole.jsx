import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { STAFF } from '@sneakers/shared';
import { useAuth } from '../features/auth/AuthContext.jsx';

export default function RequireRole({ roles = STAFF }) {
  const { session, rol, cargando, salir } = useAuth();
  const ubicacion = useLocation();
  if (cargando) return <div className="cargando" style={{ height: 120, margin: '2rem' }} aria-label="Cargando" />;
  if (!session) return <Navigate to="/ingresar" state={{ desde: ubicacion.pathname }} replace />;
  if (!rol || !STAFF.includes(rol)) {
    return (
      <div className="contenedor pila" style={{ paddingBlock: '3rem', maxWidth: 520 }}>
        <h1 style={{ fontSize: '2rem' }}>Acceso restringido</h1>
        <p>Tu cuenta no tiene permiso para usar el sistema interno. Pide al administrador que te asigne un rol.</p>
        <button className="btn" onClick={salir}>Cerrar sesión</button>
      </div>
    );
  }
  if (!roles.includes(rol)) {
    return (
      <div className="pila" style={{ maxWidth: 520 }}>
        <h1 style={{ fontSize: '2rem' }}>No tienes acceso a este módulo</h1>
        <p className="tenue">Tu rol ({rol}) no incluye esta sección.</p>
      </div>
    );
  }
  return <Outlet />;
}
