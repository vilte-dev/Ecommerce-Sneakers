import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function Inventario() {
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [soloBajo, setSoloBajo] = useState(false);

  useEffect(() => {
    supabase
      .from('stock')
      .select('id,talla,cantidad,umbral_minimo,modelos(nombre,color,marcas(nombre))')
      .order('modelo_id')
      .order('talla')
      .then(({ data, error: err }) => (err ? setError(true) : setFilas(data)));
  }, []);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (filas ?? []).filter((r) => {
      const texto = `${r.modelos?.marcas?.nombre} ${r.modelos?.nombre} ${r.modelos?.color}`.toLowerCase();
      return (!t || texto.includes(t)) && (!soloBajo || r.cantidad <= r.umbral_minimo);
    });
  }, [filas, q, soloBajo]);

  return (
    <div className="pila">
      <h1 style={{ fontSize: '2rem' }}>Inventario</h1>
      <div className="fila">
        <input className="entrada" style={{ maxWidth: 360 }} type="search" placeholder="Buscar modelo, marca o color" aria-label="Buscar en el inventario" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="fila"><input type="checkbox" checked={soloBajo} onChange={(e) => setSoloBajo(e.target.checked)} /> Solo stock bajo o agotado</label>
      </div>
      {error && <p className="aviso aviso--error">No se pudo cargar el inventario.</p>}
      {!filas && !error && <div className="cargando" style={{ height: 160 }} />}
      {filas && (
        <div className="tabla-envoltura"><table className="tabla">
          <thead><tr><th>Modelo</th><th>Color</th><th>Talla</th><th>Cantidad</th><th>Mínimo</th><th>Estado</th></tr></thead>
          <tbody>
            {visibles.length === 0 && <tr><td colSpan="6" className="tenue">No hay filas que mostrar.</td></tr>}
            {visibles.map((r) => (
              <tr key={r.id}>
                <td>{r.modelos?.marcas?.nombre} {r.modelos?.nombre}</td><td>{r.modelos?.color}</td><td>{r.talla}</td><td>{r.cantidad}</td><td>{r.umbral_minimo}</td>
                <td>{r.cantidad === 0 ? <span className="insignia insignia--aji">Agotada</span> : r.cantidad <= r.umbral_minimo ? <span className="insignia insignia--aviso">Stock bajo</span> : <span className="insignia insignia--ok">Normal</span>}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
