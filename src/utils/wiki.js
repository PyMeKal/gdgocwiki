import { wikiPagePath, wikiPath } from './paths.js'
import { parseWikiBlocks } from './importWiki.js'
export { validateWiki } from './wikiSchema.js'

// 저장 원본은 유지하고, 화면에 필요한 섹션 번호와 주석 참조 정보를 별도 객체에 구성합니다.
export function prepareWiki(wiki, { wikiId, pages = [] } = {}) {
  const footnotes = []
  const warnings = []
  const definitions = new Map((wiki.footnotes || []).map((note) => [note.id, note]))
  const shared = new Map()
  const pageIds = new Map(pages.map((page) => [page.title, page.id]))
  function reference(note) {
    // 주석 번호가 같아도 참조 위치마다 ID를 달리해 각각의 본문으로 돌아갈 수 있게 합니다.
    const referenceId = note.references.length === 0 ? `footnote-ref-${note.number}` : `footnote-ref-${note.number}-${note.references.length + 1}`
    note.references.push(referenceId)
    return { number: note.number, content: note.content, referenceId }
  }
  function addNote(content, url) {
    const note = { number: footnotes.length + 1, content, references: [] }
    if (url) note.url = url
    footnotes.push(note)
    return note
  }
  const annotate = (text) => {
    const parts = []
    let start = 0
    // 주석과 [[문서명]] 링크를 원문 순서대로 처리합니다.
    for (const match of text.matchAll(/\[\*\s+([^\]]+)\]|\[\^([a-zA-Z0-9_-]+)\]|\[\[([^\r\n[\]]+)\]\]/g)) {
      if (match[3] !== undefined) {
        const title = match[3].trim()
        if (!wikiId || !title) continue
        const pageId = pageIds.get(title)
        parts.push(text.slice(start, match.index), {
          type: 'wikiLink', label: title,
          // shortcut: 없는 제목은 위키 검색으로 연결하며, 제목 기반 조회 API가 생기면 교체합니다.
          to: pageId ? wikiPagePath(wikiId, pageId) : `${wikiPath(wikiId)}?q=${encodeURIComponent(title)}`,
        })
        start = match.index + match[0].length
        continue
      }
      let note
      if (match[2]) {
        const definition = definitions.get(match[2])
        if (!definition) {
          warnings.push(`정의되지 않은 주석 ${match[0]}을 원문 그대로 표시합니다.`)
          continue
        }
        note = shared.get(match[2])
        if (!note) {
          note = addNote(definition.content, definition.url)
          shared.set(match[2], note)
        }
      } else {
        if (!match[1].trim()) continue
        note = addNote(match[1].trim())
      }
      parts.push(text.slice(start, match.index), reference(note))
      start = match.index + match[0].length
    }
    parts.push(text.slice(start))
    return parts
  }
  // 정보 표가 본문보다 먼저 표시되므로 정보 표의 주석에 먼저 번호를 부여합니다.
  const infobox = wiki.infobox ? { ...wiki.infobox, fields: wiki.infobox.fields.map((field) => ({ ...field, value: annotate(field.value) })) } : undefined
  const description = parseWikiBlocks(wiki.description ?? '').map((block) => block.type === 'list'
    ? { ...block, items: block.items.map(annotate) }
    : { ...block, text: annotate(block.text) })
  const visit = (nodes, prefix = '') => nodes.map((section, index) => ({
    ...section,
    number: prefix ? `${prefix}.${index + 1}` : `${index + 1}`,
    blocks: section.blocks.map((block) => {
      if (block.type === 'paragraph') return { ...block, text: annotate(block.text) }
      if (block.type === 'list') return { ...block, items: block.items.map(annotate) }
      if (block.type === 'table') return { ...block, rows: block.rows.map((row) => row.map(annotate)) }
      return block
    }),
    sections: visit(section.sections || [], prefix ? `${prefix}.${index + 1}` : `${index + 1}`),
  }))
  const sections = visit(wiki.sections)
  // 본문에서 사용하지 않은 정의도 참고용 주석으로 남겨 입력 정보를 잃지 않게 합니다.
  for (const definition of definitions.values()) {
    if (!shared.has(definition.id)) addNote(definition.content, definition.url)
  }
  return { description, sections, footnotes, infobox, warnings: [...new Set(warnings)] }
}
