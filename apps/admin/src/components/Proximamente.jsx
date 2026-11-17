export default function Proximamente({ titulo, sprint, historias, detalle }) {
  return (
    <section className="pila" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: '2rem' }}>{titulo}</h1>
      <p>{detalle}</p>
      <p className="aviso aviso--info">Se construye en el Sprint {sprint} ({historias}).</p>
    </section>
  );
}
