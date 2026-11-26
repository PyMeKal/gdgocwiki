import WikiImage from './WikiImage.jsx'
import { WikiText } from './WikiContent.jsx'
import Skeleton from 'react-loading-skeleton'

export default function WikiInfobox({ infobox, loading = false }) {
  // 주요 정보가 없는 문서에는 별도의 표나 빈 자리를 만들지 않습니다.
  if (!loading && !infobox) return null
  return (
    <aside className={`wiki-infobox infobox-${loading ? 'after-toc' : infobox.placement}`} aria-label={loading ? '주요 정보 로딩 중' : '주요 정보'} aria-busy={loading}>
      {(loading || infobox.title) && <h2>{loading ? <Skeleton width="40%" /> : infobox.title}</h2>}
      {!loading && infobox.image && <WikiImage {...infobox.image} />}
      {(loading || infobox.fields.length > 0) && (
        <table>
          <caption className="sr-only">주요 정보</caption>
          <tbody>{loading ? [0, 1, 2, 3].map((row) => (
            <tr key={row}><th scope="row"><Skeleton width="60%" /></th><td><Skeleton width="70%" /></td></tr>
          )) : infobox.fields.map((field, index) => (
            <tr key={index}><th scope="row">{field.label}</th><td className="wiki-text"><WikiText parts={field.value} /></td></tr>
          ))}</tbody>
        </table>
      )}
    </aside>
  )
}
