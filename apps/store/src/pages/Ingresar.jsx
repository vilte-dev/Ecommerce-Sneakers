import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { mensajeError } from '@sneakers/shared';
import { useAuth } from '../features/auth/AuthContext.jsx';

export default function Ingresar() {
  const { ingresar } = useAuth();
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ correo: '', clave: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const next = params.get('next');
  const destino = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    const { error: err } = await ingresar(form);
    setEnviando(false);
    if (err) return setError(mensajeError(err));
    navegar(destino, { replace: true });
  }

  return (
    <form className="autenticacion pila" onSubmit={enviar}>
      <h1 style={{ fontSize: '2rem' }}>Ingresar</h1>
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      <div className="campo">
        <label htmlFor="correo">Correo</label>
        <input id="correo" className="entrada" type="email" autoComplete="email" required value={form.correo}
          onChange={(e) => setForm({ ...form, correo: e.target.value })} />
      </div>
      <div className="campo">
        <label htmlFor="clave">Contraseña</label>
        <input id="clave" className="entrada" type="password" autoComplete="current-password" required value={form.clave}
          onChange={(e) => setForm({ ...form, clave: e.target.value })} />
      </div>
      <button className="btn btn--primario btn--bloque" disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</button>
      <p className="chico"><Link to="/recuperar">Olvidé mi contraseña</Link></p>
      <p className="chico">¿Primera vez? <Link to="/registro">Crea tu cuenta</Link></p>
    </form>
  );
}
