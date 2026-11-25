import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const estadoDe = (r) => (r.cantidad === 0 ? 'agotada' : r.cantidad <= r.umbral_minimo ? 'bajo' : 'normal');
const INSIGNIA = {
  agotada: <span className="insignia insignia--aji">Agotada</span>,
  bajo: <span className="insignia insignia--aviso">Stock bajo</span>,
  normal: <span className="insignia insignia--ok">Normal</span>,
};

// HU-13 · Stock por modelo, talla y color, con filtros y dos vistas: lista por talla y matriz por modelo.
export default function Inventario() {
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [talla, setTalla] = useState('');
  const [color, setColor] = useState('');
  const [soloBajo, setSoloBajo] = useState(false);
  const [vista, setVista] = useState('talla');

  useEffect(() => {
    supabase
      .from('stock')
      .select('id,talla,cantidad,umbral_minimo,modelo_id,modelos(nombre,color,marcas(nombre))')
      .order('modelo_id')
      .order('talla')
      .then(({ data, error: err }) => (err ? setError(true) : setFilas(data)));
  }, []);

  const opciones = useMemo(() => ({
    tallas: [...new Set((filas ?? []).map((r) => r.talla))].sort((a, b) => a - b),
    colores: [...new Set((filas ?? []).map((r) => r.modelos?.color).filter(Boolean))].sort(),
  }), [filas]);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (filas ?? []).filter((r) => {
      const texto = `${r.modelos?.marcas?.nombre} ${r.modelos?.nombre} ${r.modelos?.color}`.toLowerCase();
      return (!t || texto.includes(t)) && (!talla || r.talla === Number(talla)) && (!color || r.modelos?.color === color)
        && (!soloBajo || r.cantidad <= r.umbral_minimo);
    });
  }, [filas, q, talla, color, soloBajo]);

  const porModelo = useMemo(() => {
    const m = new Map();
    for (const r of visibles) {
      if (!m.has(r.modelo_id)) m.set(r.modelo_id, { id: r.modelo_id, modelo: r.modelos, tallas: [], total: 0 });
      const g = m.get(r.modelo_id);
      g.tallas.push(r);
      g.total += r.cantidad;
    }
    return [...m.values()];
  }, [visibles]);

  const unidades = visibles.reduce((n, r) => n + r.cantidad, 0);

  return (
    <div className="pila">
      <h1 style={{ fontSize: '2rem' }}>Inventario</h1>
      <div className="fila">
        <input className="entrada" style={{ maxWidth: 300 }} type="search" placeholder="Buscar modelo, marca o color" aria-label="Buscar en el inventario" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="entrada" style={{ maxWidth: 140 }} aria-label="Filtrar por talla" value={talla} onChange={(e) => setTalla(e.target.value)}>
          <option value="">Toda talla</option>{opciones.tallas.map((t) => <option key={t} value={t}>Talla {t}</option>)}
        </select>
        <select className="entrada" style={{ maxWidth: 160 }} aria-label="Filtrar por color" value={color} onChange={(e) => setColor(e.target.value)}>
          <option value="">Todo color</option>{opciones.colores.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="fila"><input type="checkbox" checked={soloBajo} onChange={(e) => setSoloBajo(e.target.checked)} /> Solo stock bajo o agotado</label>
      </div>
      <div className="fila fila--entre">
        <div className="fila" role="tablist" aria-label="Vista del inventario">
          <button role="tab" aria-selected={vista === 'talla'} className={`btn btn--chico ${vista === 'talla' ? 'btn--primario' : ''}`} onClick={() => setVista('talla')}>Por talla</button>
          <button role="tab" aria-selected={vista === 'modelo'} className={`btn btn--chico ${vista === 'modelo' ? 'btn--primario' : ''}`} onClick={() => setVista('modelo')}>Por modelo</button>
        </div>
        {filas && <span className="tenue chico">{visibles.length} fila(s) · {unidades} unidad(es)</span>}
      </div>
      {error && <p className="aviso aviso--error">No se pudo cargar el inventario.</p>}
      {!filas && !error && <div className="cargando" style={{ height: 160 }} />}
      {filas && vista === 'talla' && (
        <div className="tabla-envoltura"><table className="tabla">
          <thead><tr><th>Modelo</th><th>Color</th><th>Talla</th><th>Cantidad</th><th>Mínimo</th><th>Estado</th></tr></thead>
          <tbody>
            {visibles.length === 0 && <tr><td colSpan="6" className="tenue">No hay filas que mostrar.</td></tr>}
            {visibles.map((r) => (
              <tr key={r.id}>
                <td>{r.modelos?.marcas?.nombre} {r.modelos?.nombre}</td><td>{r.modelos?.color}</td><td>{r.talla}</td><td>{r.cantidad}</td><td>{r.umbral_minimo}</td><td>{INSIGNIA[estadoDe(r)]}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {filas && vista === 'modelo' && (
        <div className="pila">
          {porModelo.length === 0 && <p className="tenue">No hay modelos que mostrar.</p>}
          {porModelo.map((g) => (
            <section key={g.id} className="tarjeta pila" style={{ gap: '.5rem' }}>
              <div className="fila fila--entre"><strong>{g.modelo?.marcas?.nombre} {g.modelo?.nombre} · {g.modelo?.color}</strong><span className="tenue chico">{g.total} unidad(es)</span></div>
              <div className="fila" style={{ gap: '.4rem' }}>
                {g.tallas.map((r) => (
                  <span key={r.id} className={`insignia ${estadoDe(r) === 'agotada' ? 'insignia--aji' : estadoDe(r) === 'bajo' ? 'insignia--aviso' : 'insignia--ok'}`} title={`Mínimo ${r.umbral_minimo}`}>
                    T{r.talla}: {r.cantidad}
                  </span>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
