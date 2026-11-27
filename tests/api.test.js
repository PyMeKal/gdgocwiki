import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { build, createServer } from 'vite'
import axios from 'axios'
import { mockAxios } from './helpers/mockAxios.js'
import * as api from '../src/api/wikis.js'
import { pageEditAction, uploadAction } from '../src/api/routeHandlers.js'

import { createQueryClient, editPageQuery, generationQuery } from '../src/api/queries.js'

const client = createQueryClient()
const originalAdapter = axios.defaults.adapter
const calls = []
function respond(data, status = 200) {
  calls.length = 0
  mockAxios(async (url, options) => {
    calls.push({ url, ...options })
    return status === 204 ? new Response(null, { status }) : Response.json(data, { status })
  })
}
afterEach(() => { axios.defaults.adapter = originalAdapter; client.clear() })

const wiki = { id: 'team/42', name: '테스트 위키', hasPassword: false }
const page = { id: 'page/1', title: '문서', category: 'EVENT', content: '소개\r\n## 개요\r\n원본\r\n## 일정\r\n유지\r\n', version: 3 }

test('all API functions use the configured base, encoded IDs and credentialed requests', async () => {
  const w = '/wikis/team%2F42'
  const p = `${w}/pages/page%2F1`
  const cases = [
    [() => api.createWiki({ name: wiki.name }), 'POST', '/wikis', wiki, { name: wiki.name }],
    [() => api.getWiki(wiki.id), 'GET', w, wiki],
    [() => api.updateWiki(wiki.id, { name: '수정' }), 'PATCH', w, wiki, { name: '수정' }],
    [() => api.unlockWiki(wiki.id, 'test'), 'POST', `${w}/unlock`, undefined, { password: 'test' }],
    [() => api.getChats(wiki.id), 'GET', `${w}/chats`, { chats: [] }],
    [() => api.generatePages(wiki.id, { chatIds: ['chat'], mode: 'MERGE' }), 'POST', `${w}/generations`, { jobId: 'job' }, { chatIds: ['chat'], mode: 'MERGE' }],
    [() => api.getGeneration(wiki.id, 'job/1'), 'GET', `${w}/generations/job%2F1`, { status: 'PENDING' }],
    [() => api.getPages(wiki.id), 'GET', `${w}/pages`, { pages: [] }],
    [() => api.createPage(wiki.id, page), 'POST', `${w}/pages`, page, page],
    [() => api.getPage(wiki.id, page.id), 'GET', p, page],
    [() => api.updatePage(wiki.id, page.id, { content: '', version: 3 }), 'PATCH', p, page, { content: '', version: 3 }],
    [() => api.deletePage(wiki.id, page.id), 'DELETE', p, undefined],
  ]
  for (const [invoke, method, path, result, body] of cases) {
    respond(result, result === undefined ? 204 : 200)
    assert.deepEqual(await invoke(), result)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, `${api.API_BASE_URL}${path}`)
    assert.equal(calls[0].method, method)
    assert.equal(calls[0].withCredentials, true)
    assert.equal(calls[0].withXSRFToken, false)
    assert.equal(calls[0].data, body === undefined ? undefined : JSON.stringify(body))
  }
})

test('upload sends the original file as multipart without a manual content type', async () => {
  respond({ id: 'chat' }, 201)
  const file = new File(['Synthetic test'], 'test.txt', { type: 'text/plain' })
  await api.uploadChat(wiki.id, file)
  assert.equal(calls[0].url, `${api.API_BASE_URL}/wikis/team%2F42/chats`)
  assert.equal(calls[0].data.get('file'), file)
  assert.equal(calls[0].headers.toJSON()['Content-Type'], undefined)
})

test('API errors preserve status and code, including non-JSON proxy errors', async () => {
  respond({ code: 'CONFLICT', message: '충돌' }, 409)
  await assert.rejects(api.updatePage(wiki.id, page.id, {}), { message: '충돌', status: 409, code: 'CONFLICT' })
  mockAxios(async () => new Response('<html>Bad Gateway</html>', { status: 502 }))
  await assert.rejects(api.getWiki(wiki.id), { status: 502, message: 'API 요청에 실패했습니다. (502)' })
  for (const body of ['invalid', '', 'null']) {
    mockAxios(async () => new Response(body))
    await assert.rejects(api.getWiki(wiki.id), /올바른 JSON/)
  }
  mockAxios(async () => { throw new TypeError('Network failure') })
  await assert.rejects(api.getWiki(wiki.id), /Network failure/)
})

test('valid JSON response values are preserved regardless of content type', async () => {
  for (const value of ['text', false, 0, [], { chats: [] }]) {
    mockAxios(async () => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'text/plain' } }))
    assert.deepEqual(await api.getChats(wiki.id), value)
  }
})

test('development requests log each outcome once without exposing payloads or server messages', async (t) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'gdgocwiki-api-vite-'))
  const server = await createServer({ cacheDir, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  t.after(async () => { await server.close(); await rm(cacheDir, { recursive: true, force: true }) })
  const api = await server.ssrLoadModule('/src/api/wikis.js')
  const info = t.mock.method(console, 'info', () => {})
  const error = t.mock.method(console, 'error', () => {})
  respond({ chats: [] })
  await api.getChats('test')
  respond(undefined, 204)
  await api.unlockWiki('test', 'secret-password')
  respond({ message: 'private server message', code: 'LOCKED' }, 401)
  await assert.rejects(api.unlockWiki('test', 'secret-password'), { status: 401, code: 'LOCKED' })
  mockAxios(async () => new Response('invalid'))
  await assert.rejects(api.getChats('test'), /올바른 JSON/)
  const networkError = new Error('private network details')
  mockAxios(async () => { throw networkError })
  await assert.rejects(api.getChats('test'), (value) => value === networkError)
  assert.deepEqual(info.mock.calls.map(({ arguments: args }) => args), [
    ['[API 성공] GET /wikis/test/chats (200)'],
    ['[API 성공] POST /wikis/test/unlock (204)'],
  ])
  assert.deepEqual(error.mock.calls.map(({ arguments: args }) => args), [
    ['[API 실패] POST /wikis/test/unlock (401)'],
    ['[API 실패] GET /wikis/test/chats (200)'],
    ['[API 실패] GET /wikis/test/chats (응답 없음)'],
  ])
})

test('production logging is silent for successful and failed API requests', async (t) => {
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  t.after(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
  })
  const [bundle] = await build({
    configFile: false,
    logLevel: 'silent',
    build: { write: false, minify: false, lib: { entry: 'src/api/logApiResult.js', formats: ['es'] } },
  })
  const code = bundle.output.find((entry) => entry.type === 'chunk').code
  const { logApiResult } = await import(`data:text/javascript,${encodeURIComponent(code)}`)
  const info = t.mock.method(console, 'info', () => {})
  const error = t.mock.method(console, 'error', () => {})
  logApiResult({ method: 'GET', path: '/wikis/test', status: 200, success: true })
  logApiResult({ method: 'GET', path: '/wikis/test', status: 500, success: false })
  assert.equal(info.mock.callCount(), 0)
  assert.equal(error.mock.callCount(), 0)
  assert.doesNotMatch(code, /\[API|console\.(info|error)/)
})

test('generation polling only reads server-owned work and rejects invalid statuses', async () => {
  for (const status of ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']) {
    const job = { status, createdPages: 2, updatedPages: 0, pages: [page] }
    respond(job)
    assert.deepEqual(await client.fetchQuery({ ...generationQuery(wiki.id, 'job', client), staleTime: 0 }), job)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].method, 'GET')
  }
  respond({ status: 'UNKNOWN' })
  await assert.rejects(client.fetchQuery({ ...generationQuery(wiki.id, 'job', client), staleTime: 0 }), /상태/)
})

function editRequest(content, version = 3) {
  return new Request('http://localhost/edit?section=section-1', { method: 'POST', body: new URLSearchParams({ content, version }) })
}

test('section editing preserves other sections and uses the loaded version', async () => {
  const params = { wikiId: wiki.id, pagesId: page.id }
  const writes = []
  mockAxios(async (url, options) => {
    if (options.method === 'PATCH') writes.push(JSON.parse(options.data))
    return Response.json(url.endsWith('/pages/page%2F1') ? page : wiki)
  })
  const loaded = await client.fetchQuery(editPageQuery(wiki.id, page.id, 'section-1'))
  assert.equal(loaded.editContent, '## 개요\r\n원본\r\n')
  const response = await pageEditAction({ params, request: editRequest('## 새 제목\n수정') }, client)
  assert.equal(response.status, 302)
  assert.deepEqual(writes, [{ content: '소개\r\n## 새 제목\n수정\n## 일정\r\n유지\r\n', version: 3 }])
  assert.match((await pageEditAction({ params, request: editRequest('## 변경\n내용', 2) }, client)).error, /다른 사용자/)
  assert.equal(writes.length, 1)
  mockAxios(async () => Response.json({ message: '저장 실패' }, { status: 500 }))
  assert.equal((await pageEditAction({ params, request: editRequest('## 변경\n내용') }, client)).error, '저장 실패')
})

test('triple-equals section edits preserve neighboring sections and reject multiple headings', async () => {
  const original = { ...page, content: '소개\r\n===개요===\r\n원본\r\n===일정===\r\n유지\r\n' }
  const writes = []
  mockAxios(async (url, options) => {
    if (options.method === 'PATCH') writes.push(JSON.parse(options.data))
    return Response.json(url.endsWith('/pages/page%2F1') ? original : wiki)
  })
  const params = { wikiId: wiki.id, pagesId: page.id }
  assert.equal((await client.fetchQuery(editPageQuery(wiki.id, page.id, 'section-1'))).editContent, '===개요===\r\n원본\r\n')
  const response = await pageEditAction({ params, request: editRequest('===새 제목===\n수정') }, client)
  assert.equal(response.status, 302)
  assert.deepEqual(writes, [{ content: '소개\r\n===새 제목===\n수정\n===일정===\r\n유지\r\n', version: 3 }])
  const invalid = await pageEditAction({ params, request: editRequest('===하나===\n===둘===\n본문') }, client)
  assert.match(invalid.error, /제목 하나/)
  assert.equal(writes.length, 1)
})

test('upload action authenticates before upload and generation; invalid files send nothing', async () => {
  const form = new FormData()
  form.set('title', '테스트')
  form.set('password', 'test-password')
  form.set('chat', new File(['Synthetic integration test'], 'test.txt'))
  const methods = []
  mockAxios(async (url, options) => {
    methods.push(`${options.method} ${url}`)
    if (url.endsWith('/unlock')) return new Response(null, { status: 204 })
    return Response.json(url.endsWith('/generations') ? { jobId: 'job' } : url.endsWith('/chats') ? { id: 'chat' } : { id: 'created' })
  })
  const submit = () => uploadAction({ request: new Request('http://localhost/', { method: 'POST', body: form }) }, client)
  assert.equal((await submit()).headers.get('Location'), '/wiki/created/generations/job')
  assert.deepEqual(client.getQueryData(['wiki', 'created', 'generations', 'job', 'upload']), { fileName: 'test.txt' })
  assert.deepEqual(methods.map(value => value.replace(api.API_BASE_URL, '')), ['POST /wikis', 'POST /wikis/created/unlock', 'POST /wikis/created/chats', 'POST /wikis/created/generations'])
  form.set('chat', new File(['bad'], 'test.exe'))
  methods.length = 0
  assert.ok((await submit()).error)
  assert.deepEqual(methods, [])
})
