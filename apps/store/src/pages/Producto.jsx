import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatBs } from '@sneakers/shared';
import { obtenerModelo } from '../features/catalog/api.js';
import { useCart } from '../features/cart/CartContext.jsx';
import SizeSelector from '../components/SizeSelector.jsx';
import { IconoCheck } from '../components/Iconos.jsx';

export default function Producto() {
  const { id } = useParams();
  const { agregar } = useCart();
  const [datos, setDatos] = useState(null);
  const [estado, setEstado] = useState('cargando');
  const [talla, setTalla] = useState(null);
  const [foto, setFoto] = useState(0);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    const num = Number(id);
    if (!Number.isInteger(num)) return setEstado('noexiste');
    let cancelado = false;
    setEstado('cargando');
    setTalla(null);
    setFoto(0);
    obtenerModelo(num)
      .then((d) => {
        if (cancelado) return;
        setDatos(d);
        setEstado(d.modelo ? 'listo' : 'noexiste');
      })
      .catch(() => !cancelado && setEstado('error'));
    return () => {
      cancelado = true;
    };
  }, [id]);

  if (estado === 'cargando') return <div className="cargando" style={{ height: 320 }} aria-label="Cargando" />;
  if (estado === 'error') return <p className="aviso aviso--error">No pudimos cargar este producto. Inténtalo de nuevo.</p>;
  if (estado === 'noexiste') return (
    <div className="pila"><p>Este modelo ya no está disponible.</p><Link className="btn" to="/catalogo">Ver el catálogo</Link></div>
  );

  const { modelo, tallas } = datos;
  const seleccion = tallas.find((t) => t.talla === talla);
  const sinStock = tallas.every((t) => t.cantidad === 0);

  function alAgregar() {
    const r = agregar(
      { modeloId: modelo.id, talla, nombre: modelo.nombre, color: modelo.color, marca: modelo.marca,
        precio: Number(modelo.precio), foto: modelo.fotos?.[0] ?? null, stockMax: seleccion.cantidad },
      1
    );
    setMensaje(r.ok ? { tipo: 'ok', texto: 'Agregado al carrito.' } : { tipo: 'info', texto: r.mensaje });
  }

  return (
    <>
    <nav className="migas" aria-label="Ruta">
      <Link to="/">Inicio</Link><span aria-hidden="true">/</span>
      <Link to="/catalogo">Catálogo</Link><span aria-hidden="true">/</span>
      <span aria-current="page">{modelo.marca} {modelo.nombre}</span>
    </nav>
    <div className="ficha">
      <div>
        <div className="galeria__principal">
          {modelo.fotos?.[foto] ? <img src={modelo.fotos[foto]} alt={`${modelo.marca} ${modelo.nombre} ${modelo.color}`} /> : <span className="producto__vacio" aria-hidden="true">👟</span>}
        </div>
        {modelo.fotos?.length > 1 && (
          <div className="galeria__mini">
            {modelo.fotos.map((f, i) => (
              <button key={f} aria-current={i === foto} aria-label={`Ver foto ${i + 1}`} onClick={() => setFoto(i)}><img src={f} alt="" /></button>
            ))}
          </div>
        )}
      </div>
      <div className="pila ficha__info">
        <div>
          <p className="sobretitulo">{modelo.marca} · {modelo.categoria}</p>
          <h1 className="ficha__titulo">{modelo.nombre} {modelo.color}</h1>
          <p className="precio" style={{ fontSize: '1.7rem' }}>{formatBs(modelo.precio)}</p>
        </div>
        {sinStock ? (
          <p className="aviso aviso--info">Este modelo está agotado por ahora.</p>
        ) : (
          <>
            <SizeSelector tallas={tallas} valor={talla} onChange={(t) => { setTalla(t); setMensaje(null); }}
              categoria={{ nombre: modelo.categoria, talla_min: modelo.talla_min, talla_max: modelo.talla_max }} />
            {seleccion && seleccion.cantidad <= 3 && <p className="chico" style={{ color: '#b4330f', fontWeight: 600, margin: 0 }}>Quedan {seleccion.cantidad} en esta talla.</p>}
            {/* HU-UI-06: en móvil esta barra queda fija abajo para tener el botón siempre a mano. */}
            <div className="compra">
              {mensaje && (
                <div className={`aviso aviso--${mensaje.tipo}`} role="status">
                  {mensaje.texto} {mensaje.tipo === 'ok' && <Link to="/carrito">Ir al carrito</Link>}
                </div>
              )}
              <button className="btn btn--primario btn--bloque btn--grande" disabled={!talla} onClick={alAgregar}>
                {talla ? `Agregar al carrito · ${formatBs(modelo.precio)}` : 'Elige una talla'}
              </button>
            </div>
          </>
        )}
        <ul className="garantias" aria-label="Condiciones de compra">
          <li><IconoCheck /> Retiro en tienda sin costo o envío a domicilio en Tarija</li>
          <li><IconoCheck /> Pago por transferencia o QR con validación de comprobante</li>
          <li><IconoCheck /> <span>Cambios y devoluciones: <Link to="/terminos">ver términos</Link></span></li>
        </ul>
      </div>
    </div>
    </>
  );
}
