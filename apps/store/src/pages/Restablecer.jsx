import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mensajeError } from '@sneakers/shared';
import { useAuth } from '../features/auth/AuthContext.jsx';

// Supabase abre una sesión temporal al entrar desde el enlace del correo; aquí se fija la nueva clave.
export default function Restablecer() {
  const { user, cargando, actualizarClave } = useAuth();
  const navegar = useNavigate();
  const [clave, setClave] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState('');

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (clave.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (clave !== repetir) return setError('Las contraseñas no coinciden.');
    const { error: err } = await actualizarClave(clave);
    if (err) return setError(mensajeError(err));
    navegar('/', { replace: true });
  }

  if (cargando) return <div className="cargando" style={{ height: 120 }} aria-label="Cargando" />;
  if (!user) {
    return (
      <div className="autenticacion pila">
        <p className="aviso aviso--error">El enlace venció o no es válido.</p>
        <Link className="btn" to="/recuperar">Pedir un enlace nuevo</Link>
      </div>
    );
  }
  return (
    <form className="autenticacion pila" onSubmit={enviar}>
      <h1 style={{ fontSize: '2rem' }}>Nueva contraseña</h1>
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      <div className="campo"><label htmlFor="clave">Nueva contraseña</label>
        <input id="clave" className="entrada" type="password" autoComplete="new-password" minLength={8} required value={clave} onChange={(e) => setClave(e.target.value)} /></div>
      <div className="campo"><label htmlFor="repetir">Repítela</label>
        <input id="repetir" className="entrada" type="password" autoComplete="new-password" required value={repetir} onChange={(e) => setRepetir(e.target.value)} /></div>
      <button className="btn btn--primario btn--bloque">Guardar contraseña</button>
    </form>
  );
}
