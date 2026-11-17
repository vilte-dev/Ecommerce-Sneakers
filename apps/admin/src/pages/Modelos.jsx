import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatBs } from '@sneakers/shared';
import { supabase } from '../lib/supabase.js';

export default function Modelos() {
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    supabase
      .from('modelos')
      .select('id,nombre,color,precio,activo,fotos,marcas(nombre),categorias(nombre),stock(cantidad)')
      .order('id', { ascending: false })
      .then(({ data, error: err }) => (err ? setError(true) : setFilas(data)));
  }, []);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (filas ?? []).filter((m) => !t || `${m.marcas?.nombre} ${m.nombre} ${m.color}`.toLowerCase().includes(t));
  }, [filas, q]);

  return (
    <div className="pila">
      <div className="fila fila--entre">
        <h1 style={{ fontSize: '2rem' }}>Modelos</h1>
        <Link className="btn btn--primario" to="/modelos/nuevo">Nuevo modelo</Link>
      </div>
      <input className="entrada" type="search" placeholder="Buscar por marca, nombre o color" aria-label="Buscar modelos" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 420 }} />
      {error && <p className="aviso aviso--error">No se pudo cargar la lista de modelos.</p>}
      {!filas && !error && <div className="cargando" style={{ height: 160 }} />}
      {filas && (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead><tr><th></th><th>Modelo</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {visibles.length === 0 && <tr><td colSpan="7" className="tenue">No hay modelos que mostrar.</td></tr>}
              {visibles.map((m) => (
                <tr key={m.id}>
                  <td>{m.fotos?.[0] ? <img className="miniatura" src={m.fotos[0]} alt="" /> : <span className="miniatura" aria-hidden="true">👟</span>}</td>
                  <td><strong>{m.nombre}</strong> {m.color}<div className="tenue chico">{m.marcas?.nombre}</div></td>
                  <td>{m.categorias?.nombre}</td>
                  <td>{formatBs(m.precio)}</td>
                  <td>{m.stock.reduce((n, s) => n + s.cantidad, 0)}</td>
                  <td><span className={`insignia ${m.activo ? 'insignia--ok' : ''}`}>{m.activo ? 'Activo' : 'Oculto'}</span></td>
                  <td><Link className="btn btn--chico" to={`/modelos/${m.id}`}>Editar</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
