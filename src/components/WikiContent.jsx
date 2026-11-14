import Footnote from './Footnote.jsx'
import WikiImage from './WikiImage.jsx'
import { isSafeUrl } from '../utils/wikiSchema.js'

export function WikiText({ parts }) {
  // HTML처럼 보이는 입력도 문자열로 렌더링하고, 준비된 주석 토큰만 컴포넌트로 바꿉니다.
  return parts.map((part, index) => typeof part === 'string' ? part : <Footnote key={index} {...part} />)
}

export default function WikiContent({ blocks }) {
  return blocks.map((block, index) => {
    if (block.type === 'paragraph') return <p className="wiki-text" key={index}><WikiText parts={block.text} /></p>
    if (block.type === 'list') {
      return <ul className="content-list" key={index}>{block.items.map((item, i) => <li className="wiki-text" key={i}><WikiText parts={item} /></li>)}</ul>
    }
    if (block.type === 'image') return <WikiImage key={index} {...block} />
    if (block.type === 'link') return isSafeUrl(block.url) ? <p key={index}><a href={block.url} target="_blank" rel="noopener noreferrer">{block.label}</a></p> : null
    if (block.type !== 'table') return null
    const row = (cells, rowIndex) => (
      <tr key={rowIndex}>{cells.map((cell, i) => {
        // 머리글 행과 첫 열을 구분해 스크린 리더가 각 셀의 항목명을 알 수 있게 합니다.
        const Cell = (block.header && rowIndex === 0) || i === 0 ? 'th' : 'td'
        return <Cell className="wiki-text" key={i} scope={Cell === 'th' ? (block.header && rowIndex === 0 ? 'col' : 'row') : undefined}><WikiText parts={cell} /></Cell>
      })}</tr>
    )
    return (
      <div className="table-scroll" role="region" aria-label={block.caption || '본문 표'} tabIndex="0" key={index}>
        <table className={block.header ? 'schedule-table' : 'info-table'}>
          <caption className="sr-only">{block.caption}</caption>
          {block.header && <thead>{row(block.rows[0], 0)}</thead>}
          <tbody>{block.rows.slice(block.header ? 1 : 0).map((cells, i) => row(cells, i + (block.header ? 1 : 0)))}</tbody>
        </table>
      </div>
    )
  })
}
