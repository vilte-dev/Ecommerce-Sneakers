import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ESTADOS_DESPACHO, PLANTILLAS, enlaceWhatsApp, estadoPedido, etiquetaDespacho, etiquetaPagoContraEntrega, formatBs, mensajeError } from '@sneakers/shared';
import * as api from '../features/pedidos/api.js';

export default function PedidoInterno() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [estado, setEstado] = useState('cargando');
  const [foto, setFoto] = useState(null);
  const [repartidores, setRepartidores] = useState([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [rep, setRep] = useState('');
  const [nuevo, setNuevo] = useState({ nombre: '', telefono: '' });
  const [plantilla, setPlantilla] = useState('confirmado');
  const [estadoDesp, setEstadoDesp] = useState('en_camino');

  const cargar = useCallback(async () => {
    try {
      const d = await api.obtenerPedido(Number(id));
      setP(d);
      setEstado(d ? 'listo' : 'noexiste');
      const c = [...(d?.comprobantes_pago ?? [])].sort((a, b) => b.id - a.id)[0];
      if (c && d.estado === 'en_revision') api.urlComprobante(c.imagen_url).then(setFoto).catch(() => setFoto(null));
      else setFoto(null);
    } catch { setEstado('error'); }
  }, [id]);
  useEffect(() => { cargar(); api.listarRepartidores().then(setRepartidores).catch(() => {}); }, [cargar]);

  async function accion(fn, mensajeOk) {
    setError(''); setOk(''); setTrabajando(true);
    try { await fn(); setOk(mensajeOk); setMotivo(''); await cargar(); }
    catch (e) { setError(mensajeError(e)); await cargar(); }
    finally { setTrabajando(false); }
  }
  const confirmar = (texto, fn, ok) => window.confirm(texto) && accion(fn, ok);

  async function agregarRepartidor(e) {
    e.preventDefault();
    if (!nuevo.nombre.trim()) return;
    try {
      const nid = await api.crearRepartidor(nuevo.nombre, nuevo.telefono);
      setRepartidores(await api.listarRepartidores());
      setRep(String(nid)); setNuevo({ nombre: '', telefono: '' });
    } catch (err) { setError(mensajeError(err)); }
  }

  if (estado === 'cargando') return <div className="cargando" style={{ height: 240 }} />;
  if (estado === 'error') return <p className="aviso aviso--error">No se pudo cargar el pedido.</p>;
  if (estado === 'noexiste') return <div className="pila"><p>No existe ese pedido.</p><Link className="btn" to="/pedidos">Volver</Link></div>;

  const e = estadoPedido(p);
  const desp = Array.isArray(p.despachos) ? p.despachos[0] : p.despachos;
  const comp = [...p.comprobantes_pago].sort((a, b) => b.id - a.id)[0];
  const nombre = p.clientes?.usuarios?.nombre;
  const telefono = p.telefono || p.clientes?.celular;
  const subtotal = p.detalle_pedido.reduce((n, d) => n + d.cantidad * Number(d.precio_unitario), 0);
  const ultimoRechazo = comp?.estado === 'rechazado' ? comp.motivo_rechazo : '';

  // RN-13: el mensaje solo se prepara; el empleado lo envía desde su WhatsApp.
  const textoWa = PLANTILLAS[plantilla].texto({ nombre, pedido: p.id, motivo: ultimoRechazo, repartidor: desp?.repartidores?.nombre });
  const enlaceWa = enlaceWhatsApp(telefono, textoWa);
  const abierto = !['entregado', 'cancelado'].includes(p.estado);

  return (
    <div className="pila" style={{ maxWidth: 860 }}>
      <div className="fila fila--entre">
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Pedido N.º {p.id}</h1>
        <span className={`insignia ${e.clase}`}>{e.texto}</span>
      </div>
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      {ok && <p className="aviso aviso--ok" role="status">{ok}</p>}

      <div className="dos-col">
        <section className="tarjeta pila" style={{ gap: '.4rem' }}>
          <h2>Cliente y entrega</h2>
          <div>{nombre ?? '–'}</div>
          <div className="tenue chico">{p.clientes?.celular} · {p.clientes?.correo}</div>
          <div><strong>{etiquetaDespacho(p)}</strong></div>
          {p.metodo_despacho === 'domicilio' && <div className="chico">{p.direccion}<br />Contacto: {p.telefono}</div>}
          <div className="chico">Pago: {etiquetaPagoContraEntrega(p.pago_contra_entrega)}</div>
          <div className="tenue chico">{new Date(p.fecha).toLocaleString('es-BO')}</div>
        </section>
        <section className="tarjeta pila" style={{ gap: '.4rem' }}>
          <h2>Detalle</h2>
          {p.detalle_pedido.map((d) => (
            <div key={d.id} className="fila fila--entre chico"><span>{d.cantidad} × {d.modelos?.marcas?.nombre} {d.modelos?.nombre} {d.modelos?.color} · T{d.talla}</span><span>{formatBs(d.cantidad * Number(d.precio_unitario))}</span></div>
          ))}
          <div className="fila fila--entre chico"><span>Subtotal</span><span>{formatBs(subtotal)}</span></div>
          {Number(p.costo_envio) > 0 && <div className="fila fila--entre chico"><span>Envío</span><span>{formatBs(p.costo_envio)}</span></div>}
          <div className="fila fila--entre"><strong>Total a cobrar</strong><strong className="precio">{formatBs(p.total)}</strong></div>
        </section>
      </div>

      {/* HU-11 · validar comprobante */}
      {p.estado === 'en_revision' && (
        <section className="tarjeta pila">
          <h2>Comprobante de pago</h2>
          <p className="tenue chico" style={{ margin: 0 }}>Verifica en tu banca que llegaron <strong>{formatBs(p.total)}</strong> antes de validar.</p>
          {foto ? <a href={foto} target="_blank" rel="noopener noreferrer"><img src={foto} alt="Comprobante enviado por el cliente" style={{ maxHeight: 420, objectFit: 'contain', background: '#fff', borderRadius: 10 }} /></a> : <div className="cargando" style={{ height: 120 }} />}
          <div className="fila">
            <button className="btn btn--primario" disabled={trabajando} onClick={() => confirmar('¿Validar el pago? Se descontará el stock de este pedido.', () => api.confirmarPedido(p.id), 'Pago validado y stock descontado.')}>Validar pago y descontar stock</button>
          </div>
          <div className="fila">
            <input className="entrada" style={{ flex: 1, minWidth: 220 }} placeholder="Motivo del rechazo (lo verá el cliente)" aria-label="Motivo del rechazo" value={motivo} onChange={(ev) => setMotivo(ev.target.value)} />
            <button className="btn btn--peligro" disabled={trabajando} onClick={() => accion(() => api.rechazarComprobante(p.id, motivo), 'Comprobante rechazado. El cliente puede subir otro.')}>Rechazar</button>
          </div>
        </section>
      )}
      {p.estado === 'pendiente_pago' && !p.pago_contra_entrega && <p className="aviso aviso--info">Esperando que el cliente suba su comprobante.{ultimoRechazo && ` Último rechazo: ${ultimoRechazo}.`}</p>}
      {p.estado === 'pendiente_pago' && p.pago_contra_entrega && (
        <section className="tarjeta pila">
          <h2>Pedido contra entrega</h2>
          <p className="tenue chico" style={{ margin: 0 }}>No hay comprobante. Al confirmar se descuenta el stock y el pedido queda listo para despachar.</p>
          <div><button className="btn btn--primario" disabled={trabajando} onClick={() => confirmar('¿Confirmar el pedido? Se descontará el stock.', () => api.confirmarPedido(p.id), 'Pedido confirmado y stock descontado.')}>Confirmar pedido y descontar stock</button></div>
        </section>
      )}

      {/* HU-12 · entrega */}
      {p.estado === 'pagado' && p.metodo_despacho === 'retiro' && (
        <section className="tarjeta pila"><h2>Retiro en tienda</h2>
          <div><button className="btn btn--primario" disabled={trabajando} onClick={() => accion(() => api.marcarListoRetiro(p.id), 'Pedido listo para retiro.')}>Marcar listo para retiro</button></div></section>
      )}
      {p.estado === 'listo_retiro' && (
        <section className="tarjeta pila"><h2>Retiro en tienda</h2>
          <div><button className="btn btn--primario" disabled={trabajando} onClick={() => confirmar('¿El cliente ya retiró su pedido?', () => api.marcarRetirado(p.id), 'Pedido entregado.')}>Marcar como retirado</button></div></section>
      )}
      {['pagado', 'en_despacho'].includes(p.estado) && p.metodo_despacho === 'domicilio' && (!desp || desp.estado === 'no_entregado') && (
        <section className="tarjeta pila">
          <h2>{desp ? 'Reasignar repartidor' : 'Asignar repartidor'}</h2>
          <div className="fila">
            <select className="entrada" style={{ flex: 1, minWidth: 200 }} aria-label="Repartidor" value={rep} onChange={(ev) => setRep(ev.target.value)}>
              <option value="">Elige un repartidor</option>
              {repartidores.map((r) => <option key={r.id} value={r.id}>{r.nombre}{r.telefono ? ` · ${r.telefono}` : ''}</option>)}
            </select>
            <button className="btn btn--primario" disabled={!rep || trabajando} onClick={() => accion(() => api.asignarDespacho(p.id, Number(rep)), 'Repartidor asignado. El pedido está en despacho.')}>Asignar y despachar</button>
          </div>
          <form className="fila" onSubmit={agregarRepartidor}>
            <input className="entrada" style={{ flex: 1, minWidth: 160 }} placeholder="Nuevo repartidor (nombre)" aria-label="Nombre del nuevo repartidor" value={nuevo.nombre} onChange={(ev) => setNuevo({ ...nuevo, nombre: ev.target.value })} />
            <input className="entrada" style={{ width: 140 }} placeholder="Teléfono" aria-label="Teléfono del repartidor" inputMode="numeric" value={nuevo.telefono} onChange={(ev) => setNuevo({ ...nuevo, telefono: ev.target.value })} />
            <button className="btn">Agregar</button>
          </form>
        </section>
      )}
      {p.estado === 'en_despacho' && desp && desp.estado !== 'no_entregado' && (
        <section className="tarjeta pila">
          <h2>Despacho</h2>
          <p style={{ margin: 0 }}>Repartidor: <strong>{desp.repartidores?.nombre}</strong> · Estado: <strong>{ESTADOS_DESPACHO[desp.estado]}</strong></p>
          <div className="fila">
            <select className="entrada" style={{ maxWidth: 220 }} aria-label="Nuevo estado del despacho" value={estadoDesp} onChange={(ev) => setEstadoDesp(ev.target.value)}>
              {Object.entries(ESTADOS_DESPACHO).filter(([k]) => k !== 'asignado').map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
            {estadoDesp === 'no_entregado' && <input className="entrada" style={{ flex: 1, minWidth: 200 }} placeholder="Motivo (obligatorio)" aria-label="Motivo de no entrega" value={motivo} onChange={(ev) => setMotivo(ev.target.value)} />}
            <button className="btn btn--primario" disabled={trabajando} onClick={() => accion(() => api.actualizarDespacho(p.id, estadoDesp, motivo), 'Despacho actualizado.')}>Actualizar</button>
          </div>
        </section>
      )}
      {desp?.despacho_historial?.length > 0 && (
        <section className="tarjeta pila" style={{ gap: '.3rem' }}>
          <h2>Historial del despacho</h2>
          {[...desp.despacho_historial].sort((a, b) => a.id - b.id).map((h) => (
            <div key={h.id} className="chico">{new Date(h.fecha).toLocaleString('es-BO')} · <strong>{ESTADOS_DESPACHO[h.estado]}</strong>{h.motivo ? ` (${h.motivo})` : ''} · {h.usuarios?.nombre ?? '—'}</div>
          ))}
        </section>
      )}

      {/* HU-12 · aviso por WhatsApp con un botón (no se envía solo) */}
      {abierto && (
        <section className="tarjeta pila">
          <h2>Avisar por WhatsApp</h2>
          <div className="fila">
            <select className="entrada" style={{ maxWidth: 260 }} aria-label="Plantilla de mensaje" value={plantilla} onChange={(ev) => setPlantilla(ev.target.value)}>
              {Object.entries(PLANTILLAS).map(([k, t]) => <option key={k} value={k}>{t.etiqueta}</option>)}
            </select>
            {enlaceWa
              ? <a className="btn btn--primario" href={enlaceWa} target="_blank" rel="noopener noreferrer">Abrir WhatsApp con el mensaje</a>
              : <button className="btn" disabled>Abrir WhatsApp</button>}
          </div>
          {!enlaceWa && <p className="aviso aviso--info">El cliente no tiene un número válido registrado.</p>}
          <p className="tenue chico" style={{ margin: 0 }}>Vista previa: “{textoWa}” — tú lo envías desde WhatsApp; el sistema no manda mensajes solo.</p>
        </section>
      )}

      <div className="fila">
        <Link className="btn" to="/pedidos">Volver a pedidos</Link>
        {['pendiente_pago', 'en_revision'].includes(p.estado) && <button className="btn btn--peligro" disabled={trabajando} onClick={() => confirmar('¿Cancelar este pedido? No se puede deshacer.', () => api.cancelarPedido(p.id), 'Pedido cancelado.')}>Cancelar pedido</button>}
      </div>
    </div>
  );
}
