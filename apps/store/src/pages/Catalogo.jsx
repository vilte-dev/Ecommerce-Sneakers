import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listarCatalogo, listarOpciones, POR_PAGINA } from '../features/catalog/api.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Catalogo() {
  const [params, setParams] = useSearchParams();
  const filtros = useMemo(
    () => ({
      categoria: params.get('categoria') ?? '',
      marca: params.get('marca') ?? '',
      color: params.get('color') ?? '',
      min: params.get('min') ?? '',
      max: params.get('max') ?? '',
      q: params.get('q') ?? '',
      disp: params.get('disp') === '1',
    }),
    [params]
  );
  const [opciones, setOpciones] = useState({ marcas: [], categorias: [], colores: [] });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [estado, setEstado] = useState('cargando');

  useEffect(() => {
    listarOpciones().then(setOpciones).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelado = false;
    setEstado('cargando');
    setPagina(0);
    listarCatalogo(filtros, 0)
      .then(({ data, count }) => {
        if (cancelado) return;
        setItems(data);
        setTotal(count);
        setEstado('listo');
      })
      .catch(() => !cancelado && setEstado('error'));
    return () => {
      cancelado = true;
    };
  }, [filtros]);

  function cambiar(clave, valor) {
    const p = new URLSearchParams(params);
    if (valor === '' || valor === false || valor == null) p.delete(clave);
    else p.set(clave, valor === true ? '1' : valor);
    setParams(p, { replace: true });
  }

  async function cargarMas() {
    const siguiente = pagina + 1;
    try {
      const { data } = await listarCatalogo(filtros, siguiente);
      setItems((prev) => [...prev, ...data]);
      setPagina(siguiente);
    } catch {
      setEstado('error');
    }
  }

  const hayFiltros = [...params.keys()].length > 0;

  return (
    <div className="pila">
      <h1 style={{ fontSize: '2rem' }}>Catálogo</h1>
      <details open={window.innerWidth >= 900}>
        <summary className="btn btn--chico" style={{ display: 'inline-flex' }}>Filtros</summary>
        <div className="filtros">
          <div className="campo campo--ancho">
            <label htmlFor="q">Buscar por nombre</label>
            <input id="q" className="entrada" type="search" key={`q${filtros.q}`} defaultValue={filtros.q}
              onKeyDown={(e) => e.key === 'Enter' && cambiar('q', e.currentTarget.value.trim())}
              onBlur={(e) => cambiar('q', e.currentTarget.value.trim())} />
          </div>
          <div className="campo">
            <label htmlFor="categoria">Categoría</label>
            <select id="categoria" className="entrada" value={filtros.categoria} onChange={(e) => cambiar('categoria', e.target.value)}>
              <option value="">Todas</option>
              {opciones.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="marca">Marca</label>
            <select id="marca" className="entrada" value={filtros.marca} onChange={(e) => cambiar('marca', e.target.value)}>
              <option value="">Todas</option>
              {opciones.marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="color">Color</label>
            <select id="color" className="entrada" value={filtros.color} onChange={(e) => cambiar('color', e.target.value)}>
              <option value="">Todos</option>
              {opciones.colores.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="min">Precio desde (Bs.)</label>
            <input id="min" className="entrada" type="number" min="0" inputMode="numeric" key={`n${filtros.min}`} defaultValue={filtros.min}
              onBlur={(e) => cambiar('min', e.currentTarget.value)} />
          </div>
          <div className="campo">
            <label htmlFor="max">Precio hasta (Bs.)</label>
            <input id="max" className="entrada" type="number" min="0" inputMode="numeric" key={`x${filtros.max}`} defaultValue={filtros.max}
              onBlur={(e) => cambiar('max', e.currentTarget.value)} />
          </div>
          <label className="fila campo--ancho" style={{ alignSelf: 'end' }}>
            <input type="checkbox" checked={filtros.disp} onChange={(e) => cambiar('disp', e.target.checked)} />
            Solo con stock disponible
          </label>
        </div>
        {hayFiltros && <button className="btn btn--chico" onClick={() => setParams({}, { replace: true })}>Quitar filtros</button>}
      </details>

      <p className="tenue chico" role="status">
        {estado === 'cargando' ? 'Buscando…' : `${total} modelo${total === 1 ? '' : 's'}`}
      </p>
      {estado === 'error' && <p className="aviso aviso--error">No pudimos cargar el catálogo. Revisa tu conexión e inténtalo de nuevo.</p>}
      {estado === 'listo' && items.length === 0 && (
        <p className="aviso aviso--info">Ningún modelo coincide con esos filtros. Prueba quitando alguno.</p>
      )}
      <div className="rejilla">
        {estado === 'cargando'
          ? Array.from({ length: 8 }, (_, i) => <div key={i} className="cargando" style={{ aspectRatio: '1' }} />)
          : items.map((m) => <ProductCard key={m.id} modelo={m} />)}
      </div>
      {estado === 'listo' && items.length < total && (
        <button className="btn" onClick={cargarMas} style={{ justifySelf: 'center' }}>
          Ver más ({Math.min(POR_PAGINA, total - items.length)} de {total - items.length} restantes)
        </button>
      )}
    </div>
  );
}
