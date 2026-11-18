import { useEffect, useState } from 'react';
import { mensajeError } from '@sneakers/shared';
import { supabase } from '../lib/supabase.js';

export default function Marcas() {
  const [marcas, setMarcas] = useState(null);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');

  const cargar = () => supabase.from('marcas').select('id,nombre,activo').order('nombre').then(({ data, error: err }) => (err ? setError(mensajeError(err)) : setMarcas(data)));
  useEffect(() => { cargar(); }, []);

  async function agregar(e) {
    e.preventDefault();
    setError('');
    const { error: err } = await supabase.from('marcas').insert({ nombre: nombre.trim() });
    if (err) return setError(mensajeError(err));
    setNombre('');
    cargar();
  }
  async function alternar(m) {
    const { error: err } = await supabase.from('marcas').update({ activo: !m.activo }).eq('id', m.id);
    if (err) setError(mensajeError(err));
    else cargar();
  }

  return (
    <div className="pila" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: '2rem' }}>Marcas</h1>
      <form className="fila" onSubmit={agregar}>
        <input className="entrada" style={{ flex: 1 }} placeholder="Nombre de la marca" aria-label="Nombre de la marca" required maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <button className="btn btn--primario">Agregar</button>
      </form>
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      {!marcas ? <div className="cargando" style={{ height: 120 }} /> : (
        <div className="tabla-envoltura"><table className="tabla"><tbody>
          {marcas.length === 0 && <tr><td className="tenue">Aún no hay marcas.</td></tr>}
          {marcas.map((m) => (
            <tr key={m.id}><td>{m.nombre}</td>
              <td><span className={`insignia ${m.activo ? 'insignia--ok' : ''}`}>{m.activo ? 'Activa' : 'Oculta'}</span></td>
              <td><button className="btn btn--chico" onClick={() => alternar(m)}>{m.activo ? 'Ocultar' : 'Activar'}</button></td></tr>
          ))}
        </tbody></table></div>
      )}
    </div>
  );
}
