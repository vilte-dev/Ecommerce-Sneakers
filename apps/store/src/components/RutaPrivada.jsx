import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';

export default function RutaPrivada() {
  const { user, cargando } = useAuth();
  const ubicacion = useLocation();
  if (cargando) return <div className="cargando" style={{ height: 120 }} aria-label="Cargando" />;
  if (!user) return <Navigate to={`/ingresar?next=${encodeURIComponent(ubicacion.pathname)}`} replace />;
  return <Outlet />;
}
