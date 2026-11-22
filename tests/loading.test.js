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
    assert.doesNotMatch(initial, /불러오는 중입니다/)

    await client.fetchQuery(wikiQuery(wiki.id))
    const partial = render()
    assert.match(partial, /<h1[^>]*>테스트 위키<\/h1>/)
    assert.match(partial, /문서 목록 로딩 중/)
    await client.fetchQuery(pagesQuery(wiki.id, client))
    assert.doesNotMatch(render(), /react-loading-skeleton/)

    await router.navigate('/wiki/test/pages/article')
    const pending = render()
    assert.match(pending, /Last edited:/)
    assert.match(pending, />Search<\/button>/)
    assert.match(pending, /전체 문서 편집/)
    assert.doesNotMatch(pending, /hidden=""/)
    await client.fetchQuery(pageQuery(wiki.id, page.id))
    assert.match(render(), /문서 내용/)
    assert.doesNotMatch(render(), /react-loading-skeleton/)

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
  } finally {
    release?.()
    router?.dispose()
    client.clear()
    axios.defaults.adapter = originalAdapter
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
  }
})
