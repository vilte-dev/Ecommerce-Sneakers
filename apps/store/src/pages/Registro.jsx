import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mensajeError } from '@sneakers/shared';
import { useAuth } from '../features/auth/AuthContext.jsx';

export default function Registro() {
  const { registrar } = useAuth();
  const navegar = useNavigate();
  const [f, setF] = useState({ nombre: '', celular: '', correo: '', ci: '', clave: '', repetir: '' });
  const [error, setError] = useState('');
  const [pendiente, setPendiente] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const campo = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (!/^[67]\d{7}$/.test(f.celular)) return setError('Ingresa un celular boliviano de 8 dígitos, por ejemplo 71234567.');
    if (f.clave.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (f.clave !== f.repetir) return setError('Las contraseñas no coinciden.');
    setEnviando(true);
    const { data, error: err } = await registrar({
      correo: f.correo.trim(), clave: f.clave, nombre: f.nombre.trim(), celular: f.celular, ci: f.ci.trim(),
    });
    setEnviando(false);
    if (err) return setError(mensajeError(err));
    if (data.session) navegar('/', { replace: true });
    else setPendiente(true); // el proyecto exige confirmar el correo
  }

  if (pendiente) {
    return (
      <div className="autenticacion pila">
        <h1 style={{ fontSize: '2rem' }}>Revisa tu correo</h1>
        <p className="aviso aviso--ok">Te enviamos un enlace a {f.correo}. Confirma tu cuenta y luego ingresa.</p>
        <Link className="btn" to="/ingresar">Ir a ingresar</Link>
      </div>
    );
  }
  return (
    <form className="autenticacion pila" onSubmit={enviar}>
      <h1 style={{ fontSize: '2rem' }}>Crear cuenta</h1>
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      <div className="campo"><label htmlFor="nombre">Nombre completo</label>
        <input id="nombre" className="entrada" autoComplete="name" required {...campo('nombre')} /></div>
      <div className="campo"><label htmlFor="celular">Celular (WhatsApp)</label>
        <input id="celular" className="entrada" inputMode="numeric" autoComplete="tel-national" maxLength={8} required {...campo('celular')} />
        <span className="ayuda">Lo usamos para avisarte del estado de tu pedido.</span></div>
      <div className="campo"><label htmlFor="correo">Correo</label>
        <input id="correo" className="entrada" type="email" autoComplete="email" required {...campo('correo')} /></div>
      <div className="campo"><label htmlFor="ci">CI (opcional)</label>
        <input id="ci" className="entrada" {...campo('ci')} />
        <span className="ayuda">Vincula tus compras para el descuento por fidelidad.</span></div>
      <div className="campo"><label htmlFor="clave">Contraseña</label>
        <input id="clave" className="entrada" type="password" autoComplete="new-password" minLength={8} required {...campo('clave')} /></div>
      <div className="campo"><label htmlFor="repetir">Repite la contraseña</label>
        <input id="repetir" className="entrada" type="password" autoComplete="new-password" required {...campo('repetir')} /></div>
      <button className="btn btn--primario btn--bloque" disabled={enviando}>{enviando ? 'Creando cuenta…' : 'Crear cuenta'}</button>
      <p className="chico">¿Ya tienes cuenta? <Link to="/ingresar">Ingresa</Link></p>
    </form>
  );
}
