import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agregarLinea, calcularTotales, cambiarCantidadLinea, codigoModelo, coincideBusqueda, formatBs, mensajeError } from '@sneakers/shared';
import { cargarCatalogoPos, consultarCliente, registrarVenta } from '../features/caja/api.js';
import { useConexion } from '../lib/ConexionContext.jsx';
import BloqueoCaja from '../components/BloqueoCaja.jsx';

const MAX_RESULTADOS = 12;
const nuevaClave = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`.padEnd(36, '0'));

// HU-15 · Punto de venta. Venta estándar en 3 clics: (1) toca la talla del modelo, (2) Cobrar, (3) Imprimir.
// RNF-09 pide máximo 4. HU-24: sin internet la caja se congela (BloqueoCaja) y los botones se deshabilitan.
export default function Pos() {
  const navegar = useNavigate();
  const { enLinea, reportar } = useConexion();
  const [modelos, setModelos] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [q, setQ] = useState('');
  const [lineas, setLineas] = useState([]);
  const [cli, setCli] = useState({ ci: '', celular: '', nombre: '' });
  const [infoCli, setInfoCli] = useState(null);
  const [errorCli, setErrorCli] = useState('');
  const [error, setError] = useState('');
  const [cobrando, setCobrando] = useState(false);
  const clave = useRef(nuevaClave());
  const buscador = useRef(null);

  const cargar = useCallback(() => cargarCatalogoPos().then((d) => { setModelos(d); setErrorCarga(''); }).catch((e) => setErrorCarga(mensajeError(e))), []);
  useEffect(() => { cargar(); buscador.current?.focus(); }, [cargar]);
  useEffect(() => { if (enLinea) cargar(); }, [enLinea, cargar]);   // al volver internet se actualiza el stock

  const resultados = useMemo(() => (modelos ?? []).filter((m) => coincideBusqueda(m, q)), [modelos, q]);
  const pct = Number(infoCli?.descuento_pct) || 0;
  const t = useMemo(() => calcularTotales(lineas, pct), [lineas, pct]);

  const agregar = (m, talla) => {
    setError('');
    setLineas((ls) => agregarLinea(ls, { modeloId: m.id, talla: talla.talla, stock: talla.cantidad, precio: m.precio, nombre: `${m.marca} ${m.nombre} ${m.color}` }));
  };

  async function buscarCliente() {
    setErrorCli(''); setInfoCli(null);
    if (!cli.ci.trim() && !cli.celular.trim()) return setErrorCli('Escribe el CI o el celular del cliente.');
    try {
      const r = await consultarCliente(cli);
      setInfoCli(r);
      if (r.existe) setCli((c) => ({ ...c, nombre: c.nombre || r.nombre || '', celular: c.celular || r.celular || '', ci: c.ci || r.ci || '' }));
    } catch (e) { setErrorCli(mensajeError(e)); if (/Failed to fetch|NetworkError/i.test(e?.message)) reportar(false); }
  }
  const editarCli = (campo, v) => { setCli((c) => ({ ...c, [campo]: v })); setInfoCli(null); };

  async function cobrar(forma) {
    if (cobrando || lineas.length === 0 || !enLinea) return;
    setError(''); setCobrando(true);
    try {
      const id = await registrarVenta({ lineas, forma, ...cli, clave: clave.current });
      clave.current = nuevaClave();
      navegar(`/ventas/${id}`, { replace: true, state: { nueva: true } });
    } catch (e) {
      // Si falló por red se conserva la MISMA clave: al reintentar, la venta no se duplica aunque el servidor ya la hubiera guardado.
      if (/Failed to fetch|NetworkError/i.test(e?.message)) { reportar(false); setError('Se perdió la conexión. Cuando vuelva, revisa en "Ventas" si la venta quedó registrada antes de cobrar de nuevo.'); }
      else { setError(mensajeError(e)); cargar(); }
      setCobrando(false);
    }
  }

  return (
    <div className="pos">
      <BloqueoCaja />
      <section className="pos__buscar pila" aria-label="Buscar calzado">
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Punto de venta</h1>
        <input ref={buscador} className="entrada entrada--grande" type="search" inputMode="search" autoComplete="off"
          placeholder="Buscar por código (M0012) o nombre" aria-label="Buscar por código o nombre de calzado" value={q} onChange={(e) => setQ(e.target.value)} />
        {errorCarga && <p className="aviso aviso--error" role="alert">{errorCarga} <button className="btn btn--chico" onClick={cargar}>Reintentar</button></p>}
        {!modelos && !errorCarga && <div className="cargando" style={{ height: 160 }} />}
        {modelos && resultados.length === 0 && <p className="aviso aviso--info">No hay calzado que coincida con “{q}”.</p>}
        <div className="pos__resultados">
          {resultados.slice(0, MAX_RESULTADOS).map((m) => (
            <div className="tarjeta pos__modelo" key={m.id}>
              <div className="pos__foto">{m.foto ? <img src={m.foto} alt="" /> : <span aria-hidden="true">👟</span>}</div>
              <div className="pila" style={{ gap: '.35rem' }}>
                <div className="fila fila--entre"><strong>{m.marca} {m.nombre} · {m.color}</strong><span className="precio">{formatBs(m.precio)}</span></div>
                <span className="tenue chico">Cód. {codigoModelo(m.id)}</span>
                <div className="tallas" role="group" aria-label={`Tallas de ${m.nombre} ${m.color}`}>
                  {m.tallas.map((ta) => {
                    const enCarrito = lineas.find((l) => l.modeloId === m.id && l.talla === ta.talla)?.cantidad ?? 0;
                    return (
                      <button key={ta.talla} className="talla" disabled={ta.cantidad === 0 || enCarrito >= ta.cantidad || !enLinea}
                        aria-label={`Talla ${ta.talla}, ${ta.cantidad} disponible(s)`} onClick={() => agregar(m, ta)}>
                        {ta.talla}<small className="talla__n">{ta.cantidad - enCarrito}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
        {resultados.length > MAX_RESULTADOS && <p className="ayuda">Mostrando {MAX_RESULTADOS} de {resultados.length}. Escribe más del nombre para acotar.</p>}
      </section>

      <aside className="pos__venta tarjeta pila" aria-label="Venta en curso">
        <h2>Venta en curso</h2>
        {lineas.length === 0 && <p className="tenue">Toca una talla para agregarla.</p>}
        {lineas.map((l) => (
          <div className="pos__linea" key={`${l.modeloId}-${l.talla}`}>
            <div><strong>{l.nombre}</strong><div className="tenue chico">Talla {l.talla} · {formatBs(l.precio)}</div></div>
            <div className="cantidad" role="group" aria-label={`Cantidad de ${l.nombre} talla ${l.talla}`}>
              <button aria-label="Quitar una unidad" onClick={() => setLineas((ls) => cambiarCantidadLinea(ls, l.modeloId, l.talla, l.cantidad - 1))}>−</button>
              <span>{l.cantidad}</span>
              <button aria-label="Agregar una unidad" disabled={l.cantidad >= l.stock} onClick={() => setLineas((ls) => cambiarCantidadLinea(ls, l.modeloId, l.talla, l.cantidad + 1))}>+</button>
            </div>
            <strong>{formatBs(l.precio * l.cantidad)}</strong>
          </div>
        ))}

        <details className="pos__cliente">
          <summary>Cliente (opcional, para fidelidad)</summary>
          <div className="pila" style={{ marginTop: '.6rem', gap: '.6rem' }}>
            <div className="dos-col">
              <div className="campo"><label htmlFor="pos-ci">CI</label><input id="pos-ci" className="entrada" inputMode="numeric" autoComplete="off" value={cli.ci} onChange={(e) => editarCli('ci', e.target.value)} /></div>
              <div className="campo"><label htmlFor="pos-cel">Celular</label><input id="pos-cel" className="entrada" inputMode="numeric" maxLength={8} autoComplete="off" value={cli.celular} onChange={(e) => editarCli('celular', e.target.value.replace(/\D/g, ''))} /></div>
            </div>
            <div className="campo"><label htmlFor="pos-nom">Nombre (opcional)</label><input id="pos-nom" className="entrada" maxLength={100} autoComplete="off" value={cli.nombre} onChange={(e) => setCli({ ...cli, nombre: e.target.value })} /></div>
            <button type="button" className="btn btn--chico" onClick={buscarCliente} disabled={!enLinea}>Buscar cliente</button>
            {errorCli && <p className="aviso aviso--error" role="alert">{errorCli}</p>}
            {infoCli && !infoCli.existe && <p className="aviso aviso--info" role="status">Cliente nuevo: se registrará con esta venta (necesita celular).</p>}
            {infoCli?.existe && (
              <p className={`aviso ${pct ? 'aviso--ok' : 'aviso--info'}`} role="status">
                <strong>{infoCli.nombre || `Cel. ${infoCli.celular}`}</strong> · {infoCli.compras} compra(s).{' '}
                {pct ? `Tiene ${pct} % de descuento por fidelidad en esta venta.` : `Le faltan ${infoCli.faltan} para su descuento.`}
              </p>
            )}
          </div>
        </details>

        <div className="pila" style={{ gap: '.3rem' }}>
          <div className="fila fila--entre"><span>Subtotal ({t.unidades} u.)</span><span>{formatBs(t.subtotal)}</span></div>
          {t.descuento > 0 && <div className="fila fila--entre"><span>Descuento fidelidad ({pct} %)</span><span>−{formatBs(t.descuento)}</span></div>}
          <div className="fila fila--entre"><strong>Total</strong><span className="precio" style={{ fontSize: '1.8rem' }}>{formatBs(t.total)}</span></div>
        </div>
        {error && <p className="aviso aviso--error" role="alert">{error}</p>}
        <div className="dos-col">
          <button className="btn btn--primario btn--grande" disabled={lineas.length === 0 || cobrando || !enLinea} onClick={() => cobrar('efectivo')}>{cobrando ? 'Registrando…' : 'Cobrar efectivo'}</button>
          <button className="btn btn--grande" disabled={lineas.length === 0 || cobrando || !enLinea} onClick={() => cobrar('qr')}>Cobrar con QR</button>
        </div>
        <p className="ayuda">QR: solo se registra el pago; confirma en tu app del banco que el cliente ya pagó antes de cobrar.</p>
        {lineas.length > 0 && <button className="btn btn--chico btn--peligro" onClick={() => setLineas([])}>Vaciar venta</button>}
      </aside>
    </div>
  );
}
