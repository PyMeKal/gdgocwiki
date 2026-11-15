import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { readFile } from 'node:fs/promises'
import { generationLoader, pageEditAction, pageEditLoader, uploadAction } from '../src/api/routeHandlers.js'
import * as api from '../src/api/wikis.js'
import { handlers } from '../src/mocks/handlers.js'
import { configureDbStorage, db, DEMO_WIKI_ID, resetDb } from '../src/mocks/db.js'

const server = setupServer(...handlers)
const originalFetch = globalThis.fetch
const originalLocation = globalThis.location

before(() => {
  // Node에서도 브라우저처럼 상대 URL을 해석한다. 쿠키는 요청별로 직접 전달한다.
  globalThis.location = new URL('http://localhost/')
  server.listen({ onUnhandledFrame: 'error' })
  const interceptedFetch = globalThis.fetch
  globalThis.fetch = (path, options) => interceptedFetch(new URL(path, location.href), options)
})
beforeEach(() => { resetDb(); server.resetHandlers() })
after(() => {
  server.close()
  globalThis.fetch = originalFetch
  if (originalLocation === undefined) delete globalThis.location
  else globalThis.location = originalLocation
})

async function send(path, { method = 'GET', body, cookie } = {}) {
  return fetch(path, {
    method,
    credentials: 'include',
    headers: {
      ...(body === undefined || body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined || body instanceof FormData ? body : JSON.stringify(body),
  })
}

const errorIs = (status, code) => (error) => error.status === status && error.code === code

test('wiki creation, retrieval and settings use the documented JSON contract', async () => {
  const response = await send('/wikis', { method: 'POST', body: { name: '새 위키' } })
  assert.equal(response.status, 201)
  const created = await response.json()
  assert.equal(created.name, '새 위키')
  assert.equal(created.hasPassword, false)
  assert.equal(created.url, `http://localhost/wiki/${created.id}`)
  assert.match(created.id, /^[\da-f-]{36}$/)
  const wiki = await api.getWiki(created.id)
  assert.deepEqual(Object.keys(wiki).sort(), ['createdAt', 'hasPassword', 'id', 'name'])
  assert.ok(Number.isFinite(Date.parse(wiki.createdAt)))
  const updated = await api.updateWiki(created.id, { name: '수정한 위키' })
  assert.equal(updated.name, '수정한 위키')
  assert.equal((await api.getWiki(created.id)).name, '수정한 위키')
})

test('password sessions are required, wiki-scoped and invalidated when the password changes', async () => {
  const path = `/wikis/${DEMO_WIKI_ID}`
  await assert.rejects(api.getWiki(DEMO_WIKI_ID), errorIs(401, 'WIKI_PASSWORD_REQUIRED'))
  await assert.rejects(api.unlockWiki(DEMO_WIKI_ID, 'wrong'), errorIs(403, 'WIKI_PASSWORD_INVALID'))
  const unlocked = await send(`${path}/unlock`, { method: 'POST', body: { password: '1234' } })
  assert.equal(unlocked.status, 204)
  assert.equal(await unlocked.text(), '')
  const cookieHeader = unlocked.headers.get('set-cookie')
  assert.match(cookieHeader, /HttpOnly/)
  const cookie = cookieHeader.split(';')[0]
  const response = await send(path, { cookie })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).hasPassword, true)

  const other = await api.createWiki({ name: '다른 위키', password: 'abcd' })
  assert.equal((await send(`/wikis/${other.id}/pages`, { cookie })).status, 401)
  const changed = await send(path, { method: 'PATCH', cookie, body: { password: '5678' } })
  assert.equal(changed.status, 200)
  assert.equal((await send(path, { cookie })).status, 401)
  await assert.rejects(api.unlockWiki(DEMO_WIKI_ID, '1234'), errorIs(403, 'WIKI_PASSWORD_INVALID'))
  const newSession = await send(`${path}/unlock`, { method: 'POST', body: { password: '5678' } })
  const newCookie = newSession.headers.get('set-cookie').split(';')[0]
  assert.equal((await send(path, { method: 'PATCH', cookie: newCookie, body: { password: '' } })).status, 200)
  assert.equal((await api.getWiki(DEMO_WIKI_ID)).hasPassword, false)
})

test('page CRUD persists, hides internal fields and rejects stale versions without changing data', async () => {
  const wiki = await api.createWiki({ name: '문서 테스트' })
  const other = await api.createWiki({ name: '다른 위키' })
  assert.deepEqual(await api.getPages(wiki.id), { pages: [] })
  const created = await send(`/wikis/${wiki.id}/pages`, { method: 'POST', body: {
    title: '새 문서', category: 'EVENT', content: '## 제목\n본문',
  } })
  assert.equal(created.status, 201)
  const { id: pageId, title } = await created.json()
  assert.equal(title, '새 문서')
  const page = await api.getPage(wiki.id, pageId)
  assert.equal(page.version, 1)
  assert.equal(page.content, '## 제목\n본문')
  assert.deepEqual(Object.keys(page).sort(), ['category', 'content', 'id', 'title', 'updatedAt', 'version'])
  assert.deepEqual((await api.getPages(wiki.id)).pages, [{ id: pageId, title, category: 'EVENT' }])
  assert.deepEqual((await api.getPages(other.id)).pages, [])
  await assert.rejects(api.getPage(other.id, pageId), errorIs(404, 'PAGE_NOT_FOUND'))
  const updated = await api.updatePage(wiki.id, pageId, { content: '수정 본문', version: 1 })
  assert.equal(updated.version, 2)
  await assert.rejects(api.updatePage(wiki.id, pageId, { content: '덮어쓰기', version: 1 }), errorIs(409, 'PAGE_VERSION_CONFLICT'))
  assert.equal((await api.getPage(wiki.id, pageId)).content, '수정 본문')
  assert.equal(await api.deletePage(wiki.id, pageId), undefined)
  await assert.rejects(api.getPage(wiki.id, pageId), errorIs(404, 'PAGE_NOT_FOUND'))
  assert.deepEqual((await api.getPages(wiki.id)).pages, [])
})

function editRequest(wikiId, pagesId, { content, version = 1, section } = {}) {
  const body = new FormData()
  if (content !== undefined) body.set('content', content)
  body.set('version', version)
  return {
    params: { wikiId, pagesId },
    request: new Request(`http://localhost/wiki/${wikiId}/pages/${pagesId}/edit${section === undefined ? '' : `?section=${section}`}`, { method: 'POST', body }),
  }
}

test('page edit loads the API document and PATCHes content with its version before redirecting', async () => {
  const wiki = await api.createWiki({ name: '편집 테스트' })
  const page = await api.createPage(wiki.id, { title: '문서', category: 'EVENT', content: '## 개요\n이전 본문' })
  const args = editRequest(wiki.id, page.id, { content: '소개\n## 개요\n수정 본문\n## 일정\n새 일정' })
  const loaded = await pageEditLoader(args)
  assert.equal(loaded.page.version, 1)
  assert.equal(loaded.editContent, '## 개요\n이전 본문')
  let sent
  server.use(http.patch('http://localhost/wikis/:wikiId/pages/:pageId', async ({ request }) => {
    sent = await request.clone().json()
  }))
  const result = await pageEditAction(args)
  assert.equal(result.status, 302)
  assert.equal(result.headers.get('Location'), `/wiki/${wiki.id}/pages/${page.id}`)
  assert.deepEqual(sent, { content: '소개\r\n## 개요\r\n수정 본문\r\n## 일정\r\n새 일정', version: 1 })
  const saved = await api.getPage(wiki.id, page.id)
  assert.equal(saved.content, sent.content)
  assert.equal(saved.version, 2)
})

test('section edits preserve the introduction and other sections byte for byte, including line endings', async () => {
  const wiki = await api.createWiki({ name: '부분 편집' })
  const prefix = '소개\r\n\r\n## 같은 제목\r\n보존 본문\r\n\r\n'
  const suffix = '## 마지막\r\n보존할 마지막 본문'
  const page = await api.createPage(wiki.id, { title: '문서', category: 'EVENT', content: `${prefix}##같은 제목\r\n변경 전\r\n${suffix}` })
  const args = editRequest(wiki.id, page.id, { content: '## 수정 제목\n변경 후[* 주석]', section: 'section-2' })
  assert.equal((await pageEditLoader(args)).editContent, '##같은 제목\r\n변경 전\r\n')
  const result = await pageEditAction(args)
  assert.equal(result.headers.get('Location'), `/wiki/${wiki.id}/pages/${page.id}#section-2`)
  assert.equal((await api.getPage(wiki.id, page.id)).content, `${prefix}## 수정 제목\r\n변경 후[* 주석]\n${suffix}`)
  const last = await pageEditAction(editRequest(wiki.id, page.id, { content: '## 끝', section: 'section-3', version: 2 }))
  assert.equal(last.status, 302)
  assert.equal((await api.getPage(wiki.id, page.id)).content, `${prefix}## 수정 제목\r\n변경 후[* 주석]\n## 끝`)
})

test('invalid edits, version conflicts and save failures preserve the stored document', async () => {
  const wiki = await api.createWiki({ name: '편집 오류' })
  const page = await api.createPage(wiki.id, { title: '문서', category: 'EVENT', content: '## 개요\n원본' })
  const original = await api.getPage(wiki.id, page.id)
  for (const input of [
    {}, { content: '본문', version: 0 }, { content: '본문', version: 'bad' },
    { content: '## 제목\n본문', section: 'section-2' }, { content: '', section: '' },
    { content: '제목 없는 본문', section: 'section-1' },
    { content: '## 첫 섹션\n## 다른 섹션', section: 'section-1' },
    { content: '머리말\n## 제목', section: 'section-1' },
    { content: 'a'.repeat(5 * 1024 * 1024 + 1) },
    { content: '## 제목\n'.repeat(1001) },
    { content: '충돌 내용', version: 2 },
  ]) {
    assert.ok((await pageEditAction(editRequest(wiki.id, page.id, input))).error)
    assert.deepEqual(await api.getPage(wiki.id, page.id), original)
  }
  await assert.rejects(pageEditLoader(editRequest(wiki.id, page.id, { section: 'section-2' })), /섹션을 찾을 수 없습니다/)
  server.use(http.patch('http://localhost/wikis/:wikiId/pages/:pageId', () => HttpResponse.json({ message: '저장 실패' }, { status: 500 })))
  assert.deepEqual(await pageEditAction(editRequest(wiki.id, page.id, { content: '수정한 본문' })), { error: '저장 실패' })
  assert.deepEqual(await api.getPage(wiki.id, page.id), original)
  server.use(http.patch('http://localhost/wikis/:wikiId/pages/:pageId', () => HttpResponse.json({ message: '동시 수정 충돌' }, { status: 409 })))
  assert.deepEqual(await pageEditAction(editRequest(wiki.id, page.id, { content: '수정한 본문' })), { error: '동시 수정 충돌' })
  assert.deepEqual(await api.getPage(wiki.id, page.id), original)
})

test('multipart upload accepts Korean TXT files and returns wiki-scoped upload metadata', async () => {
  const wiki = await api.createWiki({ name: '대화 테스트' })
  const chat = await api.uploadChat(wiki.id, new File(['첫 메시지\r\n\r\n두 번째 메시지'], '대화.txt'))
  assert.deepEqual(Object.keys(chat).sort(), ['id', 'messageCount', 'uploadedAt'])
  assert.equal(chat.messageCount, 2)
  assert.ok(Number.isFinite(Date.parse(chat.uploadedAt)))
  assert.deepEqual((await api.getChats(wiki.id)).chats, [{ ...chat, fileName: '대화.txt' }])
  const other = await api.createWiki({ name: '다른 위키' })
  assert.deepEqual((await api.getChats(other.id)).chats, [])
  const form = new FormData()
  form.append('file', new File(['한 줄'], 'chat.txt'))
  assert.equal((await send(`/wikis/${wiki.id}/chats`, { method: 'POST', body: form })).status, 201)
})

test('invalid bodies, missing resources and upload errors use common JSON errors', async () => {
  for (const body of [null, [], {}, { name: ' ' }, { name: '위키', password: 1234 }]) {
    const response = await send('/wikis', { method: 'POST', body })
    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), { code: 'INVALID_REQUEST', message: '잘못된 요청입니다.' })
  }
  const malformed = await fetch('/wikis', { method: 'POST', body: '{' })
  assert.equal(malformed.status, 400)
  await assert.rejects(api.getWiki('missing'), errorIs(404, 'WIKI_NOT_FOUND'))
  const wiki = await api.createWiki({ name: '검증 테스트' })
  await assert.rejects(api.updateWiki(wiki.id, { password: null }), errorIs(400, 'INVALID_REQUEST'))
  await assert.rejects(api.createPage(wiki.id, { title: '빈 문서' }), errorIs(400, 'INVALID_REQUEST'))
  assert.equal((await send(`/wikis/${wiki.id}/chats`, { method: 'POST', body: new FormData() })).status, 400)
  for (const file of [new File(['text'], 'chat.csv'), new File([], 'empty.txt'), new File(['a\0b'], 'binary.txt')]) {
    await assert.rejects(api.uploadChat(wiki.id, file), errorIs(400, 'INVALID_CHAT_FILE'))
  }
  await assert.rejects(api.uploadChat(wiki.id, new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.txt')),
    errorIs(413, 'FILE_TOO_LARGE'))
  assert.deepEqual((await api.getChats(wiki.id)).chats, [])
})

async function finishJob(wikiId, mode, chatIds) {
  const job = await api.generatePages(wikiId, { mode, chatIds })
  assert.equal(job.status, 'PENDING')
  const stored = db.jobs.find((item) => item.jobId === job.jobId)
  stored.startedAt = Date.now() - 1500
  assert.equal((await api.getGeneration(wikiId, job.jobId)).status, 'PROCESSING')
  stored.startedAt = Date.now() - 6001
  const done = await generationLoader({ params: { wikiId, jobId: job.jobId } })
  assert.equal(done.status, 'COMPLETED')
  assert.deepEqual(await api.getGeneration(wikiId, job.jobId), done)
  return done
}

test('generation simulates polling, merge and regeneration while preserving manual pages', async () => {
  const wiki = await api.createWiki({ name: '생성 테스트' })
  const manual = await api.createPage(wiki.id, { title: '직접 작성', category: 'PERSON', content: '보존할 문서' })
  const text = await readFile(new URL('../public/examples/kakao-chat.txt', import.meta.url), 'utf8')
  const chat = await api.uploadChat(wiki.id, new File([text], 'chat.txt'))
  const generated = await finishJob(wiki.id, 'MERGE', [chat.id])
  assert.equal(generated.createdPages, 3)
  assert.equal(generated.updatedPages, 0)
  assert.equal(generated.createdPageIds.length, 3)
  assert.equal((await api.getPages(wiki.id)).pages.length, 4)
  const merged = await finishJob(wiki.id, 'MERGE', [chat.id])
  assert.equal(merged.createdPages, 0)
  assert.equal(merged.updatedPages, 3)
  assert.equal((await api.getPage(wiki.id, generated.createdPageIds[0])).version, 2)
  const regenerated = await finishJob(wiki.id, 'REGENERATE', [chat.id])
  assert.equal(regenerated.createdPages, 3)
  assert.equal(regenerated.updatedPages, 0)
  await assert.rejects(api.getPage(wiki.id, generated.createdPageIds[0]), errorIs(404, 'PAGE_NOT_FOUND'))
  assert.equal((await api.getPage(wiki.id, manual.id)).content, '보존할 문서')
})

test('generation validates ownership and mode, and reports FAILED if its source disappears', async () => {
  const wiki = await api.createWiki({ name: '생성 검증' })
  const path = `/wikis/${wiki.id}`
  for (const body of [{ mode: 'INVALID', chatIds: ['chat_001'] }, { mode: 'MERGE', chatIds: [] }]) {
    assert.equal((await send(`${path}/generations`, { method: 'POST', body })).status, 400)
  }
  await assert.rejects(api.generatePages(wiki.id, { mode: 'MERGE', chatIds: ['chat_001'] }), errorIs(404, 'CHAT_NOT_FOUND'))
  const chat = await api.uploadChat(wiki.id, new File(['대화'], 'chat.txt'))
  const accepted = await send(`${path}/generations`, { method: 'POST', body: { mode: 'MERGE', chatIds: [chat.id] } })
  assert.equal(accepted.status, 202)
  const job = await accepted.json()
  await assert.rejects(api.getGeneration(DEMO_WIKI_ID, job.jobId), errorIs(401, 'WIKI_PASSWORD_REQUIRED'))
  const other = await api.createWiki({ name: '다른 위키' })
  await assert.rejects(api.getGeneration(other.id, job.jobId), errorIs(404, 'JOB_NOT_FOUND'))
  db.jobs.find((item) => item.jobId === job.jobId).startedAt = Date.now() - 1500
  assert.equal((await api.getGeneration(wiki.id, job.jobId)).status, 'PROCESSING')
  db.jobs.find((item) => item.jobId === job.jobId).startedAt = Date.now() - 6001
  db.chats = db.chats.filter((item) => item.id !== chat.id)
  assert.equal((await api.getGeneration(wiki.id, job.jobId)).status, 'FAILED')
  assert.deepEqual((await api.getPages(wiki.id)).pages, [])
})

test('seeded data can be accessed after unlock and db reset restores fixtures', async () => {
  const unlocked = await send(`/wikis/${DEMO_WIKI_ID}/unlock`, { method: 'POST', body: { password: '1234' } })
  const cookie = unlocked.headers.get('set-cookie').split(';')[0]
  const pages = await send(`/wikis/${DEMO_WIKI_ID}/pages`, { cookie })
  assert.deepEqual((await pages.json()).pages.map((page) => page.id), ['page_001', 'page_002', 'page_003'])
  const deleted = await send(`/wikis/${DEMO_WIKI_ID}/pages/page_001`, { method: 'DELETE', cookie })
  assert.equal(deleted.status, 204)
  assert.equal(await deleted.text(), '')
  resetDb()
  assert.equal(db.pages.length, 3)
  assert.deepEqual(db.sessions, {})
})

function uploadRequest({ name = '새 대화 위키', password = '', wikiId = '', file = new File(['첫 메시지\n두 번째 메시지'], '대화.txt') } = {}) {
  const body = new FormData()
  body.set('title', name)
  body.set('password', password)
  body.set('wikiId', wikiId)
  body.set('chat', file)
  return { request: new Request('http://localhost/form', { method: 'POST', body }) }
}

test('upload form action redirects to the job after creating a wiki and uploading its file', async () => {
  const result = await uploadAction(uploadRequest())
  assert.equal(result.status, 302)
  const wiki = db.wikis.at(-1)
  assert.equal((await api.getWiki(wiki.id)).name, '새 대화 위키')
  const { chats } = await api.getChats(wiki.id)
  assert.equal(chats.length, 1)
  assert.equal(chats[0].fileName, '대화.txt')
  assert.equal(chats[0].messageCount, 2)
  assert.equal(result.headers.get('Location'), `/wiki/${wiki.id}/generations/${db.jobs[0].jobId}`)
})

test('upload validation avoids creating a wiki and a failed upload can retry without duplicate creation', async () => {
  const count = db.wikis.length
  for (const input of [{ name: ' ' }, { name: new File(['제목'], 'title.txt') }, { password: new File(['비밀번호'], 'password.txt') }, { file: new File(['본문'], 'chat.csv') }, { file: new File([], 'empty.txt') }]) {
    assert.ok((await uploadAction(uploadRequest(input))).error)
  }
  assert.equal(db.wikis.length, count)
  server.use(http.post('http://localhost/wikis/:wikiId/chats', () => HttpResponse.json({ message: '업로드 실패' }, { status: 500 })))
  const failed = await uploadAction(uploadRequest())
  assert.equal(failed.error, '업로드 실패')
  assert.ok(failed.wiki.id)
  assert.equal(db.wikis.length, count + 1)
  server.resetHandlers()
  const retried = await uploadAction(uploadRequest({ wikiId: failed.wiki.id }))
  assert.equal(retried.status, 302)
  assert.ok(retried.headers.get('Location').startsWith(`/wiki/${failed.wiki.id}/generations/`))
  assert.equal(db.wikis.length, count + 1)
  assert.equal((await api.getChats(failed.wiki.id)).chats.length, 1)
})

test('generation is time-based and page saves are idempotent after partial failures', async () => {
  const wiki = await api.createWiki({ name: '느린 변환' })
  const text = await readFile(new URL('../public/examples/kakao-chat.txt', import.meta.url), 'utf8')
  const chat = await api.uploadChat(wiki.id, new File([text], 'example.txt'))
  const job = await api.generatePages(wiki.id, { chatIds: [chat.id], mode: 'MERGE' })
  const params = { wikiId: wiki.id, jobId: job.jobId }
  assert.equal((await api.getGeneration(wiki.id, job.jobId)).status, 'PENDING')
  assert.equal((await api.getGeneration(wiki.id, job.jobId)).status, 'PENDING')
  assert.equal((await generationLoader({ params })).status, 'PENDING')
  assert.deepEqual((await api.getPages(wiki.id)).pages, [])
  db.jobs[0].startedAt = Date.now() - 6001
  let calls = 0
  server.use(http.post('http://localhost/wikis/:wikiId/pages', async ({ request }) => {
    calls += 1
    const body = await request.clone().json()
    if (body.generationIndex === 1) return HttpResponse.json({ message: '저장 실패' }, { status: 500 })
  }))
  await assert.rejects(generationLoader({ params }), /저장 실패/)
  assert.equal((await api.getPages(wiki.id)).pages.length, 1)
  server.resetHandlers()
  const done = await generationLoader({ params })
  assert.equal(done.status, 'COMPLETED')
  assert.equal(done.createdPages, 3)
  assert.equal(calls, 2)
  await generationLoader({ params })
  const { pages } = await api.getPages(wiki.id)
  assert.equal(pages.length, 3)
  assert.equal(pages[0].title, '부산 여행')
  assert.match((await api.getPage(wiki.id, pages[0].id)).content, /##개요\n친구들과 부산/)
  assert.doesNotMatch((await api.getPage(wiki.id, pages[0].id)).content, /\[민수\]/)
  const other = await api.createWiki({ name: '다른 위키' })
  await assert.rejects(api.createPage(other.id, { ...done.pages[0], generationJobId: job.jobId, generationIndex: 0 }), errorIs(400, 'INVALID_REQUEST'))
})

test('generation request failure preserves the uploaded chat for retry', async () => {
  server.use(http.post('http://localhost/wikis/:wikiId/generations', () => HttpResponse.json({ message: '요청 실패' }, { status: 500 })))
  const failed = await uploadAction(uploadRequest())
  assert.equal(failed.error, '요청 실패')
  assert.ok(failed.chat.id)
  server.resetHandlers()
  const input = uploadRequest({ wikiId: failed.wiki.id })
  const data = await input.request.formData()
  data.set('chatId', failed.chat.id)
  const result = await uploadAction({ request: new Request('http://localhost/form', { method: 'POST', body: data }) })
  assert.equal(result.status, 302)
  assert.equal((await api.getChats(failed.wiki.id)).chats.length, 1)
})

// IndexedDB의 read/write 경계를 모사하고 요청 처리·롤백·재로딩은 실제 MSW 핸들러로 검증합니다.
function storedDatabase() {
  let snapshot
  return {
    read: async () => structuredClone(snapshot),
    write: async (value) => { snapshot = structuredClone(value) },
  }
}

test('generated wiki, pages, chats and jobs can be fetched after memory is reset', async () => {
  const storage = storedDatabase()
  configureDbStorage(storage)
  try {
    const text = await readFile(new URL('../public/examples/kakao-chat.txt', import.meta.url), 'utf8')
    const response = await uploadAction(uploadRequest({ file: new File([text], 'example.txt') }))
    const wikiId = response.headers.get('Location').split('/')[2]
    const jobId = response.headers.get('Location').split('/').at(-1)
    resetDb() // 새 탭·새로고침처럼 메모리의 생성 데이터를 제거합니다.
    assert.equal((await api.getWiki(wikiId)).name, '새 대화 위키')
    assert.equal((await api.getChats(wikiId)).chats.length, 1)
    const saved = await storage.read()
    saved.jobs.find((job) => job.jobId === jobId).startedAt = Date.now() - 6001
    await storage.write(saved)
    const done = await generationLoader({ params: { wikiId, jobId } })
    resetDb()
    assert.equal((await api.getGeneration(wikiId, jobId)).status, 'COMPLETED')
    const { pages } = await api.getPages(wikiId)
    assert.equal(pages.length, 3)
    assert.equal((await api.getPage(wikiId, pages[0].id)).title, '부산 여행')
    assert.deepEqual(pages.map((page) => page.id), done.createdPageIds)
    await generationLoader({ params: { wikiId, jobId } })
    assert.equal((await api.getPages(wikiId)).pages.length, 3)
    await api.deletePage(wikiId, pages[0].id)
    resetDb()
    await assert.rejects(api.getPage(wikiId, pages[0].id), errorIs(404, 'PAGE_NOT_FOUND'))
  } finally {
    configureDbStorage(null)
  }
})

test('separate browser storage returns 404 while the original storage retains the wiki', async () => {
  const original = storedDatabase()
  configureDbStorage(original)
  try {
    const wiki = await api.createWiki({ name: '일반 창 위키', password: '1234' })
    resetDb()
    await assert.rejects(api.getWiki(wiki.id), errorIs(401, 'WIKI_PASSWORD_REQUIRED'))
    assert.equal((await original.read()).wikis.find((item) => item.id === wiki.id).name, '일반 창 위키')
    configureDbStorage(storedDatabase()) // 시크릿 창처럼 별도 저장소를 사용합니다.
    await assert.rejects(api.getWiki(wiki.id), errorIs(404, 'WIKI_NOT_FOUND'))
    await assert.rejects(api.getPages(wiki.id), errorIs(404, 'WIKI_NOT_FOUND'))
    configureDbStorage(original)
    await assert.rejects(api.getWiki(wiki.id), errorIs(401, 'WIKI_PASSWORD_REQUIRED'))
  } finally {
    configureDbStorage(null)
  }
})

test('persistent mock DB serializes writes, refreshes external changes and retains auth sessions', async () => {
  const storage = storedDatabase()
  configureDbStorage(storage)
  try {
    const wikis = await Promise.all([api.createWiki({ name: '첫째' }), api.createWiki({ name: '둘째' })])
    resetDb()
    for (const wiki of wikis) assert.equal((await api.getWiki(wiki.id)).name, wiki.name)
    const saved = await storage.read()
    saved.wikis.find((wiki) => wiki.id === wikis[0].id).name = '다른 탭에서 변경'
    await storage.write(saved)
    assert.equal((await api.getWiki(wikis[0].id)).name, '다른 탭에서 변경')
    const unlocked = await send(`/wikis/${DEMO_WIKI_ID}/unlock`, { method: 'POST', body: { password: '1234' } })
    const cookie = unlocked.headers.get('set-cookie').split(';')[0]
    resetDb()
    assert.equal((await send(`/wikis/${DEMO_WIKI_ID}`, { cookie })).status, 200)
    assert.equal((await send(`/wikis/${DEMO_WIKI_ID}`)).status, 401)
  } finally {
    configureDbStorage(null)
  }
})

test('storage failures do not report success or overwrite previously saved data', async () => {
  const storage = storedDatabase()
  configureDbStorage(storage)
  try {
    const wiki = await api.createWiki({ name: '보존' })
    const before = await storage.read()
    configureDbStorage({ ...storage, write: async () => { throw new Error('quota') } })
    await assert.rejects(api.updateWiki(wiki.id, { name: '저장 실패' }), errorIs(500, 'INTERNAL_SERVER_ERROR'))
    assert.deepEqual(await storage.read(), before)
    assert.equal(db.wikis.find((item) => item.id === wiki.id).name, '보존')
    configureDbStorage(storage)
    resetDb()
    assert.equal((await api.getWiki(wiki.id)).name, '보존')
    const invalid = { ...before, pages: null }
    configureDbStorage({ ...storage, read: async () => invalid })
    await assert.rejects(api.getWiki(wiki.id), errorIs(500, 'INTERNAL_SERVER_ERROR'))
    assert.deepEqual(await storage.read(), before)
  } finally {
    configureDbStorage(null)
  }
})
