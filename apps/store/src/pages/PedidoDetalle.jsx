import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ESTADOS_DESPACHO, estadoPedido, etiquetaDespacho, etiquetaPagoContraEntrega, formatBs, mensajeError } from '@sneakers/shared';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { cancelarPedido, datosDePago, obtenerPedido, subirComprobante, validarImagen } from '../features/orders/api.js';
import SeguimientoPedido from '../components/SeguimientoPedido.jsx';

export default function PedidoDetalle() {
  const { id } = useParams();
  const { user } = useAuth();
  const [pedido, setPedido] = useState(null);
  const [pago, setPago] = useState(null);
  const [estado, setEstado] = useState('cargando');
  const [archivo, setArchivo] = useState(null);
  const [vista, setVista] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  const cargar = useCallback(async () => {
    const num = Number(id);
    if (!Number.isInteger(num)) return setEstado('noexiste');
    try {
      const p = await obtenerPedido(num);
      setPedido(p);
      setEstado(p ? 'listo' : 'noexiste');
    } catch {
      setEstado('error');
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { datosDePago().then(setPago).catch(() => setPago({ cuentas: [], qr: null, costoEnvio: 0 })); }, []);
  // El estado cambia cuando el negocio valida: se refresca cada 30 s mientras el pedido siga abierto.
  useEffect(() => {
    if (!pedido || ['entregado', 'cancelado'].includes(pedido.estado)) return undefined;
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
  }, [pedido?.estado, cargar]);
  useEffect(() => () => vista && URL.revokeObjectURL(vista), [vista]);

  function elegir(e) {
    const f = e.target.files?.[0] ?? null;
    setError(''); setOk('');
    const problema = f ? validarImagen(f) : null;
    if (problema) { setArchivo(null); setVista(null); return setError(problema); }
    setArchivo(f);
    setVista(f ? URL.createObjectURL(f) : null);
  }

  async function enviarComprobante() {
    setError(''); setOk('');
    const problema = validarImagen(archivo);
    if (problema) return setError(problema);
    setSubiendo(true);
    try {
      await subirComprobante(pedido.id, user.id, archivo);
      setArchivo(null); setVista(null);
      setOk('Recibimos tu comprobante. Un empleado lo revisará en breve.');
      await cargar();
    } catch (err) {
      // El pedido no se pierde: el cliente puede reintentar con la misma imagen.
      setError(`${mensajeError(err)} Tu pedido sigue guardado; puedes reintentar.`);
    } finally {
      setSubiendo(false);
    }
  }

  async function cancelar() {
    if (!window.confirm('¿Cancelar este pedido? Esta acción no se puede deshacer.')) return;
    setError('');
    try { await cancelarPedido(pedido.id); await cargar(); } catch (err) { setError(mensajeError(err)); }
  }

  if (estado === 'cargando') return <div className="cargando" style={{ height: 240 }} aria-label="Cargando" />;
  if (estado === 'error') return <p className="aviso aviso--error">No pudimos cargar el pedido. Inténtalo de nuevo.</p>;
  if (estado === 'noexiste') return <div className="pila"><p>No encontramos ese pedido.</p><Link className="btn" to="/mis-pedidos">Mis pedidos</Link></div>;

  const e = estadoPedido(pedido);
  const anticipado = !pedido.pago_contra_entrega;
  const comprobantes = [...(pedido.comprobantes_pago ?? [])].sort((a, b) => b.id - a.id);
  const rechazado = pedido.estado === 'pendiente_pago' && comprobantes[0]?.estado === 'rechazado' ? comprobantes[0] : null;
  const debePagar = anticipado && ['pendiente_pago', 'en_revision'].includes(pedido.estado);
  const subtotal = pedido.detalle_pedido.reduce((n, d) => n + d.cantidad * Number(d.precio_unitario), 0);
  const desp = Array.isArray(pedido.despachos) ? pedido.despachos[0] : pedido.despachos;
  const puedeCancelar = ['pendiente_pago', 'en_revision'].includes(pedido.estado);

  return (
    <div className="pila" style={{ maxWidth: 720 }}>
      <div className="fila fila--entre">
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Pedido N.º {pedido.id}</h1>
        <span className={`insignia ${e.clase}`}>{e.texto}</span>
      </div>
      <p className="tenue" style={{ margin: 0 }}>{new Date(pedido.fecha).toLocaleString('es-BO')} · {etiquetaDespacho(pedido)}</p>
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      {ok && <p className="aviso aviso--ok" role="status">{ok}</p>}

      {/* HU-09 · cuentas, QR y monto para pagar por adelantado (consultable cuando quieras desde este detalle) */}
      {debePagar && (
        <section className="tarjeta pila" aria-label="Instrucciones de pago">
          <h2>Cómo pagar</h2>
          <p>Transfiere <strong>{formatBs(pedido.total)}</strong> a una de estas cuentas o paga con el QR. Usa como referencia el <strong>pedido N.º {pedido.id}</strong>.</p>
          {pago && pago.cuentas.length === 0 && !pago.qr && <p className="aviso aviso--info">El negocio aún no publicó sus datos de pago. Escríbenos para coordinar.</p>}
          {pago?.cuentas.map((c) => (
            <div key={c.id} className="tarjeta" style={{ background: 'var(--papel)' }}>
              <strong>{c.banco}</strong> · {c.tipo}<br />
              <span className="tenue chico">Titular: {c.titular}</span><br />
              <span style={{ font: '700 1.15rem var(--titulos)' }}>{c.numero}</span>
            </div>
          ))}
          {pago?.qr && (
            <div className="pila" style={{ justifyItems: 'center' }}>
              <img src={pago.qr} alt="Código QR para pagar el pedido" width="240" height="240" style={{ objectFit: 'contain', background: '#fff', borderRadius: 10 }} />
              <span className="ayuda">Escanea el QR desde tu app bancaria.</span>
            </div>
          )}
        </section>
      )}

      {/* HU-10 · subir comprobante */}
      {debePagar && (
        <section className="tarjeta pila" aria-label="Comprobante de pago">
          <h2>Tu comprobante</h2>
          {rechazado && (
            <p className="aviso aviso--error" role="alert"><strong>No pudimos validar tu comprobante.</strong> Motivo: {rechazado.motivo_rechazo}. Sube uno nuevo.</p>
          )}
          {pedido.estado === 'en_revision' && !archivo && (
            <p className="aviso aviso--info">Tu comprobante está en revisión. Si te equivocaste de foto, puedes subir otra.</p>
          )}
          <div className="campo">
            <label htmlFor="comprobante">Foto del comprobante (JPG o PNG)</label>
            <input id="comprobante" className="entrada" type="file" accept="image/jpeg,image/png" onChange={elegir} />
            <span className="ayuda">Puedes tomar la foto con la cámara o elegirla de tu galería.</span>
          </div>
          {vista && <img src={vista} alt="Vista previa del comprobante" style={{ maxHeight: 260, objectFit: 'contain', borderRadius: 10, background: '#fff' }} />}
          <button className="btn btn--primario btn--bloque" disabled={!archivo || subiendo} onClick={enviarComprobante}>
            {subiendo ? 'Subiendo…' : pedido.estado === 'en_revision' ? 'Reemplazar comprobante' : 'Enviar comprobante'}
          </button>
        </section>
      )}

      {!anticipado && pedido.estado === 'pendiente_pago' && (
        <p className="aviso aviso--info">Pagarás <strong>{formatBs(pedido.total)}</strong> ({etiquetaPagoContraEntrega(pedido.pago_contra_entrega).toLowerCase()}). Un empleado confirmará tu pedido en breve.</p>
      )}

      <section className="tarjeta pila" aria-label="Seguimiento">
        <h2>Seguimiento</h2>
        <SeguimientoPedido pedido={pedido} />
        {desp && <p className="chico" style={{ margin: 0 }}>Despacho: <strong>{ESTADOS_DESPACHO[desp.estado]}</strong>{desp.motivo ? ` (${desp.motivo})` : ''}</p>}
      </section>

      <section className="tarjeta pila" aria-label="Detalle del pedido" style={{ gap: '.5rem' }}>
        <h2>Detalle</h2>
        {pedido.detalle_pedido.map((d) => (
          <div className="fila fila--entre chico" key={d.id}>
            <span>{d.cantidad} × {d.modelos?.marcas?.nombre} {d.modelos?.nombre} {d.modelos?.color} · talla {d.talla}</span>
            <span>{formatBs(d.cantidad * Number(d.precio_unitario))}</span>
          </div>
        ))}
        <hr style={{ border: 0, borderTop: '1px solid var(--linea)', width: '100%' }} />
        <div className="fila fila--entre"><span>Subtotal</span><span>{formatBs(subtotal)}</span></div>
        {Number(pedido.descuento) > 0 && <div className="fila fila--entre"><span>Descuento</span><span>−{formatBs(pedido.descuento)}</span></div>}
        {pedido.metodo_despacho === 'domicilio' && <div className="fila fila--entre"><span>Envío</span><span>{formatBs(pedido.costo_envio)}</span></div>}
        <div className="fila fila--entre"><strong>Total</strong><strong className="precio">{formatBs(pedido.total)}</strong></div>
        {pedido.metodo_despacho === 'domicilio' && <p className="tenue chico" style={{ margin: 0 }}>Entrega en: {pedido.direccion} · Contacto: {pedido.telefono}</p>}
        <p className="tenue chico" style={{ margin: 0 }}>Pago: {etiquetaPagoContraEntrega(pedido.pago_contra_entrega)}</p>
      </section>

      <div className="fila">
        <Link className="btn" to="/mis-pedidos">Mis pedidos</Link>
        {puedeCancelar && <button className="btn btn--peligro" onClick={cancelar}>Cancelar pedido</button>}
      </div>
    </div>
  );
}
