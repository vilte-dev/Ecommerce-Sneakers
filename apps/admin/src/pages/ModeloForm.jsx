import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import { etiquetaRango, mensajeError, rangoTallas } from '@sneakers/shared';
import { supabase } from '../lib/supabase.js';

const MAX_FOTOS = 5;
// RNF-14: se comprimen las fotos en el navegador antes de subirlas.
const OPCIONES_COMPRESION = { maxSizeMB: 0.3, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/webp' };
const kb = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

export default function ModeloForm() {
  const { id } = useParams();
  const navegar = useNavigate();
  const idCreado = useRef(null); // si la subida falla tras crear el modelo, el reintento no lo duplica
  const [cat, setCat] = useState({ marcas: [], categorias: [] });
  const [sucursalId, setSucursalId] = useState(null);
  const [f, setF] = useState({ marca_id: '', categoria_id: '', nombre: '', color: '', precio: '', activo: true });
  const [fotos, setFotos] = useState([]);
  const [nuevas, setNuevas] = useState([]);
  const [stock, setStock] = useState({});
  const [umbral, setUmbral] = useState(2);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [comprimiendo, setComprimiendo] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const [marcas, categorias, sucursal] = await Promise.all([
        supabase.from('marcas').select('id,nombre,activo').order('nombre'),
        supabase.from('categorias').select('id,nombre,talla_min,talla_max').order('talla_min'),
        supabase.from('sucursales').select('id').order('id').limit(1).maybeSingle(),
      ]);
      if (marcas.error || categorias.error || sucursal.error || !sucursal.data) throw new Error('catalogos');
      let modelo = null;
      let filasStock = [];
      if (id) {
        const [m, s] = await Promise.all([
          supabase.from('modelos').select('*').eq('id', Number(id)).maybeSingle(),
          supabase.from('stock').select('talla,cantidad,umbral_minimo').eq('modelo_id', Number(id)),
        ]);
        if (m.error || s.error || !m.data) throw new Error('modelo');
        modelo = m.data;
        filasStock = s.data;
      }
      if (cancelado) return;
      setCat({ marcas: marcas.data, categorias: categorias.data });
      setSucursalId(sucursal.data.id);
      if (modelo) {
        setF({ marca_id: String(modelo.marca_id), categoria_id: String(modelo.categoria_id), nombre: modelo.nombre, color: modelo.color, precio: String(modelo.precio), activo: modelo.activo });
        setFotos(modelo.fotos ?? []);
        setStock(Object.fromEntries(filasStock.map((r) => [r.talla, String(r.cantidad)])));
        if (filasStock[0]) setUmbral(filasStock[0].umbral_minimo);
      }
      setCargando(false);
    })().catch(() => !cancelado && (setError('No se pudo cargar el formulario. Recarga la página.'), setCargando(false)));
    return () => {
      cancelado = true;
    };
  }, [id]);

  const categoria = cat.categorias.find((c) => String(c.id) === f.categoria_id);
  const tallas = categoria ? rangoTallas(categoria) : [];

  async function elegirFotos(e) {
    const archivos = [...e.target.files].slice(0, MAX_FOTOS - fotos.length - nuevas.length);
    e.target.value = '';
    if (!archivos.length) return;
    setComprimiendo(true);
    try {
      const listas = [];
      for (const original of archivos) {
        const comprimido = await imageCompression(original, OPCIONES_COMPRESION);
        listas.push({ file: comprimido, vista: URL.createObjectURL(comprimido), antes: original.size, despues: comprimido.size });
      }
      setNuevas((prev) => [...prev, ...listas]);
    } catch {
      setError('No se pudo procesar una de las imágenes. Prueba con otra foto (JPG, PNG o WebP).');
    } finally {
      setComprimiendo(false);
    }
  }

  async function guardar(e) {
    e.preventDefault();
    setError('');
    if (!f.marca_id || !f.categoria_id) return setError('Elige la marca y la categoría.');
    if (!(Number(f.precio) > 0)) return setError('El precio debe ser mayor a 0.');
    setGuardando(true);
    try {
      const datos = { marca_id: Number(f.marca_id), categoria_id: Number(f.categoria_id), nombre: f.nombre.trim(), color: f.color.trim(), precio: Number(f.precio), activo: f.activo };
      let modeloId = id ? Number(id) : idCreado.current;
      if (modeloId) {
        const { error: err } = await supabase.from('modelos').update(datos).eq('id', modeloId);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase.from('modelos').insert(datos).select('id').single();
        if (err) throw err;
        modeloId = data.id;
        idCreado.current = modeloId;
      }

      const urls = [...fotos];
      for (const n of nuevas) {
        const ruta = `${modeloId}/${crypto.randomUUID()}.webp`;
        const { error: err } = await supabase.storage.from('modelos').upload(ruta, n.file, { contentType: 'image/webp', cacheControl: '31536000' });
        if (err) throw err;
        urls.push(supabase.storage.from('modelos').getPublicUrl(ruta).data.publicUrl);
      }
      const { error: errFotos } = await supabase.from('modelos').update({ fotos: urls }).eq('id', modeloId);
      if (errFotos) throw errFotos;

      // Una fila de stock por talla con cantidad escrita (0 = talla agotada). Sin cantidad = talla no ofrecida.
      const filas = tallas
        .filter((t) => stock[t] !== undefined && stock[t] !== '')
        .map((t) => ({ sucursal_id: sucursalId, modelo_id: modeloId, talla: t, cantidad: Math.max(0, Math.floor(Number(stock[t]))), umbral_minimo: Math.max(0, Math.floor(Number(umbral))) }));
      if (filas.length) {
        const { error: err } = await supabase.from('stock').upsert(filas, { onConflict: 'sucursal_id,modelo_id,talla' });
        if (err) throw err;
      }
      navegar('/modelos');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <div className="cargando" style={{ height: 240 }} aria-label="Cargando" />;
  const campo = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });

  return (
    <form className="pila" onSubmit={guardar} style={{ maxWidth: 820 }}>
      <div className="fila fila--entre">
        <h1 style={{ fontSize: '2rem' }}>{id ? 'Editar modelo' : 'Nuevo modelo'}</h1>
        <Link to="/modelos">Volver a modelos</Link>
      </div>
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}

      <section className="tarjeta pila">
        <h2>Datos del modelo</h2>
        <div className="dos-col">
          <div className="campo"><label htmlFor="marca">Marca</label>
            <select id="marca" className="entrada" required {...campo('marca_id')}>
              <option value="">Elige una marca</option>
              {cat.marcas.filter((m) => m.activo || String(m.id) === f.marca_id).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select></div>
          <div className="campo"><label htmlFor="categoria">Categoría</label>
            <select id="categoria" className="entrada" required disabled={Boolean(id)} {...campo('categoria_id')}>
              <option value="">Elige una categoría</option>
              {cat.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({etiquetaRango(c)})</option>)}
            </select>
            {id && <span className="ayuda">La categoría no se cambia después de crear el modelo porque define las tallas.</span>}</div>
          <div className="campo"><label htmlFor="nombre">Nombre</label><input id="nombre" className="entrada" required maxLength={100} {...campo('nombre')} /></div>
          <div className="campo"><label htmlFor="color">Color</label><input id="color" className="entrada" required maxLength={30} {...campo('color')} /></div>
          <div className="campo"><label htmlFor="precio">Precio (Bs.)</label><input id="precio" className="entrada" type="number" min="1" step="0.01" inputMode="decimal" required {...campo('precio')} /></div>
          <label className="fila" style={{ alignSelf: 'end', minHeight: 44 }}>
            <input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Visible en la tienda
          </label>
        </div>
      </section>

      <section className="tarjeta pila">
        <h2>Fotos</h2>
        <p className="ayuda">Hasta {MAX_FOTOS}. Se comprimen automáticamente antes de subirse para ahorrar datos móviles a los clientes.</p>
        <div className="fotos">
          {fotos.map((u) => (
            <div className="foto" key={u}><img src={u} alt="Foto del modelo" /><button type="button" aria-label="Quitar foto" onClick={() => setFotos(fotos.filter((x) => x !== u))}>×</button></div>
          ))}
          {nuevas.map((n) => (
            <div className="foto" key={n.vista} title={`${kb(n.antes)} → ${kb(n.despues)}`}><img src={n.vista} alt="Foto nueva" />
              <button type="button" aria-label="Quitar foto" onClick={() => setNuevas(nuevas.filter((x) => x !== n))}>×</button></div>
          ))}
        </div>
        {nuevas.length > 0 && <p className="ayuda">Tamaño de las nuevas: {kb(nuevas.reduce((a, n) => a + n.antes, 0))} → {kb(nuevas.reduce((a, n) => a + n.despues, 0))}.</p>}
        {fotos.length + nuevas.length < MAX_FOTOS && (
          <div className="campo"><label htmlFor="fotos">Agregar fotos</label>
            <input id="fotos" type="file" accept="image/*" multiple onChange={elegirFotos} disabled={comprimiendo} />
            {comprimiendo && <span className="ayuda" role="status">Comprimiendo imágenes…</span>}</div>
        )}
      </section>

      <section className="tarjeta pila">
        <h2>Stock por talla</h2>
        {!categoria ? (
          <p className="tenue">Elige una categoría para ver las tallas válidas.</p>
        ) : (
          <>
            <p className="ayuda">Tallas válidas para {categoria.nombre}: {etiquetaRango(categoria)}. Deja vacía la talla que no ofreces; escribe 0 si está agotada.</p>
            <div className="campo" style={{ maxWidth: 220 }}><label htmlFor="umbral">Stock mínimo de seguridad</label>
              <input id="umbral" className="entrada" type="number" min="0" value={umbral} onChange={(e) => setUmbral(e.target.value)} /></div>
            <div className="grilla-stock">
              {tallas.map((t) => (
                <div className="campo" key={t}><label htmlFor={`t${t}`}>Talla {t}</label>
                  <input id={`t${t}`} className="entrada" type="number" min="0" inputMode="numeric" value={stock[t] ?? ''} onChange={(e) => setStock({ ...stock, [t]: e.target.value })} /></div>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="fila"><button className="btn btn--primario" disabled={guardando || comprimiendo}>{guardando ? 'Guardando…' : 'Guardar modelo'}</button>
        <Link className="btn" to="/modelos">Cancelar</Link></div>
    </form>
  );
}
