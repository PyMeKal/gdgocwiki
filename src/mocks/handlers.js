import { http, HttpResponse } from 'msw'
import { API_BASE_URL } from '../api/wikis.js'
import { readChatFile } from '../utils/readChatFile.js'
import { db, generationPages } from './db.js'

const root = `${API_BASE_URL}/wikis`
const wikiRoute = `${root}/:wikiId`
const now = () => new Date().toISOString()
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0
const cookieName = (wikiId) => `wiki_session_${wikiId}`
const wikiData = ({ id, name, password, createdAt }) => ({ id, name, hasPassword: Boolean(password), createdAt })
const pageData = ({ id, title, category, content, version, updatedAt }) => ({
  id, title, category, content, version, updatedAt,
})

function requireValue(condition, status = 400, code = 'INVALID_REQUEST', message = '잘못된 요청입니다.') {
  if (!condition) throw HttpResponse.json({ code, message }, { status })
}

async function json(request) {
  let body
  try {
    body = await request.json()
  } catch {
    requireValue(false)
  }
  requireValue(body !== null && typeof body === 'object' && !Array.isArray(body))
  return body
}

function resolve(handler, { unlock = false } = {}) {
  return async (context) => {
    try {
      const { params, cookies } = context
      let wiki
      if (params.wikiId) {
        wiki = db.wikis.find((item) => item.id === params.wikiId)
        requireValue(wiki, 404, 'WIKI_NOT_FOUND', '위키를 찾을 수 없습니다.')
        if (!unlock && wiki.password) {
          requireValue(db.sessions[cookies[cookieName(wiki.id)]] === wiki.id,
            401, 'WIKI_PASSWORD_REQUIRED', '비밀번호 인증이 필요합니다.')
        }
      }
      return await handler({ ...context, wiki })
    } catch (error) {
      if (error instanceof Response) return error
      console.error('[MSW] API 처리 실패', error)
      return HttpResponse.json({ code: 'INTERNAL_SERVER_ERROR', message: '서버 내부 오류입니다.' }, { status: 500 })
    }
  }
}

function findPage(wikiId, pageId) {
  const page = db.pages.find((item) => item.wikiId === wikiId && item.id === pageId)
  requireValue(page, 404, 'PAGE_NOT_FOUND', '문서를 찾을 수 없습니다.')
  return page
}

function completeGeneration(wiki, job) {
  if (!job.chatIds.every((chatId) => db.chats.some((chat) => chat.wikiId === wiki.id && chat.id === chatId))) {
    job.status = 'FAILED'
    return
  }
  if (job.mode === 'REGENERATE') {
    db.pages = db.pages.filter((page) => page.wikiId !== wiki.id || !page.generationKey)
  }
  job.createdPages = 0
  job.updatedPages = 0
  job.createdPageIds = []
  // shortcut: AI 대신 고정 문서를 생성한다. 실제 생성 서버 연결 시 교체한다.
  for (const template of generationPages) {
    const existing = db.pages.find((page) => page.wikiId === wiki.id && page.generationKey === template.id)
    if (existing) {
      Object.assign(existing, { content: template.content, version: existing.version + 1, updatedAt: now() })
      job.updatedPages += 1
    } else {
      const page = {
        ...template, id: id('page'), wikiId: wiki.id, generationKey: template.id, version: 1, updatedAt: now(),
      }
      db.pages.push(page)
      job.createdPages += 1
      job.createdPageIds.push(page.id)
    }
  }
  job.status = 'COMPLETED'
}

export const handlers = [
  // POST /wikis — 위키 생성
  http.post(root, resolve(async ({ request }) => {
    const body = await json(request)
    requireValue(nonempty(body.name) && (body.password === undefined || typeof body.password === 'string'))
    const wiki = { id: crypto.randomUUID(), name: body.name, password: body.password || '', createdAt: now() }
    db.wikis.push(wiki)
    return HttpResponse.json({
      id: wiki.id, name: wiki.name, url: `${new URL(request.url).origin}/wiki/${wiki.id}`, hasPassword: Boolean(wiki.password),
    }, { status: 201 })
  })),
  // POST /wikis/:wikiId/unlock — 비밀번호 인증 및 세션 발급
  http.post(`${wikiRoute}/unlock`, resolve(async ({ request, wiki }) => {
    const body = await json(request)
    requireValue(typeof body.password === 'string')
    requireValue(!wiki.password || body.password === wiki.password,
      403, 'WIKI_PASSWORD_INVALID', '비밀번호가 올바르지 않습니다.')
    const token = crypto.randomUUID()
    db.sessions[token] = wiki.id
    // shortcut: MSW 쿠키는 HttpOnly 보안을 재현하지 못한다. 실제 서버에서는 HttpOnly로 발급한다.
    return new HttpResponse(null, { status: 204, headers: {
      'Set-Cookie': `${cookieName(wiki.id)}=${token}; Path=/; HttpOnly; SameSite=Lax`,
    } })
  }, { unlock: true })),
  // GET /wikis/:wikiId — 위키 기본 정보 조회
  http.get(wikiRoute, resolve(({ wiki }) => HttpResponse.json(wikiData(wiki)))),
  // PATCH /wikis/:wikiId — 위키 이름·비밀번호 수정
  http.patch(wikiRoute, resolve(async ({ wiki, request }) => {
    const body = await json(request)
    requireValue(Object.hasOwn(body, 'name') || Object.hasOwn(body, 'password'))
    requireValue(body.name === undefined || nonempty(body.name))
    requireValue(body.password === undefined || typeof body.password === 'string')
    if (body.name !== undefined) wiki.name = body.name
    if (body.password !== undefined) {
      wiki.password = body.password
      for (const [token, wikiId] of Object.entries(db.sessions)) {
        if (wikiId === wiki.id) delete db.sessions[token]
      }
    }
    return HttpResponse.json(wikiData(wiki))
  })),
  // POST /wikis/:wikiId/chats — 카카오톡 대화 TXT 파일 업로드
  http.post(`${wikiRoute}/chats`, resolve(async ({ wiki, request }) => {
    let form
    try {
      form = await request.formData()
    } catch {
      requireValue(false)
    }
    const file = form.get('file')
    requireValue(file instanceof File)
    requireValue(file.size <= 10 * 1024 * 1024, 413, 'FILE_TOO_LARGE', '10MB 이하의 파일을 선택해주세요.')
    let text
    try {
      const result = await readChatFile(file)
      text = result.text
    } catch (error) {
      requireValue(false, 400, 'INVALID_CHAT_FILE', error.message)
    }
    // shortcut: 메시지 수는 빈 줄을 제외한 줄 수다. 실제 카카오톡 파서 연결 시 교체한다.
    const chat = {
      id: id('chat'), wikiId: wiki.id, fileName: file.name,
      messageCount: text.split(/\r\n|\n|\r/).filter((line) => line.trim()).length, uploadedAt: now(),
    }
    db.chats.push(chat)
    return HttpResponse.json({ id: chat.id, messageCount: chat.messageCount, uploadedAt: chat.uploadedAt }, { status: 201 })
  })),
  // GET /wikis/:wikiId/chats — 업로드한 대화 목록 조회
  http.get(`${wikiRoute}/chats`, resolve(({ wiki }) => HttpResponse.json({
    chats: db.chats.filter((chat) => chat.wikiId === wiki.id)
      .map(({ id, fileName, messageCount, uploadedAt }) => ({ id, fileName, messageCount, uploadedAt })),
  }))),
  // POST /wikis/:wikiId/generations — 대화 기반 문서 생성·갱신 작업 요청
  http.post(`${wikiRoute}/generations`, resolve(async ({ wiki, request }) => {
    const body = await json(request)
    requireValue(['MERGE', 'REGENERATE'].includes(body.mode)
      && Array.isArray(body.chatIds) && body.chatIds.length > 0 && body.chatIds.every(nonempty))
    requireValue(body.chatIds.every((chatId) => db.chats.some((chat) => chat.wikiId === wiki.id && chat.id === chatId)),
      404, 'CHAT_NOT_FOUND', '대화 내역을 찾을 수 없습니다.')
    const job = { jobId: id('job'), wikiId: wiki.id, chatIds: body.chatIds, mode: body.mode, status: 'PENDING' }
    db.jobs.push(job)
    return HttpResponse.json({ jobId: job.jobId, status: job.status }, { status: 202 })
  })),
  // GET /wikis/:wikiId/generations/:jobId — 생성 작업 상태·결과 조회
  http.get(`${wikiRoute}/generations/:jobId`, resolve(({ wiki, params }) => {
    const job = db.jobs.find((item) => item.wikiId === wiki.id && item.jobId === params.jobId)
    requireValue(job, 404, 'JOB_NOT_FOUND', '생성 작업을 찾을 수 없습니다.')
    if (job.status === 'PENDING') job.status = 'PROCESSING'
    else if (job.status === 'PROCESSING') completeGeneration(wiki, job)
    const { jobId, status, createdPages, updatedPages, createdPageIds } = job
    return HttpResponse.json({ jobId, status, ...(status === 'COMPLETED' ? {
      createdPages, updatedPages, createdPageIds,
    } : {}) })
  })),
  // GET /wikis/:wikiId/pages — 위키 문서 목록 조회
  http.get(`${wikiRoute}/pages`, resolve(({ wiki }) => HttpResponse.json({
    pages: db.pages.filter((page) => page.wikiId === wiki.id).map(({ id, title, category }) => ({ id, title, category })),
  }))),
  // POST /wikis/:wikiId/pages — 위키 문서 생성
  http.post(`${wikiRoute}/pages`, resolve(async ({ wiki, request }) => {
    const body = await json(request)
    requireValue(nonempty(body.title) && nonempty(body.category) && typeof body.content === 'string')
    const page = {
      id: id('page'), wikiId: wiki.id, title: body.title, category: body.category,
      content: body.content, version: 1, updatedAt: now(),
    }
    db.pages.push(page)
    return HttpResponse.json({ id: page.id, title: page.title }, { status: 201 })
  })),
  // GET /wikis/:wikiId/pages/:pageId — 문서 본문·버전 조회
  http.get(`${wikiRoute}/pages/:pageId`, resolve(({ wiki, params }) => HttpResponse.json(pageData(findPage(wiki.id, params.pageId))))),
  // PATCH /wikis/:wikiId/pages/:pageId — 버전 충돌 검사 후 문서 본문 수정
  http.patch(`${wikiRoute}/pages/:pageId`, resolve(async ({ wiki, params, request }) => {
    const page = findPage(wiki.id, params.pageId)
    const body = await json(request)
    requireValue(typeof body.content === 'string' && Number.isInteger(body.version) && body.version > 0)
    requireValue(body.version === page.version, 409, 'PAGE_VERSION_CONFLICT', '다른 사용자가 수정한 문서입니다. 다시 불러와주세요.')
    Object.assign(page, { content: body.content, version: page.version + 1, updatedAt: now() })
    return HttpResponse.json({ id: page.id, version: page.version, updatedAt: page.updatedAt })
  })),
  // DELETE /wikis/:wikiId/pages/:pageId — 위키 문서 삭제
  http.delete(`${wikiRoute}/pages/:pageId`, resolve(({ wiki, params }) => {
    const page = findPage(wiki.id, params.pageId)
    db.pages.splice(db.pages.indexOf(page), 1)
    return new HttpResponse(null, { status: 204 })
  })),
]
