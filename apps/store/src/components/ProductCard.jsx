import { Link } from 'react-router-dom';
import { formatBs } from '@sneakers/shared';

export default function ProductCard({ modelo }) {
  const agotado = modelo.stock_total === 0;
  return (
    <Link to={`/producto/${modelo.id}`} className="producto">
      <div className="producto__foto">
        {modelo.fotos?.[0] ? (
          <img src={modelo.fotos[0]} alt={`${modelo.marca} ${modelo.nombre} ${modelo.color}`} loading="lazy" width="400" height="400" />
        ) : (
          <span className="producto__vacio" aria-hidden="true">👟</span>
        )}
        {agotado && <span className="insignia insignia--aji producto__etiqueta">Agotado</span>}
      </div>
      <div>
        <div className="producto__marca">{modelo.marca} · {modelo.categoria}</div>
        <div className="producto__nombre">{modelo.nombre} {modelo.color}</div>
        <div className="precio">{formatBs(modelo.precio)}</div>
      </div>
    </Link>
  );
}
