const storageKey = 'conversation-wiki:recent-wikis:v1'

export function getRecentWikiIds() {
  try {
    const ids = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(ids) ? [...new Set(ids.filter((id) => typeof id === 'string' && id.trim()))] : []
  } catch {
    return []
  }
}

export function rememberWiki(wiki) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([wiki.id, ...getRecentWikiIds().filter((id) => id !== wiki.id)]))
  } catch {
    // 최근 위키 기록 실패가 위키 생성·조회를 막지 않게 합니다.
  }
  return wiki
}
