import { useEffect, useState } from 'react';
import { ROLES, mensajeError } from '@sneakers/shared';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../features/auth/AuthContext.jsx';

const NOMBRES_ROL = { cliente: 'Cliente', empleado: 'Empleado', dueno: 'Dueño', administrador: 'Administrador' };

export default function Usuarios() {
  const { session } = useAuth();
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState('');

  const cargar = () => supabase.from('usuarios').select('id,nombre,correo,celular,activo,roles(nombre)').order('creado_en', { ascending: false })
    .then(({ data, error: err }) => (err ? setError(mensajeError(err)) : setFilas(data)));
  useEffect(() => { cargar(); }, []);

  async function cambiar(u, rol, activo) {
    setError('');
    const { error: err } = await supabase.rpc('cambiar_rol_usuario', { p_usuario: u.id, p_rol: rol, p_activo: activo });
    if (err) setError(mensajeError(err));
    cargar();
  }

  return (
    <div className="pila">
      <h1 style={{ fontSize: '2rem' }}>Usuarios</h1>
      <p className="tenue">Las cuentas nuevas entran como cliente. Aquí asignas el rol de empleado, dueño o administrador.</p>
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      {!filas ? <div className="cargando" style={{ height: 160 }} /> : (
        <div className="tabla-envoltura"><table className="tabla">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Celular</th><th>Rol</th><th>Estado</th></tr></thead>
          <tbody>
            {filas.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}{u.id === session.user.id && <span className="insignia" style={{ marginLeft: 6 }}>Tú</span>}</td>
                <td>{u.correo}</td><td>{u.celular ?? '–'}</td>
                <td><select className="entrada" style={{ minHeight: 36 }} aria-label={`Rol de ${u.nombre}`} value={u.roles?.nombre} onChange={(e) => cambiar(u, e.target.value, u.activo)}>
                  {Object.values(ROLES).map((r) => <option key={r} value={r}>{NOMBRES_ROL[r]}</option>)}</select></td>
                <td><button className="btn btn--chico" onClick={() => cambiar(u, u.roles?.nombre, !u.activo)}>{u.activo ? 'Desactivar' : 'Activar'}</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
