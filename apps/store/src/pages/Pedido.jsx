import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { formatBs, mensajeError } from '@sneakers/shared';
import { useCart } from '../features/cart/CartContext.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { crearPedido, datosDePago, miFidelidad } from '../features/orders/api.js';

// HU-08 · Confirmar el pedido con envío a domicilio en Tarija o retiro en tienda.
export default function Pedido() {
  const { items, total, vaciar } = useCart();
  const { user } = useAuth();
  const navegar = useNavigate();
  const creado = useRef(false);
  const [metodo, setMetodo] = useState('retiro');
  const [ciudad, setCiudad] = useState('Tarija');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState(user?.user_metadata?.celular ?? '');
  const [pago, setPago] = useState('anticipado'); // anticipado | efectivo | qr
  const [envio, setEnvio] = useState(null);
  const [fidelidad, setFidelidad] = useState(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    datosDePago().then((d) => setEnvio(d.costoEnvio)).catch(() => setEnvio(0));
    miFidelidad().then(setFidelidad).catch(() => {});
  }, []);

  const costoEnvio = metodo === 'domicilio' ? envio ?? 0 : 0;
  const fueraDeTarija = metodo === 'domicilio' && ciudad !== 'Tarija';
  // HU-18: el servidor aplica el descuento; aquí solo se muestra con el mismo redondeo (round a 2 decimales).
  const pct = Number(fidelidad?.descuento_pct) || 0;
  const descuento = useMemo(() => (pct > 0 ? Math.round(total * 100 * pct / 100) / 100 : 0), [total, pct]);
  const totalFinal = useMemo(() => total - descuento + costoEnvio, [total, descuento, costoEnvio]);

  if (items.length === 0 && !creado.current) return <Navigate to="/carrito" replace />;

  async function confirmar(e) {
    e.preventDefault();
    setError('');
    if (fueraDeTarija) return setError('Solo enviamos dentro de la ciudad de Tarija. Elige retiro en tienda.');
    if (metodo === 'domicilio') {
      if (direccion.trim().length < 5) return setError('Escribe la dirección de entrega (calle, número y zona).');
      if (!/^[67]\d{7}$/.test(telefono)) return setError('Ingresa un celular de contacto de 8 dígitos, por ejemplo 71234567.');
    }
    setEnviando(true);
    try {
      const id = await crearPedido({
        items, metodo,
        direccion: metodo === 'domicilio' ? `${direccion.trim()}, Tarija` : null,
        telefono: metodo === 'domicilio' ? telefono : null,
        contraEntrega: metodo === 'domicilio' && pago !== 'anticipado' ? pago : null,
      });
      creado.current = true;
      vaciar();
      navegar(`/pedido/${id}`, { replace: true });
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  }

  return (
    <form className="pila" style={{ maxWidth: 640 }} onSubmit={confirmar}>
      <h1 style={{ fontSize: '2rem' }}>Confirmar pedido</h1>
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}

      <fieldset className="tarjeta pila" style={{ margin: 0 }}>
        <legend className="etiqueta">¿Cómo lo recibes?</legend>
        <label className="fila"><input type="radio" name="metodo" checked={metodo === 'retiro'} onChange={() => { setMetodo('retiro'); setPago('anticipado'); }} /> Retiro en tienda (Tarija)</label>
        <label className="fila"><input type="radio" name="metodo" checked={metodo === 'domicilio'} onChange={() => setMetodo('domicilio')} /> Envío a domicilio en Tarija</label>
        {metodo === 'domicilio' && (
          <div className="pila">
            <div className="campo"><label htmlFor="ciudad">Ciudad</label>
              <select id="ciudad" className="entrada" value={ciudad} onChange={(e) => setCiudad(e.target.value)}>
                <option>Tarija</option><option value="otra">Otra ciudad</option>
              </select></div>
            {fueraDeTarija ? (
              <p className="aviso aviso--info" role="status">Por ahora solo enviamos dentro de Tarija. Puedes elegir <strong>retiro en tienda</strong>.</p>
            ) : (
              <>
                <div className="campo"><label htmlFor="direccion">Dirección de entrega</label>
                  <textarea id="direccion" className="entrada" rows={2} maxLength={200} placeholder="Calle, número, zona o barrio y una referencia" required value={direccion} onChange={(e) => setDireccion(e.target.value)} /></div>
                <div className="campo"><label htmlFor="telefono">Celular de contacto</label>
                  <input id="telefono" className="entrada" inputMode="numeric" maxLength={8} autoComplete="tel-national" required value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))} /></div>
              </>
            )}
          </div>
        )}
      </fieldset>

      <fieldset className="tarjeta pila" style={{ margin: 0 }}>
        <legend className="etiqueta">¿Cómo pagas?</legend>
        <label className="fila"><input type="radio" name="pago" checked={pago === 'anticipado'} onChange={() => setPago('anticipado')} /> Pagar ahora por transferencia o QR (subes tu comprobante)</label>
        {metodo === 'domicilio' && (
          <>
            <label className="fila"><input type="radio" name="pago" checked={pago === 'efectivo'} onChange={() => setPago('efectivo')} /> Pagar en efectivo al recibir</label>
            <label className="fila"><input type="radio" name="pago" checked={pago === 'qr'} onChange={() => setPago('qr')} /> Pagar con QR al recibir</label>
          </>
        )}
        {metodo === 'retiro' && <p className="ayuda">El retiro en tienda se paga por adelantado.</p>}
      </fieldset>

      <section className="tarjeta pila" aria-label="Resumen del pedido" style={{ gap: '.5rem' }}>
        <h2>Resumen</h2>
        {items.map((i) => (
          <div className="fila fila--entre chico" key={`${i.modeloId}-${i.talla}`}>
            <span>{i.cantidad} × {i.marca} {i.nombre} {i.color} · talla {i.talla}</span><span>{formatBs(i.precio * i.cantidad)}</span>
          </div>
        ))}
        <hr style={{ border: 0, borderTop: '1px solid var(--linea)', width: '100%' }} />
        <div className="fila fila--entre"><span>Subtotal</span><span>{formatBs(total)}</span></div>
        <div className="fila fila--entre"><span>Descuento por fidelidad{pct > 0 ? ` (${pct} %)` : ''}</span><span>{descuento > 0 ? `−${formatBs(descuento)}` : formatBs(0)}</span></div>
        <div className="fila fila--entre"><span>Envío</span><span>{metodo === 'domicilio' ? formatBs(costoEnvio) : 'No aplica'}</span></div>
        <div className="fila fila--entre"><strong>Total a pagar</strong><span className="precio" style={{ fontSize: '1.6rem' }}>{formatBs(totalFinal)}</span></div>
      </section>

      <button className="btn btn--primario btn--bloque" disabled={enviando || fueraDeTarija}>{enviando ? 'Creando tu pedido…' : 'Confirmar pedido'}</button>
      <p className="ayuda">Al confirmar aceptas los <Link to="/terminos">términos, cambios y devoluciones</Link>. El stock se descuenta cuando el negocio valida tu pago; si se agota antes, te avisaremos.</p>
    </form>
  );
}
