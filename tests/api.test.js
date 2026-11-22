import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import * as api from '../src/api/wikis.js'
import { generationLoader, pageEditAction, pageEditLoader, uploadAction, wikiListLoader } from '../src/api/routeHandlers.js'

const originalFetch = globalThis.fetch
const calls = []
function respond(data, status = 200) {
  calls.length = 0
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options })
    return status === 204 ? new Response(null, { status }) : Response.json(data, { status })
  }
}
afterEach(() => { globalThis.fetch = originalFetch })

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
    assert.equal(calls[0].credentials, 'include')
    assert.equal(calls[0].body, body === undefined ? undefined : JSON.stringify(body))
  }
})

test('upload sends the original file as multipart without a manual content type', async () => {
  respond({ id: 'chat' }, 201)
  const file = new File(['Synthetic test'], 'test.txt', { type: 'text/plain' })
  await api.uploadChat(wiki.id, file)
  assert.equal(calls[0].url, `${api.API_BASE_URL}/wikis/team%2F42/chats`)
  assert.equal(calls[0].body.get('file'), file)
  assert.deepEqual(calls[0].headers, {})
})

test('API errors preserve status and code, including non-JSON proxy errors', async () => {
  respond({ code: 'CONFLICT', message: '충돌' }, 409)
  await assert.rejects(api.updatePage(wiki.id, page.id, {}), { message: '충돌', status: 409, code: 'CONFLICT' })
  globalThis.fetch = async () => new Response('<html>Bad Gateway</html>', { status: 502 })
  await assert.rejects(api.getWiki(wiki.id), { status: 502, message: 'API 요청에 실패했습니다. (502)' })
  globalThis.fetch = async () => new Response('invalid')
  await assert.rejects(api.getWiki(wiki.id), /올바른 JSON/)
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(api.getWiki(wiki.id), /Failed to fetch/)
})

test('wiki list loads remembered IDs, skips locked or deleted wikis and reports server errors', async () => {
  const originalWindow = globalThis.window
  try {
    const values = new Map([['conversation-wiki:recent-wikis:v1', JSON.stringify(['open', 'locked', 'deleted'])]])
    globalThis.window = { localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } }
    const paths = []
    globalThis.fetch = async (url) => {
      paths.push(url)
      return url.endsWith('/locked') ? Response.json({}, { status: 401 }) : url.endsWith('/deleted') ? Response.json({}, { status: 404 }) : Response.json({ ...wiki, id: 'open' })
    }
    assert.deepEqual(await wikiListLoader(), { wikis: [{ ...wiki, id: 'open' }] })
    assert.ok(paths.every((path) => path.startsWith(`${api.API_BASE_URL}/wikis/`)))
    globalThis.fetch = async () => Response.json({ message: '서버 오류' }, { status: 500 })
    await assert.rejects(wikiListLoader(), /서버 오류/)
    values.clear()
    assert.deepEqual(await wikiListLoader(), { wikis: [] })
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  }
})

test('generation polling only reads server-owned work and rejects invalid statuses', async () => {
  for (const status of ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']) {
    const job = { status, createdPages: 2, updatedPages: 0, pages: [page] }
    respond(job)
    assert.deepEqual(await generationLoader({ params: { wikiId: wiki.id, jobId: 'job' } }), job)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].method, 'GET')
  }
  respond({ status: 'UNKNOWN' })
  await assert.rejects(generationLoader({ params: { wikiId: wiki.id, jobId: 'job' } }), /상태/)
})

function editRequest(content, version = 3) {
  return new Request('http://localhost/edit?section=section-1', { method: 'POST', body: new URLSearchParams({ content, version }) })
}

test('section editing preserves other sections and uses the loaded version', async () => {
  const params = { wikiId: wiki.id, pagesId: page.id }
  const writes = []
  globalThis.fetch = async (url, options) => {
    if (options.method === 'PATCH') writes.push(JSON.parse(options.body))
    return Response.json(url.endsWith('/pages/page%2F1') ? page : wiki)
  }
  const loaded = await pageEditLoader({ params, request: editRequest('') })
  assert.equal(loaded.editContent, '## 개요\r\n원본\r\n')
  const response = await pageEditAction({ params, request: editRequest('## 새 제목\n수정') })
  assert.equal(response.status, 302)
  assert.deepEqual(writes, [{ content: '소개\r\n## 새 제목\n수정\n## 일정\r\n유지\r\n', version: 3 }])
  assert.match((await pageEditAction({ params, request: editRequest('## 변경\n내용', 2) })).error, /다른 사용자/)
  assert.equal(writes.length, 1)
  globalThis.fetch = async () => Response.json({ message: '저장 실패' }, { status: 500 })
  assert.equal((await pageEditAction({ params, request: editRequest('## 변경\n내용') })).error, '저장 실패')
})

test('upload action authenticates before upload and generation; invalid files send nothing', async () => {
  const form = new FormData()
  form.set('title', '테스트')
  form.set('password', 'test-password')
  form.set('chat', new File(['Synthetic integration test'], 'test.txt'))
  const methods = []
  globalThis.fetch = async (url, options) => {
    methods.push(`${options.method} ${url}`)
    if (url.endsWith('/unlock')) return new Response(null, { status: 204 })
    return Response.json(url.endsWith('/generations') ? { jobId: 'job' } : url.endsWith('/chats') ? { id: 'chat' } : { id: 'created' })
  }
  const submit = () => uploadAction({ request: new Request('http://localhost/', { method: 'POST', body: form }) })
  assert.equal((await submit()).headers.get('Location'), '/wiki/created/generations/job')
  assert.deepEqual(methods.map(value => value.replace(api.API_BASE_URL, '')), ['POST /wikis', 'POST /wikis/created/unlock', 'POST /wikis/created/chats', 'POST /wikis/created/generations'])
  form.set('chat', new File(['bad'], 'test.exe'))
  methods.length = 0
  assert.ok((await submit()).error)
  assert.deepEqual(methods, [])
})
