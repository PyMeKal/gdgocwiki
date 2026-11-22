import assert from 'node:assert/strict'
import test from 'node:test'
import axios from 'axios'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createServer } from 'vite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mockAxios } from './helpers/mockAxios.js'

test('initial loads and navigation show skeletons; revalidation keeps the loaded content', async () => {
  // 개발 서버와 병렬 테스트의 React 번들 캐시가 섞이지 않게 합니다.
  const cacheDir = await mkdtemp(join(tmpdir(), 'gdgocwiki-vite-'))
  const server = await createServer({ cacheDir, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  const originalAdapter = axios.defaults.adapter
  let router
  let release
  let gate = new Promise((resolve) => { release = resolve })
  const wiki = { id: 'test', name: '테스트 위키' }
  const page = { id: 'article', title: '테스트 본문', content: '## 개요\n문서 내용', updatedAt: '2026-11-20T00:00:00Z' }
  mockAxios(async (url) => {
    await gate
    if (url.endsWith('/pages/article')) return Response.json(page)
    if (url.endsWith('/pages')) return Response.json({ pages: [page] })
    return Response.json(wiki)
  })
  try {
    const { routes } = await server.ssrLoadModule('/src/routes.jsx')
    router = createMemoryRouter(routes, { initialEntries: ['/wiki/test'] })
    const render = () => renderToStaticMarkup(createElement(RouterProvider, { router }))
    const initial = render()
    assert.match(initial, /react-loading-skeleton/)
    assert.match(initial, /aria-busy="true"/)
    assert.match(initial, /wiki-home-page/)
    assert.doesNotMatch(initial, /불러오는 중입니다/)
    assert.match(initial, /My wikis/)
    assert.match(initial, /함께 나눈 대화와 지식을 한곳에 모아보세요/)
    assert.match(initial, /Search this wiki/)
    assert.match(initial, /Your conversation, organized/)
    assert.match(initial, /Last modified/)
    assert.doesNotMatch(initial, /<h2[^>]*><span[^>]*aria-live/)

    const initialized = new Promise((resolve) => {
      const unsubscribe = router.subscribe((state) => {
        if (state.initialized) { unsubscribe(); resolve() }
      })
    })
    release()
    await initialized
    assert.match(render(), /테스트 위키/)
    assert.doesNotMatch(render(), /react-loading-skeleton/)

    gate = new Promise((resolve) => { release = resolve })
    const navigating = router.navigate('/wiki/test/pages/article')
    const pending = render()
    assert.match(pending, /container wiki-layout article-page/)
    assert.match(pending, /href="#loading-main"/)
    assert.match(pending, /Last edited:/)
    assert.match(pending, />Search<\/button>/)
    assert.match(pending, /전체 문서 편집/)
    assert.match(pending, /맨 위로 ↑/)

    assert.match(pending, /<div hidden="">/)
    assert.equal((pending.match(/id="main"/g) ?? []).length, 1)
    release()
    await navigating
    assert.match(render(), /문서 내용/)
    assert.doesNotMatch(render(), /react-loading-skeleton|hidden=""/)

    gate = new Promise((resolve) => { release = resolve })
    const revalidating = router.revalidate()
    assert.match(render(), /문서 내용/)
    assert.doesNotMatch(render(), /react-loading-skeleton|hidden=""/)
    release()
    await revalidating

    const { default: PageSkeleton } = await server.ssrLoadModule('/src/components/PageSkeleton.jsx')
    for (const [path, fixedText] of [
      ['/', 'Add your conversation'],
      ['/wikis', 'Your conversations, connected'],
      ['/wiki/test/pages/article/edit', '전체 문서 편집'],
      ['/wiki/test/generations/job', '위키 제작'],
    ]) {
      const loadingRouter = createMemoryRouter([{ path: '*', element: createElement(PageSkeleton, { pathname: path }) }], { initialEntries: [path] })
      try {
        const html = renderToStaticMarkup(createElement(RouterProvider, { router: loadingRouter }))
        assert.match(html, /react-loading-skeleton/)
        assert.ok(html.includes(fixedText), path)
        if (path === '/') {
          assert.match(html, /Good chats\./)
          assert.match(html, /Generate my wiki/)
          assert.doesNotMatch(html.match(/<form[\s\S]*?<\/form>/)?.[0] ?? '', /react-loading-skeleton/)
        }
        if (path === '/wikis') assert.match(html, /<h1[^>]*>My wikis<\/h1>/)
      } finally { loadingRouter.dispose() }
    }
  } finally {
    release()
    router?.dispose()
    axios.defaults.adapter = originalAdapter
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
  }
})
