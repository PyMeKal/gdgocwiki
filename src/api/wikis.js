import { getRecentWikiIds, rememberWiki } from '../utils/recentWikis.js'

export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

async function request(path, { method = 'GET', body } = {}) {
  const isForm = body instanceof FormData
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {},
    body: body === undefined || isForm ? body : JSON.stringify(body),
  })
  if (response.status === 204) return undefined
  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data.message)
    error.status = response.status
    error.code = data.code
    throw error
  }
  return data
}

const wikiPath = (wikiId) => `/wikis/${encodeURIComponent(wikiId)}`
const pagePath = (wikiId, pageId) => `${wikiPath(wikiId)}/pages/${encodeURIComponent(pageId)}`

export async function getWikis() {
  const results = await Promise.all(getRecentWikiIds().map((id) => getWiki(id).catch(() => null)))
  const data = { wikis: results.filter(Boolean) }
  if (!Array.isArray(data?.wikis) || data.wikis.some((wiki) =>
    !wiki || typeof wiki.id !== 'string' || !wiki.id.trim() ||
    typeof wiki.name !== 'string' || !wiki.name.trim() || typeof wiki.hasPassword !== 'boolean'
  ) || new Set(data.wikis.map((wiki) => wiki.id)).size !== data.wikis.length) {
    throw new Error('위키 목록 응답이 올바르지 않습니다.')
  }
  return data
}

export const createWiki = (data) => request('/wikis', { method: 'POST', body: data }).then(rememberWiki)
export const getWiki = (wikiId) => request(wikiPath(wikiId)).then(rememberWiki)
export const updateWiki = (wikiId, data) => request(wikiPath(wikiId), { method: 'PATCH', body: data })
export const unlockWiki = (wikiId, password) => request(`${wikiPath(wikiId)}/unlock`, {
  method: 'POST', body: { password },
})
export const uploadChat = (wikiId, file) => {
  const body = new FormData()
  body.append('file', file)
  return request(`${wikiPath(wikiId)}/chats`, { method: 'POST', body })
}
export const getChats = (wikiId) => request(`${wikiPath(wikiId)}/chats`)
export const generatePages = (wikiId, data) => request(`${wikiPath(wikiId)}/generations`, {
  method: 'POST', body: data,
})
export const getGeneration = (wikiId, jobId) => request(
  `${wikiPath(wikiId)}/generations/${encodeURIComponent(jobId)}`,
)
export const getPages = (wikiId) => request(`${wikiPath(wikiId)}/pages`)
export const createPage = (wikiId, data) => request(`${wikiPath(wikiId)}/pages`, { method: 'POST', body: data })
export const getPage = (wikiId, pageId) => request(pagePath(wikiId, pageId))
export const updatePage = (wikiId, pageId, data) => request(pagePath(wikiId, pageId), {
  method: 'PATCH', body: data,
})
export const deletePage = (wikiId, pageId) => request(pagePath(wikiId, pageId), { method: 'DELETE' })
