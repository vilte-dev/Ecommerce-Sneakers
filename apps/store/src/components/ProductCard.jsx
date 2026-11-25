import { Link } from 'react-router-dom';
import { formatBs } from '@sneakers/shared';

const POCAS_UNIDADES = 5; // «Últimas unidades» cuando el stock total del modelo es bajo

/** HU-UI-04 · Tarjeta de producto: segunda foto al pasar el cursor, etiquetas con datos reales y rango de tallas. */
export default function ProductCard({ modelo, nuevo = false }) {
  const agotado = modelo.stock_total === 0;
  const pocas = !agotado && modelo.stock_total <= POCAS_UNIDADES;
  const [foto, foto2] = modelo.fotos ?? [];
  const alt = `${modelo.marca} ${modelo.nombre} ${modelo.color}`;
  const rango = modelo.talla_max == null ? `${modelo.talla_min}+` : `${modelo.talla_min}–${modelo.talla_max}`;
  return (
    <Link to={`/producto/${modelo.id}`} className="producto">
      <div className="producto__foto">
        {foto ? (
          <>
            <img src={foto} alt={alt} loading="lazy" width="400" height="400" />
            {foto2 && <img className="producto__alt" src={foto2} alt="" loading="lazy" width="400" height="400" />}
          </>
        ) : (
          <span className="producto__vacio" aria-hidden="true">👟</span>
        )}
        {(agotado || pocas || nuevo) && (
          <div className="producto__etiquetas">
            {agotado && <span className="chapa chapa--tinta">Agotado</span>}
            {pocas && <span className="chapa chapa--aji">Últimas unidades</span>}
            {nuevo && !agotado && <span className="chapa chapa--volt">Nuevo</span>}
          </div>
        )}
      </div>
      <div>
        <div className="producto__marca">{modelo.marca} · {modelo.categoria}</div>
        <div className="producto__nombre">{modelo.nombre} {modelo.color}</div>
        <div className="producto__meta">
          <span className="precio">{formatBs(modelo.precio)}</span>
          {modelo.talla_min != null && <span className="producto__tallas">Tallas {rango}</span>}
        </div>
      </div>
    </Link>
  );
}
