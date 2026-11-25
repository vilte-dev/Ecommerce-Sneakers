import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GERENCIA, OPERADORES } from '@sneakers/shared';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { contarPorValidar } from '../features/pedidos/api.js';

export default function Inicio() {
  const { perfil, rol } = useAuth();
  const [kpi, setKpi] = useState(null);
  const [porValidar, setPorValidar] = useState(null);
  const [error, setError] = useState(false);
  const opera = OPERADORES.includes(rol);

  useEffect(() => {
    Promise.all([
      supabase.from('modelos').select('id', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('stock').select('cantidad,umbral_minimo'),
    ]).then(([m, s]) => {
      if (m.error || s.error) return setError(true);
      setKpi({
        modelos: m.count ?? 0,
        unidades: s.data.reduce((n, r) => n + r.cantidad, 0),
        agotadas: s.data.filter((r) => r.cantidad === 0).length,
        bajas: s.data.filter((r) => r.cantidad > 0 && r.cantidad <= r.umbral_minimo).length,
      });
    });
    if (opera) contarPorValidar().then(setPorValidar).catch(() => {});
  }, [opera]);

  const tarjetas = [['Modelos activos', kpi?.modelos], ['Unidades en stock', kpi?.unidades], ['Tallas con stock bajo', kpi?.bajas], ['Tallas agotadas', kpi?.agotadas]];
  if (opera) tarjetas.unshift(['Pedidos web por validar', porValidar]);

  return (
    <div className="pila">
      <h1 style={{ fontSize: '2rem' }}>Hola, {perfil?.nombre?.split(' ')[0]}</h1>
      {error && <p className="aviso aviso--error">No se pudo cargar el resumen.</p>}
      <div className="indicadores">
        {tarjetas.map(([t, v]) => (
          <div key={t} className="tarjeta indicador"><span className="tenue chico">{t}</span><strong>{v ?? '–'}</strong></div>
        ))}
      </div>
      <div className="fila">
        {opera && <Link className="btn btn--primario" to="/pos">Nueva venta</Link>}
        {opera && <Link className="btn" to="/pedidos">Ver pedidos web</Link>}
        {opera && <Link className="btn" to="/caja">Cierre de caja</Link>}
        {GERENCIA.includes(rol) && <Link className="btn" to="/alertas">Alertas de stock</Link>}
        {GERENCIA.includes(rol) && <Link className="btn" to="/modelos/nuevo">Nuevo modelo</Link>}
        <Link className="btn" to="/inventario">Ver inventario</Link>
      </div>
    </div>
  );
}
