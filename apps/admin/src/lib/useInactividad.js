import { useEffect, useRef } from 'react';

const EVENTOS = ['pointerdown', 'keydown', 'scroll', 'touchstart'];

/** RF-02 (propuesto): cierra la sesión tras `ms` milisegundos sin actividad (equipos compartidos en caja). */
export function useInactividad(ms, alExpirar, activo = true) {
  const callback = useRef(alExpirar);
  callback.current = alExpirar;
  useEffect(() => {
    if (!activo) return undefined;
    let t;
    const reiniciar = () => { clearTimeout(t); t = setTimeout(() => callback.current(), ms); };
    reiniciar();
    EVENTOS.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }));
    return () => { clearTimeout(t); EVENTOS.forEach((e) => window.removeEventListener(e, reiniciar)); };
  }, [ms, activo]);
}
