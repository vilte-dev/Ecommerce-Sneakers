import { useCallback, useEffect, useState } from 'react';
import { fechaHoraBolivia, mensajeError } from '@sneakers/shared';
import { atenderAlerta, guardarUmbrales, listarAlertas, listarModelosActivos, listarStockModelo } from '../features/alertas/api.js';

// HU-14 · Alertas de stock mínimo (canal: panel interno, H-12) y definición del mínimo por modelo/talla (RF-14).
const nombreModelo = (m) => `${m?.marcas?.nombre ?? ''} ${m?.nombre ?? ''} · ${m?.color ?? ''}`;

function ListaAlertas({ atendidas }) {
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState('');
  const cargar = useCallback(() => listarAlertas(atendidas).then((d) => { setFilas(d); setError(''); }).catch((e) => setError(mensajeError(e))), [atendidas]);
  useEffect(() => { cargar(); const t = setInterval(cargar, 60000); return () => clearInterval(t); }, [cargar]);

  async function atender(id) {
    try { await atenderAlerta(id); cargar(); } catch (e) { setError(mensajeError(e)); }
  }
  return (
    <div className="pila">
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      {!filas && !error && <div className="cargando" style={{ height: 120 }} />}
      {filas && (
        <div className="tabla-envoltura"><table className="tabla">
          <thead><tr><th>Modelo</th><th>Talla</th><th>Stock actual</th><th>Mínimo</th><th>{atendidas ? 'Atendida' : 'Desde'}</th><th /></tr></thead>
          <tbody>
            {filas.length === 0 && <tr><td colSpan="6" className="tenue">{atendidas ? 'Aún no hay alertas atendidas.' : 'Sin alertas: todo el stock está sobre el mínimo.'}</td></tr>}
            {filas.map((a) => (
              <tr key={a.id}>
                <td>{nombreModelo(a.stock?.modelos)}</td><td>{a.stock?.talla}</td>
                <td><span className={`insignia ${a.stock?.cantidad === 0 ? 'insignia--aji' : 'insignia--aviso'}`}>{a.stock?.cantidad === 0 ? 'Agotada' : `${a.stock?.cantidad} u.`}</span></td>
                <td>{a.stock?.umbral_minimo}</td>
                <td>{fechaHoraBolivia(atendidas ? a.atendida_en : a.fecha)}</td>
                <td>{!atendidas && <button className="btn btn--chico" onClick={() => atender(a.id)}>Marcar atendida</button>}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}

function Umbrales() {
  const [modelos, setModelos] = useState(null);
  const [modeloId, setModeloId] = useState('');
  const [filas, setFilas] = useState([]);
  const [todas, setTodas] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => { listarModelosActivos().then(setModelos).catch((e) => setError(mensajeError(e))); }, []);
  useEffect(() => {
    setOk(''); setError('');
    if (!modeloId) return setFilas([]);
    listarStockModelo(Number(modeloId)).then((d) => setFilas(d.map((r) => ({ ...r, nuevo: String(r.umbral_minimo) })))).catch((e) => setError(mensajeError(e)));
  }, [modeloId]);

  const valido = (v) => /^\d+$/.test(String(v));
  async function guardar(e) {
    e.preventDefault(); setOk(''); setError('');
    if (filas.some((f) => !valido(f.nuevo))) return setError('El mínimo debe ser un número entero de 0 o más.');
    const cambios = filas.filter((f) => Number(f.nuevo) !== f.umbral_minimo).map((f) => ({ id: f.id, umbral: Number(f.nuevo) }));
    if (!cambios.length) return setOk('No hay cambios.');
    try {
      await guardarUmbrales(cambios);
      setFilas((fs) => fs.map((f) => ({ ...f, umbral_minimo: Number(f.nuevo) })));
      setOk(`Mínimos guardados (${cambios.length} talla(s)).`);
    } catch (err) { setError(mensajeError(err)); }
  }

  return (
    <form className="pila" onSubmit={guardar}>
      <div className="campo" style={{ maxWidth: 420 }}>
        <label htmlFor="mod">Modelo</label>
        <select id="mod" className="entrada" value={modeloId} onChange={(e) => setModeloId(e.target.value)}>
          <option value="">Elige un modelo…</option>
          {modelos?.map((m) => <option key={m.id} value={m.id}>{nombreModelo(m)}</option>)}
        </select>
      </div>
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      {ok && <p className="aviso aviso--ok" role="status">{ok}</p>}
      {modeloId && filas.length === 0 && !error && <p className="tenue">Este modelo aún no tiene tallas con stock registrado.</p>}
      {filas.length > 0 && (
        <>
          <div className="fila">
            <div className="campo"><label htmlFor="todas">Mismo mínimo para todas las tallas</label><input id="todas" className="entrada" style={{ maxWidth: 140 }} inputMode="numeric" value={todas} onChange={(e) => setTodas(e.target.value.replace(/\D/g, ''))} /></div>
            <button type="button" className="btn" disabled={todas === ''} onClick={() => setFilas((fs) => fs.map((f) => ({ ...f, nuevo: todas })))}>Aplicar a todas</button>
          </div>
          <div className="grilla-stock">
            {filas.map((f) => (
              <div className="campo" key={f.id}>
                <label htmlFor={`u${f.id}`}>Talla {f.talla} <span className="tenue chico">({f.cantidad} u.)</span></label>
                <input id={`u${f.id}`} className="entrada" inputMode="numeric" value={f.nuevo} onChange={(e) => setFilas((fs) => fs.map((x) => (x.id === f.id ? { ...x, nuevo: e.target.value.replace(/\D/g, '') } : x)))} />
              </div>
            ))}
          </div>
          <div><button className="btn btn--primario">Guardar mínimos</button></div>
        </>
      )}
    </form>
  );
}

export default function Alertas() {
  const [tab, setTab] = useState('abiertas');
  const TABS = [['abiertas', 'Alertas abiertas'], ['atendidas', 'Atendidas'], ['umbrales', 'Definir mínimos']];
  return (
    <div className="pila">
      <h1 style={{ fontSize: '2rem' }}>Alertas de stock</h1>
      <p className="tenue">Se crea una alerta cuando una talla llega a su mínimo y se cierra sola al reponer el stock. Mínimo por defecto: 2 unidades.</p>
      <div className="fila" role="tablist" aria-label="Secciones">
        {TABS.map(([k, t]) => <button key={k} role="tab" aria-selected={tab === k} className={`btn btn--chico ${tab === k ? 'btn--primario' : ''}`} onClick={() => setTab(k)}>{t}</button>)}
      </div>
      {tab === 'abiertas' && <ListaAlertas atendidas={false} />}
      {tab === 'atendidas' && <ListaAlertas atendidas />}
      {tab === 'umbrales' && <Umbrales />}
    </div>
  );
}
