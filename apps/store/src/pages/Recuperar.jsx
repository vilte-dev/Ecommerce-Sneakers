import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mensajeError } from '@sneakers/shared';
import { useAuth } from '../features/auth/AuthContext.jsx';

export default function Recuperar() {
  const { recuperar } = useAuth();
  const [correo, setCorreo] = useState('');
  const [estado, setEstado] = useState({ tipo: null, texto: '' });
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    const { error } = await recuperar(correo.trim());
    setEnviando(false);
    setEstado(error
      ? { tipo: 'error', texto: mensajeError(error) }
      : { tipo: 'ok', texto: 'Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña.' });
  }
  return (
    <form className="autenticacion pila" onSubmit={enviar}>
      <h1 style={{ fontSize: '2rem' }}>Recuperar contraseña</h1>
      {estado.tipo && <p className={`aviso aviso--${estado.tipo}`} role="status">{estado.texto}</p>}
      <div className="campo"><label htmlFor="correo">Correo de tu cuenta</label>
        <input id="correo" className="entrada" type="email" autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} /></div>
      <button className="btn btn--primario btn--bloque" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar enlace'}</button>
      <Link to="/ingresar" className="chico">Volver a ingresar</Link>
    </form>
  );
}
