import { validateWiki } from './wikiSchema.js'
// import { isSafeUrl, isWikiBlock, reservedSectionIds } from './wikiSchema.js'

const maxBytes = 5 * 1024 * 1024

// 파일 입력도 API 응답과 같은 필드 검사·섹션 변환을 거칩니다.
export function parseWikiJson(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > maxBytes) throw new Error('JSON은 5MB 이하로 입력해주세요.')
  let raw
  try {
    // 일부 편집기가 파일 앞에 붙이는 UTF-8 BOM은 문서 내용이 아니므로 파싱 전에 제거합니다.
    raw = JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch {
    throw new Error('JSON 문법이 올바르지 않습니다. 따옴표·쉼표·괄호를 확인해주세요.')
  }
  return parseWikiData(raw)

  /* API에서 제공하지 않는 description·sections·footnotes·references·infobox 입력 처리는 보류합니다.
  const warnings = []
  // 오류가 많은 파일도 경고 목록 때문에 화면이 과도하게 커지지 않도록 제한합니다.
  function warn(path, message) {
    if (warnings.length < 100) warnings.push(`${path}: ${message}`)
    else if (warnings.length === 100) warnings.push('경고가 많아 이후 경고는 생략했습니다. JSON 구조를 확인해주세요.')
  }
  function list(value, path) {
    if (value === undefined) return []
    if (Array.isArray(value)) return value
    warn(path, '배열이 아니어서 제외했습니다.')
    return []
  }
  function string(value, path) {
    if (value === undefined) return ''
    if (typeof value === 'string') return value
    warn(path, '문자열이 아니어서 제외했습니다.')
    return ''
  }
  function image(value, path) {
    if (!value || !isSafeUrl(value.src)) {
      warn(path, '이미지 주소가 없거나 안전하지 않아 제외했습니다.')
      return undefined
    }
    return { src: value.src, alt: string(value.alt, `${path}.alt`), caption: string(value.caption, `${path}.caption`) }
  }
  function link(value, path) {
    if (!value || !isSafeUrl(value.url)) {
      warn(path, '링크 주소가 없거나 안전하지 않아 제외했습니다.')
      return null
    }
    return { url: value.url, label: value.label === undefined ? value.url : string(value.label, `${path}.label`) }
  }
  // 지원하는 유형만 내부 데이터로 옮겨, JSON 값이 임의의 컴포넌트나 HTML로 실행되지 않게 합니다.
  function block(value, path) {
    if (!value || typeof value !== 'object') {
      warn(path, '콘텐츠 객체가 아니어서 제외했습니다.')
      return null
    }
    let result
    switch (value.type) {
      case 'paragraph': result = { type: value.type, text: string(value.text, `${path}.text`) }; break
      case 'list': result = { type: value.type, items: list(value.items, `${path}.items`).filter((item, i) => {
        if (typeof item === 'string') return true
        warn(`${path}.items[${i}]`, '문자열이 아니어서 제외했습니다.')
        return false
      }) }; break
      case 'table': {
        if (value.header !== undefined && typeof value.header !== 'boolean') warn(`${path}.header`, '불리언이 아니어서 머리글 설정을 제외했습니다.')
        result = { type: value.type, caption: string(value.caption, `${path}.caption`), header: value.header === true,
          rows: Array.isArray(value.rows) ? value.rows.map((row) => Array.isArray(row) ? row.map((cell) => ['number', 'boolean'].includes(typeof cell) ? String(cell) : cell) : row) : value.rows }
        break
      }
      case 'image': {
        const data = image(value, path)
        return data ? { type: value.type, ...data } : null
      }
      case 'link': {
        const data = link(value, path)
        return data ? { type: value.type, ...data } : null
      }
      default: warn(path, `지원하지 않는 콘텐츠 유형(${typeof value.type === 'string' ? value.type : '없음'})을 제외했습니다.`); return null
    }
    if (isWikiBlock(result)) return result
    warn(path, '콘텐츠 형식이 올바르지 않아 제외했습니다. 표는 모든 행의 열 수가 같아야 합니다.')
    return null
  }

  // 모든 깊이에서 같은 ID 집합을 사용해야 목차 링크가 다른 섹션이나 화면 요소와 충돌하지 않습니다.
  const ids = new Set(reservedSectionIds)
  let count = 0
  function sections(value, path, depth = 1) {
    // 비정상적으로 깊거나 큰 문서가 재귀 처리와 렌더링을 과도하게 점유하지 않도록 제한합니다.
    const nodes = list(value, path)
    if (nodes.length > 0 && depth > 20) {
      warn(path, '최대 20단계를 넘은 하위 목차를 제외했습니다.')
      return []
    }
    if (nodes.length > Math.max(0, 1000 - count)) warn(path, '최대 1,000개를 넘는 섹션을 제외했습니다.')
    return nodes.slice(0, Math.max(0, 1000 - count)).flatMap((section, i) => {
      const location = `${path}[${i}]`
      if (++count > 1000 || !section || typeof section !== 'object' || Array.isArray(section)) {
        warn(location, '올바른 섹션이 아니거나 최대 1,000개를 넘어 제외했습니다.')
        return []
      }
      let id = section.id
      if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(id) || /^(footnote-|edit-)/.test(id) || ids.has(id)) {
        id = `section-${count}`
        while (ids.has(id)) id += '-section'
        if (section.id !== undefined) warn(`${location}.id`, '중복되거나 잘못된 식별자를 자동 생성했습니다.')
      }
      ids.add(id)
      if (section.title === undefined) warn(`${location}.title`, '제목이 없어 번호만 표시합니다.')
      return [{ id, title: string(section.title, `${location}.title`),
        blocks: list(section.blocks, `${location}.blocks`).map((value, j) => block(value, `${location}.blocks[${j}]`)).filter(Boolean),
        sections: sections(section.sections, `${location}.sections`, depth + 1),
      }]
    })
  }
  const wiki = { title: raw.title, description: string(raw.description, 'description'), sections: sections(raw.sections, 'sections') }
  if (!wiki.sections.length) warn('sections', '표시할 섹션이 없습니다.')
  const noteIds = new Set()
  wiki.footnotes = list(raw.footnotes, 'footnotes').flatMap((note, i) => {
    if (!note || typeof note.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(note.id) || noteIds.has(note.id) || typeof note.content !== 'string') {
      warn(`footnotes[${i}]`, 'id·content가 없거나 id가 중복되어 제외했습니다.')
      return []
    }
    noteIds.add(note.id)
    const result = { id: note.id, content: note.content }
    if (note.url !== undefined) {
      if (isSafeUrl(note.url)) result.url = note.url
      else warn(`footnotes[${i}].url`, '안전하지 않은 출처 주소를 제외했습니다.')
    }
    return [result]
  })
  wiki.references = list(raw.references, 'references').map((value, i) => link(value, `references[${i}]`)).filter(Boolean)
  if (raw.infobox !== undefined) {
    const box = raw.infobox
    if (!box || typeof box !== 'object' || Array.isArray(box)) warn('infobox', '주요 정보 표가 객체가 아니어서 제외했습니다.')
    else {
      const normalized = { title: string(box.title, 'infobox.title'), placement: 'after-toc', fields: [] }
      if (['after-toc', 'top', 'right'].includes(box.placement)) normalized.placement = box.placement
      else if (box.placement !== undefined) warn('infobox.placement', '지원하지 않는 배치여서 목차 다음에 표시합니다.')
      if (box.image !== undefined) normalized.image = image(box.image, 'infobox.image')
      normalized.fields = list(box.fields, 'infobox.fields').flatMap((field, i) => {
        if (!field || typeof field.label !== 'string' || !['string', 'number', 'boolean'].includes(typeof field.value)) {
          warn(`infobox.fields[${i}]`, '항목명·값이 올바르지 않아 제외했습니다.')
          return []
        }
        return [{ label: field.label, value: String(field.value) }]
      })
      // 표시할 정보가 전혀 없으면 빈 정보 표도 만들지 않습니다.
      if (normalized.title || normalized.image || normalized.fields.length) wiki.infobox = normalized
    }
  }
  validateWiki(wiki)
  return { wiki, warnings }
  */
}

// API 응답과 파일 입력을 같은 WikiDocument 구조로 변환합니다.
export function parseWikiData(raw) {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') throw new Error('JSON 최상위 값은 문서 객체여야 합니다.')
  if (typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > 100) throw new Error('JSON에 1~100자의 title이 필요합니다.')

  if (typeof raw.content !== 'string') throw new Error('JSON의 content는 문자열이어야 합니다.')
  if (new TextEncoder().encode(raw.content).length > maxBytes) throw new Error('본문은 5MB 이하로 입력해주세요.')
  if (raw.category !== undefined && typeof raw.category !== 'string') throw new Error('JSON의 category는 문자열이어야 합니다.')

  const wiki = { title: raw.title, category: raw.category ?? '', description: '', sections: [] }
  let section
  let start = 0
  for (const match of raw.content.matchAll(/^##(?!#)[ \t]*([^\r\n]*)(?:\r\n|\n|\r|$)/gm)) {
    if (wiki.sections.length === 1000) throw new Error('섹션은 최대 1,000개까지 지원합니다.')
    if (section) section.blocks[0].text = raw.content.slice(start, match.index)
    else wiki.description = raw.content.slice(0, match.index)
    section = { id: `section-${wiki.sections.length + 1}`, title: match[1].trim(), blocks: [{ type: 'paragraph', text: '' }] }
    wiki.sections.push(section)
    start = match.index + match[0].length
  }
  if (section) section.blocks[0].text = raw.content.slice(start)
  else wiki.description = raw.content
  validateWiki(wiki)
  return { wiki, warnings: [] }
}

// 큰 파일은 읽기 전에 거르고, 파일 읽기 실패와 JSON 형식 오류를 각각 안내합니다.
export async function readWikiJson(file) {
  if (!file || !/\.json$/i.test(file.name)) throw new Error('.json 파일을 선택해주세요.')
  if (file.size > maxBytes) throw new Error('JSON 파일은 5MB 이하여야 합니다.')
  let text
  try {
    text = await file.text()
  } catch {
    throw new Error('JSON 파일을 읽지 못했습니다. 파일을 다시 선택해주세요.')
  }
  return parseWikiJson(text)
}
