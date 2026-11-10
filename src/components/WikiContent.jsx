import Footnote from './Footnote.jsx'

function Text({ parts }) {
  return parts.map((part, index) => typeof part === 'string' ? part : <Footnote key={index} {...part} />)
}

export default function WikiContent({ blocks }) {
  return blocks.map((block, index) => {
    if (block.type === 'paragraph') return <p className="wiki-text" key={index}><Text parts={block.text} /></p>
    if (block.type === 'list') {
      return <ul className="content-list" key={index}>{block.items.map((item, i) => <li className="wiki-text" key={i}><Text parts={item} /></li>)}</ul>
    }
    const row = (cells, rowIndex) => (
      <tr key={rowIndex}>{cells.map((cell, i) => {
        const Cell = (block.header && rowIndex === 0) || i === 0 ? 'th' : 'td'
        return <Cell className="wiki-text" key={i} scope={Cell === 'th' ? (block.header && rowIndex === 0 ? 'col' : 'row') : undefined}><Text parts={cell} /></Cell>
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
