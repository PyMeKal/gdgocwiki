export default function WikiSection({ id, number, title, depth = 0, children, actions }) {
  // HTML 제목은 h6까지만 제공되므로 더 깊은 구조는 번호로 계층을 구분합니다.
  const Heading = `h${Math.min(depth + 2, 6)}`
  return (
    <section id={id} className="wiki-section">
      <Heading className="wiki-section-heading"><a className="section-number" href={`#${id}`}>{number}.</a> {title}{actions}</Heading>
      {children}
    </section>
  )
}
