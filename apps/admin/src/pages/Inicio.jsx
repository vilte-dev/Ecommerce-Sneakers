import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GERENCIA } from '@sneakers/shared';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../features/auth/AuthContext.jsx';

export default function Inicio() {
  const { perfil, rol } = useAuth();
  const [kpi, setKpi] = useState(null);
  const [error, setError] = useState(false);

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
  }, []);

  return (
    <div className="pila">
      <h1 style={{ fontSize: '2rem' }}>Hola, {perfil?.nombre?.split(' ')[0]}</h1>
      {error && <p className="aviso aviso--error">No se pudo cargar el resumen.</p>}
      <div className="indicadores">
        {[['Modelos activos', kpi?.modelos], ['Unidades en stock', kpi?.unidades], ['Tallas con stock bajo', kpi?.bajas], ['Tallas agotadas', kpi?.agotadas]].map(([t, v]) => (
          <div key={t} className="tarjeta indicador"><span className="tenue chico">{t}</span><strong>{v ?? '–'}</strong></div>
        ))}
      </div>
      {GERENCIA.includes(rol) && (
        <div className="fila">
          <Link className="btn btn--primario" to="/modelos/nuevo">Nuevo modelo</Link>
          <Link className="btn" to="/inventario">Ver inventario</Link>
        </div>
      )}
    </div>
  );
}
