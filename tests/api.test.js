import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { uploadAction } from '../src/api/routeHandlers.js'
import * as api from '../src/api/wikis.js'
import { handlers } from '../src/mocks/handlers.js'
import { db, DEMO_WIKI_ID, resetDb } from '../src/mocks/db.js'

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
  assert.equal((await api.getGeneration(wikiId, job.jobId)).status, 'PROCESSING')
  const done = await api.getGeneration(wikiId, job.jobId)
  assert.equal(done.status, 'COMPLETED')
  assert.deepEqual(await api.getGeneration(wikiId, job.jobId), done)
  return done
}

test('generation simulates polling, merge and regeneration while preserving manual pages', async () => {
  const wiki = await api.createWiki({ name: '생성 테스트' })
  const manual = await api.createPage(wiki.id, { title: '직접 작성', category: 'PERSON', content: '보존할 문서' })
  const chat = await api.uploadChat(wiki.id, new File(['대화'], 'chat.txt'))
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
  assert.equal((await api.getGeneration(wiki.id, job.jobId)).status, 'PROCESSING')
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

function uploadRequest({ name = '새 대화 위키', wikiId = '', file = new File(['첫 메시지\n두 번째 메시지'], '대화.txt') } = {}) {
  const body = new FormData()
  body.set('title', name)
  body.set('wikiId', wikiId)
  body.set('chat', file)
  return { request: new Request('http://localhost/form', { method: 'POST', body }) }
}

test('upload form action creates a wiki and uploads the original file to that wiki', async () => {
  const result = await uploadAction(uploadRequest())
  assert.equal(result.error, undefined)
  assert.equal((await api.getWiki(result.wiki.id)).name, '새 대화 위키')
  const { chats } = await api.getChats(result.wiki.id)
  assert.equal(chats.length, 1)
  assert.equal(chats[0].id, result.chat.id)
  assert.equal(chats[0].fileName, '대화.txt')
  assert.equal(chats[0].messageCount, 2)
})

test('upload validation avoids creating a wiki and a failed upload can retry without duplicate creation', async () => {
  const count = db.wikis.length
  for (const input of [{ name: ' ' }, { name: new File(['제목'], 'title.txt') }, { file: new File(['본문'], 'chat.csv') }, { file: new File([], 'empty.txt') }]) {
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
  assert.equal(retried.error, undefined)
  assert.equal(retried.wiki.id, failed.wiki.id)
  assert.equal(db.wikis.length, count + 1)
  assert.equal((await api.getChats(failed.wiki.id)).chats.length, 1)
})
