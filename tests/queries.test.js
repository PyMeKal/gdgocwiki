import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import axios from 'axios'
import { QueryObserver } from '@tanstack/react-query'
import { createQueryClient, wikiQuery, pagesQuery, pageQuery, editPageQuery, generationQuery } from '../src/api/queries.js'
import { pageEditAction, unlockAction } from '../src/api/routeHandlers.js'
import { mockAxios } from './helpers/mockAxios.js'

const originalAdapter = axios.defaults.adapter
const client = createQueryClient()
const wiki = { id: 'team', name: '테스트 위키' }
const page = { id: 'article', title: '테스트 문서', content: '## 개요\n원본', version: 1, updatedAt: '2026-11-20T00:00:00Z' }
afterEach(() => { client.clear(); axios.defaults.adapter = originalAdapter })

test('repeated and concurrent reads reuse cache; dated lists populate the detail cache', async () => {
  const calls = []
  mockAxios(async (url) => {
    calls.push(url)
    if (url.endsWith('/pages/article')) return Response.json(page)
    if (url.endsWith('/pages')) return Response.json({ pages: [{ id: page.id, title: page.title }] })
    return Response.json(wiki)
  })
  await Promise.all([client.fetchQuery(wikiQuery(wiki.id)), client.fetchQuery(wikiQuery(wiki.id))])
  await client.fetchQuery(wikiQuery(wiki.id))
  assert.equal(calls.length, 1)
  const pages = await client.fetchQuery(pagesQuery(wiki.id, client))
  assert.equal(pages[0].updatedAt, page.updatedAt)
  assert.deepEqual((await client.fetchQuery(pageQuery(wiki.id, page.id))).page, page)
  assert.equal(calls.length, 3)
})

test('editing uses a fresh snapshot; successful saves invalidate related caches and failed saves preserve them', async () => {
  let current = { ...page }
  let failSave = false
  mockAxios(async (url, options) => {
    if (options.method === 'PATCH') {
      if (failSave) return Response.json({ message: '저장 실패' }, { status: 500 })
      current = { ...current, content: JSON.parse(options.data).content, version: current.version + 1 }
    }
    return Response.json(current)
  })
  await client.fetchQuery(pageQuery(wiki.id, page.id))
  client.setQueryData(pagesQuery(wiki.id, client).queryKey, [page])
  current = { ...current, version: 2 }
  const snapshot = await client.fetchQuery(editPageQuery(wiki.id, page.id, 'section-1'))
  assert.equal(snapshot.page.version, 2)
  const request = (version) => new Request('http://localhost/edit', { method: 'POST', body: new URLSearchParams({ content: '## 개요\n변경', version }) })
  const params = { wikiId: wiki.id, pagesId: page.id }
  const response = await pageEditAction({ params, request: request(2) }, client)
  assert.equal(response.status, 302)
  assert.equal(client.getQueryState(pagesQuery(wiki.id, client).queryKey).isInvalidated, true)
  const updated = await client.fetchQuery(pageQuery(wiki.id, page.id))
  assert.equal(updated.page.content, '## 개요\n변경')
  assert.equal(updated.page.version, 3)
  failSave = true
  const result = await pageEditAction({ params, request: request(3) }, client)
  assert.equal(result.error, '저장 실패')
  assert.deepEqual(client.getQueryData(pageQuery(wiki.id, page.id).queryKey), updated)
  assert.equal(client.getQueryState(pageQuery(wiki.id, page.id).queryKey).isInvalidated, false)
})

test('unlock refreshes an actively observed failed query without retrying authentication errors automatically', async () => {
  let unlocked = false
  let reads = 0
  mockAxios(async (url) => {
    if (url.endsWith('/unlock')) { unlocked = true; return new Response(null, { status: 204 }) }
    reads++
    return unlocked ? Response.json(wiki) : Response.json({ message: '인증 필요' }, { status: 401 })
  })
  await assert.rejects(client.fetchQuery(wikiQuery(wiki.id)), { status: 401 })
  assert.equal(reads, 1)
  const observer = new QueryObserver(client, wikiQuery(wiki.id))
  const unsubscribe = observer.subscribe(() => {})
  try {
    const result = await unlockAction({ params: { wikiId: wiki.id }, request: new Request('http://localhost/unlock', { method: 'POST', body: new URLSearchParams({ password: 'test' }) }) }, client)
    assert.equal(result, null)
    assert.equal(observer.getCurrentResult().error, null)
    assert.deepEqual(observer.getCurrentResult().data, wiki)
    assert.equal(reads, 2)
  } finally { unsubscribe() }
})

test('generation polling stops on terminal states and invalidates documents on completion', async () => {
  const options = generationQuery(wiki.id, 'job', client)
  client.setQueryData(pagesQuery(wiki.id, client).queryKey, [page])
  for (const status of ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']) {
    mockAxios(async () => Response.json({ status, createdPages: 1, updatedPages: 0 }))
    const job = await client.fetchQuery({ ...options, staleTime: 0 })
    const interval = options.refetchInterval({ state: { data: job, error: null } })
    assert.equal(interval !== false, status === 'PENDING' || status === 'PROCESSING')
    if (status === 'COMPLETED') assert.equal(client.getQueryState(pagesQuery(wiki.id, client).queryKey).isInvalidated, true)
  }
  assert.equal(options.refetchInterval({ state: { data: { status: 'PENDING' }, error: new Error('offline') } }), false)
})
