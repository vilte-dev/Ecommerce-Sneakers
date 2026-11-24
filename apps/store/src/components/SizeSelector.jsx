import { etiquetaRango } from '@sneakers/shared';

/** HU-06: solo se ofrecen las tallas que existen para el modelo (validadas por categoría en la BD). */
export default function SizeSelector({ tallas, valor, onChange, categoria }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="etiqueta">Talla <span className="tenue">({categoria.nombre}: {etiquetaRango(categoria)})</span></legend>
      <div className="tallas" style={{ marginTop: '.5rem' }}>
        {tallas.map((t) => (
          <button
            key={t.talla}
            type="button"
            className="talla"
            aria-pressed={valor === t.talla}
            disabled={t.cantidad === 0}
            title={t.cantidad === 0 ? 'Agotada' : `${t.cantidad} disponible(s)`}
            onClick={() => onChange(t.talla)}
          >
            {t.talla}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
