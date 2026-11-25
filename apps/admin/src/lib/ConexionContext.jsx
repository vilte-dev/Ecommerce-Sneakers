import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { crearMonitorConexion } from '@sneakers/shared';

const ConexionContext = createContext({ enLinea: true, reportar: () => {}, revisar: async () => true });

const URL_API = import.meta.env.VITE_SUPABASE_URL;
const CLAVE = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Cualquier respuesta HTTP significa que el servidor es alcanzable; un fallo de red o 5 s sin respuesta, que no. */
async function ping() {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 5000);
  try { await fetch(`${URL_API}/rest/v1/`, { method: 'HEAD', headers: { apikey: CLAVE }, cache: 'no-store', signal: ctl.signal }); }
  finally { clearTimeout(t); }
}

// HU-24 / RNF-13 · vigila la conexión con el servidor para congelar la caja si se pierde internet.
export function ConexionProvider({ children }) {
  const [enLinea, setEnLinea] = useState(true);
  const monitor = useRef(null);

  useEffect(() => {
    const m = crearMonitorConexion({ ping, alCambiar: setEnLinea, intervaloMs: 8000 });
    monitor.current = m;
    const caer = () => m.reportar(false);
    const volver = () => m.revisar();
    window.addEventListener('offline', caer);
    window.addEventListener('online', volver);
    if (!navigator.onLine) m.reportar(false);
    m.iniciar();
    return () => { m.detener(); window.removeEventListener('offline', caer); window.removeEventListener('online', volver); };
  }, []);

  const valor = useMemo(() => ({
    enLinea,
    reportar: (v) => monitor.current?.reportar(v),
    revisar: () => monitor.current?.revisar() ?? Promise.resolve(true),
  }), [enLinea]);
  return <ConexionContext.Provider value={valor}>{children}</ConexionContext.Provider>;
}

export const useConexion = () => useContext(ConexionContext);
