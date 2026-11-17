import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { mensajeError } from '@sneakers/shared';
import { useAuth } from '../features/auth/AuthContext.jsx';

export default function Login() {
  const { session, ingresar } = useAuth();
  const navegar = useNavigate();
  const { state } = useLocation();
  const [f, setF] = useState({ correo: '', clave: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  if (session) return <Navigate to={state?.desde ?? '/'} replace />;

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    const { error: err } = await ingresar(f);
    setEnviando(false);
    if (err) return setError(mensajeError(err));
    navegar(state?.desde ?? '/', { replace: true });
  }
  return (
    <div className="contenedor" style={{ paddingBlock: '4rem' }}>
      <form className="autenticacion pila tarjeta" onSubmit={enviar}>
        <div><span className="marca" style={{ color: 'var(--tinta)' }}>Sneakers</span><div className="tenue chico">Sistema interno</div></div>
        {error && <p className="aviso aviso--error" role="alert">{error}</p>}
        <div className="campo"><label htmlFor="correo">Correo</label>
          <input id="correo" className="entrada" type="email" autoComplete="username" required value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} /></div>
        <div className="campo"><label htmlFor="clave">Contraseña</label>
          <input id="clave" className="entrada" type="password" autoComplete="current-password" required value={f.clave} onChange={(e) => setF({ ...f, clave: e.target.value })} /></div>
        <button className="btn btn--primario btn--bloque" disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </div>
  );
}
