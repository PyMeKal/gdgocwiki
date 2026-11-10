export default function Footnote({ number, content }) {
  return (
    <sup className="footnote-reference" id={`footnote-ref-${number}`}>
      <a href={`#footnote-${number}`} title={content} aria-label={`주석 ${number}`} aria-describedby={`footnote-${number}`}>[{number}]</a>
    </sup>
  )
}
