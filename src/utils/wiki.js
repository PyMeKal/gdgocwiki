import { defaultWiki } from '../data/wiki.js'
import { validateWiki } from './wikiSchema.js'

const storageKey = 'conversation-wiki:busan:v1'

export { validateWiki } from './wikiSchema.js'

export function loadWiki() {
  try {
    // shortcut: 위키 하나를 이 브라우저에 저장하며, 여러 문서·공동 편집을 지원할 때 API로 교체합니다.
    const saved = window.localStorage.getItem(storageKey)
    if (saved === null) return { wiki: defaultWiki, error: '' }
    const wiki = JSON.parse(saved)
    validateWiki(wiki)
    return { wiki, error: '' }
  } catch {
    return { wiki: defaultWiki, error: '저장된 문서를 불러오지 못해 기본 예시를 표시합니다. 브라우저 저장 설정이나 저장된 데이터를 확인해주세요.' }
  }
}

export function saveWiki(wiki) {
  // 잘못된 편집 결과가 기존 저장 문서를 덮어쓰지 않도록 저장 전에 검사합니다.
  validateWiki(wiki)
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(wiki))
  } catch {
    throw new Error('문서를 저장하지 못했습니다. 브라우저 저장 공간과 설정을 확인해주세요. 입력한 내용은 이 화면에 남아 있습니다.')
  }
}

// 저장 원본은 유지하고, 화면에 필요한 섹션 번호와 주석 참조 정보를 별도 객체에 구성합니다.
export function prepareWiki(wiki) {
  const footnotes = []
  const warnings = []
  const definitions = new Map((wiki.footnotes || []).map((note) => [note.id, note]))
  const shared = new Map()
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
    // 직접 작성한 [* 내용]과 정의를 공유하는 [^id]를 읽은 순서대로 처리합니다.
    for (const match of text.matchAll(/\[\*\s+([^\]]+)\]|\[\^([a-zA-Z0-9_-]+)\]/g)) {
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
  return { sections, footnotes, infobox, warnings: [...new Set(warnings)] }
}
