export default function WikiSection({ id, number, title, children }) {
  return (
    <section id={id} className="wiki-section">
      <h2><a className="section-number" href={`#${id}`}>{number}.</a> {title}</h2>
      {children}
    </section>
  )
}
