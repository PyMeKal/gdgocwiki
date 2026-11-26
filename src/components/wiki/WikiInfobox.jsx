import WikiImage from './WikiImage.jsx'
import { WikiText } from './WikiContent.jsx'

export default function WikiInfobox({ infobox }) {
  // 주요 정보가 없는 문서에는 별도의 표나 빈 자리를 만들지 않습니다.
  if (!infobox) return null
  return (
    <aside className={`wiki-infobox infobox-${infobox.placement}`} aria-label="주요 정보">
      {infobox.title && <h2>{infobox.title}</h2>}
      {infobox.image && <WikiImage {...infobox.image} />}
      {infobox.fields.length > 0 && (
        <table>
          <caption className="sr-only">주요 정보</caption>
          <tbody>{infobox.fields.map((field, index) => (
            <tr key={index}><th scope="row">{field.label}</th><td className="wiki-text"><WikiText parts={field.value} /></td></tr>
          ))}</tbody>
        </table>
      )}
    </aside>
  )
}
