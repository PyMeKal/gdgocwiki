import axios from 'axios'
import { logApiResult } from './logApiResult.js'
import { rememberWiki } from '../utils/recentWikis.js'
import { generationCreatedSchema, generationSchema, pagesSchema, wikiSchema } from './responseSchemas.js'

export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

async function request(path, { method = 'GET', body, schema, responseName } = {}) {
  const isForm = body instanceof FormData
  let status
  try {
    const response = await axios.request({
      url: `${API_BASE_URL}${path}`,
      method,
      withCredentials: true,
      withXSRFToken: false,
      headers: { 'Content-Type': body !== undefined && !isForm ? 'application/json' : false },
      data: body === undefined || isForm ? body : JSON.stringify(body),
      // 기존처럼 JSON 형식과 HTTP 오류를 아래에서 처리합니다.
      responseType: 'text',
      transformResponse: [(data) => data],
      validateStatus: () => true,
    })
    status = response.status
    let data
    if (status !== 204) {
      data = null
      try { data = JSON.parse(response.data) } catch { /* JSON이 아닌 응답도 기존 오류 처리로 전달합니다. */ }
      if (status < 200 || status >= 300) {
        const error = new Error(data?.message || `API 요청에 실패했습니다. (${status})`)
        error.status = status
        error.code = data?.code
        throw error
      }
      if (data === null) throw new Error('API 응답이 올바른 JSON이 아닙니다.')
    }
    if (schema) {
      const result = schema.safeParse(data)
      if (!result.success) throw new Error(`${responseName} 응답 형식이 올바르지 않습니다.`)
      data = result.data
    }
    logApiResult({ method, path, status, success: true })
    return data
  } catch (error) {
    logApiResult({ method, path, status, success: false })
    throw error
  }
}

const wikiPath = (wikiId) => `/wikis/${encodeURIComponent(wikiId)}`
const pagePath = (wikiId, pageId) => `${wikiPath(wikiId)}/pages/${encodeURIComponent(pageId)}`

export const createWiki = (data) => request('/wikis', {
  method: 'POST', body: data, schema: wikiSchema, responseName: '위키',
}).then(rememberWiki)
export const getWiki = (wikiId) => request(wikiPath(wikiId), { schema: wikiSchema, responseName: '위키' }).then(rememberWiki)
export const updateWiki = (wikiId, data) => request(wikiPath(wikiId), {
  method: 'PATCH', body: data, schema: wikiSchema, responseName: '위키',
})
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
  method: 'POST', body: data, schema: generationCreatedSchema, responseName: '생성 요청',
})
export const getGeneration = (wikiId, jobId) => request(
  `${wikiPath(wikiId)}/generations/${encodeURIComponent(jobId)}`,
  { schema: generationSchema, responseName: '생성 작업 상태' },
)
export const getPages = (wikiId) => request(`${wikiPath(wikiId)}/pages`, { schema: pagesSchema, responseName: '문서 목록' })
export const createPage = (wikiId, data) => request(`${wikiPath(wikiId)}/pages`, { method: 'POST', body: data })
export const getPage = (wikiId, pageId) => request(pagePath(wikiId, pageId))
export const updatePage = (wikiId, pageId, data) => request(pagePath(wikiId, pageId), {
  method: 'PATCH', body: data,
})
export const deletePage = (wikiId, pageId) => request(pagePath(wikiId, pageId), { method: 'DELETE' })
