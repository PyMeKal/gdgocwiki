import { defaultWiki } from '../data/wiki.js'

const storageKey = 'conversation-wiki:busan:v1'

export function validateWiki(wiki) {
  if (!wiki || typeof wiki.title !== 'string' || !wiki.title.trim() || wiki.title.length > 100 || typeof wiki.description !== 'string') {
    throw new Error('문서 제목을 1~100자로 입력해주세요.')
  }
  if (!Array.isArray(wiki.sections) || wiki.sections.length === 0) {
    throw new Error('목차는 하나 이상 필요합니다.')
  }
  const ids = new Set()
  for (const section of wiki.sections) {
    if (!section || typeof section.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(section.id) || ids.has(section.id) ||
        typeof section.title !== 'string' || !section.title.trim() || !Array.isArray(section.blocks)) {
      throw new Error('목차 제목과 구성을 확인해주세요.')
    }
    ids.add(section.id)
    for (const block of section.blocks) {
      const strings = (values) => Array.isArray(values) && values.every((value) => typeof value === 'string')
      if (!block || !(
        (block.type === 'paragraph' && typeof block.text === 'string') ||
        (block.type === 'list' && strings(block.items)) ||
        (block.type === 'table' && typeof block.caption === 'string' && typeof block.header === 'boolean' &&
          Array.isArray(block.rows) && block.rows.length > 0 && Array.isArray(block.rows[0]) && block.rows[0].length > 0 &&
          block.rows.every((row) => strings(row) && row.length === block.rows[0].length))
      )) {
        throw new Error('본문 형식이 올바르지 않습니다.')
      }
    }
  }
}

export function loadWiki() {
  try {
    // shortcut: 예시 위키 하나를 이 브라우저에 저장하며, 여러 문서·공동 편집을 지원할 때 API로 교체합니다.
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
  validateWiki(wiki)
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(wiki))
  } catch {
    throw new Error('문서를 저장하지 못했습니다. 브라우저 저장 공간과 설정을 확인해주세요. 입력한 내용은 이 화면에 남아 있습니다.')
  }
}

export function prepareWiki(wiki) {
  const footnotes = []
  const annotate = (text) => {
    const parts = []
    let start = 0
    for (const match of text.matchAll(/\[\*\s+([^\]]+)\]/g)) {
      if (!match[1].trim()) continue
      parts.push(text.slice(start, match.index))
      const note = { number: footnotes.length + 1, content: match[1].trim() }
      footnotes.push(note)
      parts.push(note)
      start = match.index + match[0].length
    }
    parts.push(text.slice(start))
    return parts
  }
  const sections = wiki.sections.map((section) => ({
    ...section,
    blocks: section.blocks.map((block) => {
      if (block.type === 'paragraph') return { ...block, text: annotate(block.text) }
      if (block.type === 'list') return { ...block, items: block.items.map(annotate) }
      return { ...block, rows: block.rows.map((row) => row.map(annotate)) }
    }),
  }))
  return { sections, footnotes }
}
