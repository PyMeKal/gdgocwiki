import assert from 'node:assert/strict'
import test from 'node:test'
import axios from 'axios'
import { QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createServer } from 'vite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mockAxios } from './helpers/mockAxios.js'
import { createQueryClient, wikiQuery, pagesQuery, pageQuery } from '../src/api/queries.js'

test('query data renders independently; navigation has no loaders and refetch keeps content', async () => {
  // 개발 서버와 병렬 테스트의 React 번들 캐시가 섞이지 않게 합니다.
  const cacheDir = await mkdtemp(join(tmpdir(), 'gdgocwiki-vite-'))
  const server = await createServer({ cacheDir, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  const originalAdapter = axios.defaults.adapter
  const originalWindow = globalThis.window
  const client = createQueryClient()
  let router
  let release
  let gate = Promise.resolve()
  const wiki = { id: 'test', name: '테스트 위키' }
  const page = { id: 'article', title: '테스트 본문', content: '## 개요\n문서 내용', updatedAt: '2026-11-20T00:00:00Z' }
  mockAxios(async (url) => {
    await gate
    if (url.endsWith('/pages/article')) return Response.json(page)
    if (url.endsWith('/pages')) return Response.json({ pages: [page] })
    return Response.json(wiki)
  })
  try {
    const { createRoutes } = await server.ssrLoadModule('/src/routes.jsx')
    const routes = createRoutes(client)
    assert.ok(routes[0].children.every((route) => !route.loader))
    router = createMemoryRouter(routes, { initialEntries: ['/wiki/test'] })
    assert.equal(router.state.initialized, true)
    const render = () => renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(RouterProvider, { router })))
    const initial = render()
    assert.match(initial, /react-loading-skeleton/)
    assert.match(initial, /Search this wiki/)
    assert.match(initial, /Your conversation, organized/)
    assert.match(initial, /Last modified/)
    assert.equal((initial.match(/class="category-placeholder"/g) || []).length, 3)
    assert.match(initial, /class="wiki-home-results" aria-labelledby="pages-title" aria-busy="true"/)
    assert.doesNotMatch(initial, /불러오는 중입니다/)

    await client.fetchQuery(wikiQuery(wiki.id))
    const partial = render()
    assert.match(partial, /<h1[^>]*>테스트 위키<\/h1>/)
    assert.match(partial, /문서 목록 로딩 중/)
    await client.fetchQuery(pagesQuery(wiki.id, client))
    assert.doesNotMatch(render(), /react-loading-skeleton/)
    assert.doesNotMatch(render(), /category-placeholder/)

    await router.navigate('/wiki/test/pages/article')
    const pending = render()
    assert.match(pending, /Last edited:/)
    assert.match(pending, />Search<\/button>/)
    assert.match(pending, /전체 문서 편집/)
    assert.doesNotMatch(pending, /hidden=""/)
    assert.match(pending, /class="toc" aria-label="문서 목차" aria-busy="true"/)
    assert.match(pending, /disabled="" aria-expanded="true" aria-controls="wiki-contents"/)
    assert.match(pending, /aria-label="주요 정보 로딩 중" aria-busy="true"/)
    assert.ok(pending.indexOf('class="toc"') < pending.indexOf('class="wiki-infobox'))
    assert.ok(pending.indexOf('class="wiki-infobox') < pending.indexOf('class="wiki-sections"'))
    const infoboxPlaceholder = pending.match(/<aside class="wiki-infobox[\s\S]*?<\/aside>/)?.[0] ?? ''
    assert.equal((infoboxPlaceholder.match(/<tr>/g) || []).length, 4)
    const { default: WikiDocument } = await server.ssrLoadModule('/src/components/wiki/WikiDocument.jsx')
    const loadingDocument = renderToStaticMarkup(createElement(WikiDocument, { loading: true, updatedAt: page.updatedAt }))
    assert.equal((loadingDocument.match(/Last edited:/g) || []).length, 1)
    await client.fetchQuery(pageQuery(wiki.id, page.id))
    assert.match(render(), /문서 내용/)
    assert.doesNotMatch(render(), /react-loading-skeleton/)
    assert.doesNotMatch(render(), /wiki-infobox|주요 정보 로딩 중/)
    assert.match(render(), /aria-controls="section-1">1\. 개요/)

    gate = new Promise((resolve) => { release = resolve })
    const refetching = client.fetchQuery({ ...pageQuery(wiki.id, page.id), staleTime: 0 })
    assert.match(render(), /문서 내용/)
    assert.doesNotMatch(render(), /react-loading-skeleton/)
    release()
    await refetching

    for (const [path, fixedText] of [
      ['/', 'Add your conversation'],
      ['/wikis', 'Your conversations, connected'],
      ['/wiki/test/pages/article/edit', '전체 문서 편집'],
      ['/wiki/test/generations/job', '위키 제작'],
    ]) {
      await router.navigate(path)
      const html = render()
      assert.ok(html.includes(fixedText), path)
      if (path === '/') {
        assert.match(html, /Good chats\./)
        assert.doesNotMatch(html.match(/<form[\s\S]*?<\/form>/)?.[0] ?? '', /react-loading-skeleton/)
      }
    }

    const ids = ['first', 'second', 'last', 'locked', 'deleted']
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(ids), setItem: () => {} } }
    await router.navigate('/wikis')
    const slots = (html) => [...html.matchAll(/data-wiki-id="([^"]+)"/g)].map((match) => match[1])
    assert.deepEqual(slots(render()), ids)
    client.setQueryData(wikiQuery('last').queryKey, { id: 'last', name: '먼저 도착한 위키' })
    const partiallyLoaded = render()
    assert.match(partiallyLoaded, /먼저 도착한 위키/)
    assert.match(partiallyLoaded, /href="\/wiki\/last"/)
    assert.match(partiallyLoaded, /react-loading-skeleton/)
    assert.deepEqual(slots(partiallyLoaded), ids)
    for (const id of ids.slice(0, 2)) client.setQueryData(wikiQuery(id).queryKey, { id, name: id })
    mockAxios(async (url) => Response.json({ message: '접근 불가' }, { status: url.endsWith('/locked') ? 401 : 404 }))
    await assert.rejects(client.fetchQuery(wikiQuery('locked')), { status: 401 })
    assert.deepEqual(slots(render()), ids)
    await assert.rejects(client.fetchQuery(wikiQuery('deleted')), { status: 404 })
    const loadedList = render()
    assert.deepEqual(slots(loadedList), ids.slice(0, 3))
    assert.doesNotMatch(loadedList, /react-loading-skeleton/)
    assert.match(loadedList, /class="wiki-list-results" aria-label="위키 목록" aria-busy="false"/)
  } finally {
    release?.()
    router?.dispose()
    client.clear()
    axios.defaults.adapter = originalAdapter
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
  }
})
