import { useEffect, useRef, useState } from 'react';
import { useConexion } from '../lib/ConexionContext.jsx';

/** HU-24 · aviso bloqueante: mientras no hay conexión la caja queda congelada y no se puede operar. */
export default function BloqueoCaja() {
  const { enLinea, revisar } = useConexion();
  const [probando, setProbando] = useState(false);
  const boton = useRef(null);
  useEffect(() => { if (!enLinea) boton.current?.focus(); }, [enLinea]);
  if (enLinea) return null;
  const reintentar = async () => { setProbando(true); await revisar(); setProbando(false); };
  return (
    <div className="bloqueo no-imprimir" role="alertdialog" aria-modal="true" aria-labelledby="bloqueo-t" aria-describedby="bloqueo-d">
      <div className="bloqueo__caja pila">
        <h2 id="bloqueo-t">Sin conexión a internet</h2>
        <p id="bloqueo-d">La caja está <strong>congelada</strong>: no se pueden registrar ventas ni cerrar la caja hasta que vuelva la conexión.
          Tu venta en curso no se pierde. Si hay una venta que no alcanzaste a registrar, anótala en papel y cárgala después.</p>
        <button ref={boton} className="btn btn--primario btn--bloque" onClick={reintentar} disabled={probando}>{probando ? 'Comprobando…' : 'Reintentar conexión'}</button>
        <p className="ayuda">Se reanuda sola apenas el sistema detecte internet.</p>
      </div>
    </div>
  );
}
