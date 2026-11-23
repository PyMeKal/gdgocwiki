import { validateWiki } from './wikiSchema.js'

const maxBytes = 5 * 1024 * 1024
const sectionHeading = /^(?:##(?!#)[ \t]*([^\r\n]*)|[ \t]*(={2})(?!=)([^\r\n]*?[^=\r\n])\2(?!=)[ \t]*)(?:\r\n|\n|\r|$)/gm
const listItem = /^[ \t]*\*[ \t]+([^\r\n]*)(?:\r\n|\n|\r|$)/gm

export function parseWikiBlocks(text) {
  const blocks = []
  let start = 0
  for (const match of text.matchAll(listItem)) {
    if (match.index > start) blocks.push({ type: 'paragraph', text: text.slice(start, match.index) })
    if (blocks.at(-1)?.type !== 'list') blocks.push({ type: 'list', items: [] })
    blocks.at(-1).items.push(match[1])
    start = match.index + match[0].length
  }
  if (start < text.length || blocks.length === 0) blocks.push({ type: 'paragraph', text: text.slice(start) })
  return blocks
}

// 표시할 때와 같은 경계를 사용하고, 다른 섹션의 공백·줄바꿈은 원문 그대로 보존합니다.
export function getPageSection(content, sectionId) {
  const headings = [...content.matchAll(sectionHeading)]
  const index = headings.findIndex((_, index) => sectionId === `section-${index + 1}`)
  if (index < 0) throw new Error('편집할 섹션을 찾을 수 없습니다. 문서로 돌아가 다시 선택해주세요.')
  const start = headings[index].index
  const end = headings[index + 1]?.index ?? content.length
  return { start, end, content: content.slice(start, end) }
}

// API 응답을 WikiDocument 구조로 변환합니다.
export function parseWikiData(raw) {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') throw new Error('JSON 최상위 값은 문서 객체여야 합니다.')
  if (typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > 100) throw new Error('JSON에 1~100자의 title이 필요합니다.')

  if (typeof raw.content !== 'string') throw new Error('JSON의 content는 문자열이어야 합니다.')
  if (new TextEncoder().encode(raw.content).length > maxBytes) throw new Error('본문은 5MB 이하로 입력해주세요.')
  if (raw.category !== undefined && typeof raw.category !== 'string') throw new Error('JSON의 category는 문자열이어야 합니다.')

  const wiki = { title: raw.title, category: raw.category ?? '', description: '', sections: [] }
  let section
  let start = 0
  for (const match of raw.content.matchAll(sectionHeading)) {
    if (wiki.sections.length === 1000) throw new Error('섹션은 최대 1,000개까지 지원합니다.')
    if (section) section.blocks = parseWikiBlocks(raw.content.slice(start, match.index))
    else wiki.description = raw.content.slice(0, match.index)
    section = { id: `section-${wiki.sections.length + 1}`, title: (match[1] ?? match[3]).trim(), blocks: [{ type: 'paragraph', text: '' }] }
    wiki.sections.push(section)
    start = match.index + match[0].length
  }
  if (section) section.blocks = parseWikiBlocks(raw.content.slice(start))
  else wiki.description = raw.content
  validateWiki(wiki)
  return { wiki, warnings: [] }
}
