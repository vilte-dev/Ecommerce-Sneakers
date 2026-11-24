import { pasosPedido } from '@sneakers/shared';

/** Línea de tiempo del pedido (SRS B.2). */
export default function SeguimientoPedido({ pedido }) {
  if (pedido.estado === 'cancelado') return <p className="aviso aviso--error">Este pedido fue cancelado.</p>;
  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '.5rem' }} aria-label="Seguimiento del pedido">
      {pasosPedido(pedido).map((p) => (
        <li key={p.clave} className="fila" style={{ gap: '.6rem', opacity: p.hecho ? 1 : 0.5 }} aria-current={p.actual ? 'step' : undefined}>
          <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 99, display: 'grid', placeItems: 'center', fontSize: '.75rem', fontWeight: 700,
            background: p.hecho ? 'var(--ok)' : 'var(--linea)', color: p.hecho ? '#fff' : 'var(--tinta-2)' }}>{p.hecho ? '✓' : ''}</span>
          <span style={{ fontWeight: p.actual ? 700 : 400 }}>{p.texto}</span>
        </li>
      ))}
    </ol>
  );
}
