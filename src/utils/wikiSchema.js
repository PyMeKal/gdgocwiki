// 화면이 이미 사용하는 ID를 입력 JSON이 가져가면 목차나 접근성 연결이 잘못된 요소를 가리킬 수 있습니다.
export const reservedSectionIds = ['main', 'footnotes-title', 'references-title', 'infobox-title', 'wiki-preview-title']

export function isSafeUrl(value) {
  if (typeof value !== 'string' || !value.trim() || [...value].some((char) => char.charCodeAt(0) <= 32 || char === '\\') || value.startsWith('//')) return false
  try {
    // 기준 주소는 상대 경로의 프로토콜 검사에만 쓰며 실제로 이 주소에 요청하지 않습니다.
    return ['https:', 'http:'].includes(new URL(value, 'https://wiki.invalid/').protocol)
  } catch {
    return false
  }
}

const strings = (values) => Array.isArray(values) && values.every((value) => typeof value === 'string')
export const isImage = (image) => image && isSafeUrl(image.src) && typeof image.alt === 'string' && typeof image.caption === 'string'
export const isLink = (link) => link && isSafeUrl(link.url) && typeof link.label === 'string'

export function isWikiBlock(block) {
  return !!block && (
    (block.type === 'paragraph' && typeof block.text === 'string') ||
    (block.type === 'list' && strings(block.items)) ||
    (block.type === 'image' && isImage(block)) ||
    (block.type === 'link' && isLink(block)) ||
    (block.type === 'table' && typeof block.caption === 'string' && typeof block.header === 'boolean' &&
      Array.isArray(block.rows) && block.rows.length > 0 && Array.isArray(block.rows[0]) && block.rows[0].length > 0 &&
      block.rows.every((row) => strings(row) && row.length === block.rows[0].length))
  )
}

// 가져온 데이터뿐 아니라 브라우저 저장 데이터와 편집 결과도 같은 규칙으로 검사합니다.
export function validateWiki(wiki) {
  if (!wiki || typeof wiki.title !== 'string' || !wiki.title.trim() || wiki.title.length > 100 || typeof wiki.description !== 'string') {
    throw new Error('문서 제목을 1~100자로 입력해주세요.')
  }
  const ids = new Set(reservedSectionIds)
  let count = 0
  function sections(nodes, depth = 1) {
    if (!Array.isArray(nodes) || (nodes.length > 0 && depth > 20)) throw new Error('목차 구성을 확인해주세요. 최대 20단계까지 지원합니다.')
    for (const section of nodes) {
      if (++count > 1000 || !section || typeof section.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(section.id) ||
          /^(footnote-|edit-)/.test(section.id) || ids.has(section.id) || typeof section.title !== 'string' ||
          !Array.isArray(section.blocks) || !section.blocks.every(isWikiBlock)) {
        throw new Error('목차 또는 본문 형식이 올바르지 않습니다.')
      }
      ids.add(section.id)
      if (section.sections !== undefined) sections(section.sections, depth + 1)
    }
  }
  sections(wiki.sections)
  if (wiki.footnotes !== undefined) {
    const notes = new Set()
    if (!Array.isArray(wiki.footnotes) || !wiki.footnotes.every((note) => {
      if (!note || typeof note.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(note.id) || notes.has(note.id) ||
          typeof note.content !== 'string' || (note.url !== undefined && !isSafeUrl(note.url))) return false
      notes.add(note.id)
      return true
    })) throw new Error('주석 형식이 올바르지 않습니다.')
  }
  if (wiki.references !== undefined && (!Array.isArray(wiki.references) || !wiki.references.every(isLink))) {
    throw new Error('참고 링크 형식이 올바르지 않습니다.')
  }
  if (wiki.infobox !== undefined) {
    const box = wiki.infobox
    if (!box || typeof box.title !== 'string' || !['after-toc', 'top', 'right'].includes(box.placement) ||
        (box.image !== undefined && !isImage(box.image)) || !Array.isArray(box.fields) ||
        !box.fields.every((field) => field && typeof field.label === 'string' && typeof field.value === 'string')) {
      throw new Error('주요 정보 표 형식이 올바르지 않습니다.')
    }
  }
}
