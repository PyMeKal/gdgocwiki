import axios from 'axios'
import { mockAxios } from './helpers/mockAxios.js'
import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { defaultWiki } from './fixtures/wiki.js'
import { parseWikiData } from '../src/utils/importWiki.js'

test('routes render API data, navigation, errors and safe documents', async (t) => {
  // 개발 서버와 병렬 테스트의 React 번들 캐시가 섞이지 않게 합니다.
  const cacheDir = await mkdtemp(join(tmpdir(), 'gdgocwiki-vite-'))
  const server = await createServer({ cacheDir, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  const originalAdapter = axios.defaults.adapter
  const originalWindow = globalThis.window
  const wiki = { id: 'team-42', name: '테스트 위키', hasPassword: false }
  const page = { id: 'page-17', title: '테스트 문서', category: 'EVENT', content: '## 개요\n본문[* 주석]\n## 일정\n일정 본문', version: 3, updatedAt: '2026-11-20T00:00:00Z' }
  const values = new Map()
  globalThis.window = { localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } }
  let status = 200
  let jobStatus = 'COMPLETED'
  mockAxios(async (url) => {
    const path = new URL(url, 'http://localhost').pathname.replace(/^\/api/, '')
    if (status !== 200) return Response.json({ message: '조회 실패' }, { status })
    if (path.includes('/generations/')) return Response.json({ status: jobStatus, createdPages: 1, updatedPages: 0 })
    if (path.endsWith('/pages/page-17')) return Response.json(page)
    if (path.endsWith('/pages')) return Response.json({ pages: [{ id: page.id, title: page.title, category: page.category }] })
    if (path === '/wikis/team-42') return Response.json(wiki)
    throw new Error(`Unexpected API request: ${path}`)
  })
  try {
    const { routes } = await server.ssrLoadModule('/src/routes.jsx')
    async function renderPage(path) {
      const router = createMemoryRouter(routes, { initialEntries: [path] })
      try {
        if (!router.state.initialized) await new Promise((resolve) => {
          const unsubscribe = router.subscribe((state) => { if (state.initialized) { unsubscribe(); resolve() } })
        })
        return renderToStaticMarkup(createElement(RouterProvider, { router }))
      } finally { router.dispose() }
    }
    const cases = [
      ['/', 'Good chats.'], ['/form', 'Add your conversation'],
      ['/wikis', 'Your conversations, connected'],
      ['/wiki/team-42', 'Your conversation, organized'],
      ['/wiki/team-42/import', 'Add your conversation'],
      ['/wiki/team-42/pages/page-17', '테스트 문서'],
      ['/wiki/team-42/pages/page-17/edit', '전체 문서 편집'],
      ['/wiki/team-42/pages/page-17/edit?section=section-2', '섹션 편집'],
      ['/wiki/team-42/preview', '페이지를 찾을 수 없습니다'],
      ['/wiki/team-42/preview/edit', '페이지를 찾을 수 없습니다'],
      ['/unknown', '페이지를 찾을 수 없습니다'],
    ]
    for (const [path, heading] of cases) await t.test(path, async () => {
      const html = await renderPage(path)
      assert.ok(html.includes(heading))
      assert.equal((html.match(/class="site-header(?: article-site-header)?"/g) || []).length, 1)
      assert.equal((html.match(/class="bottom-navigation"/g) || []).length, 1)
      assert.equal((html.match(/<title>/g) || []).length, 1)
      assert.match(html, /href="\/wikis"/)
      for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${target}"`))
      if (path.endsWith('?section=section-2')) {
        assert.match(html, /## 일정/)
        assert.doesNotMatch(html, /## 개요/)
      }
      if (path === '/wiki/team-42/pages/page-17') {
        assert.match(html, /href="#section-1"/)
        assert.match(html, /pages\/page-17\/edit/)
        assert.doesNotMatch(html, /\/preview/)
      }
    })
    await t.test('remembered wiki list and empty state', async () => {
      assert.match(await renderPage('/wikis'), /테스트 위키/)
      values.clear()
      assert.match(await renderPage('/wikis'), /아직 이 브라우저에 기록된/)
    })
    await t.test('server, authentication and missing resource errors are recoverable', async () => {
      status = 500
      assert.match(await renderPage('/wiki/team-42'), /다시 시도/)
      status = 401
      assert.match(await renderPage('/wiki/team-42'), /위키 비밀번호/)
      status = 404
      assert.match(await renderPage('/wiki/team-42'), /요청한 위키 또는 문서를 찾을 수 없습니다/)
      status = 200
    })
    await t.test('generation states reflect server-owned jobs', async () => {
      for (const [state, text] of [['PENDING', '위키를 만들고 있습니다'], ['PROCESSING', '위키를 만들고 있습니다'], ['FAILED', '문서를 만들지 못했습니다'], ['COMPLETED', '다 제작되었습니다!']]) {
        jobStatus = state
        const html = await renderPage('/wiki/team-42/generations/job-1')
        assert.ok(html.includes(text))
        assert.equal(html.includes('>위키로 이동<'), state === 'COMPLETED')
      }
    })
    await t.test('documents render safely with sequential footnotes', async () => {
      const wiki = structuredClone(defaultWiki)
      wiki.title = '<script>alert("title")</script>'
      wiki.sections = [
        { id: 'custom', title: '수정한 목차', blocks: [
          { type: 'paragraph', text: '수정한 내용[* 수정한 주석 <script>bad()</script>]' },
          { type: 'list', items: ['수정한 목록[* 두 번째 주석]'] },
          { type: 'table', caption: '수정한 표', header: true, rows: [['열 제목'], ['수정한 셀[* 세 번째 주석]']] },
        ] },
      ]
      const { default: WikiDocument } = await server.ssrLoadModule('/src/components/WikiDocument.jsx')
      const html = renderToStaticMarkup(createElement(WikiDocument, { wiki }))
      assert.doesNotMatch(html, /<script>alert|<script>bad/)
      assert.match(html, /&lt;script&gt;/)
      assert.match(html, /href="#custom">1\. 수정한 목차/)
      assert.match(html, /id="custom"/)
      assert.match(html, /수정한 내용/)
      assert.match(html, /수정한 셀/)
      assert.match(html, /두 번째 주석/)
      assert.match(html, /세 번째 주석/)
      assert.match(html, /id="footnote-tooltip-3" role="tooltip" popover="auto">\[3\] 세 번째 주석/)
      assert.match(html, /id="footnote-tooltip-1" role="tooltip" popover="auto">\[1\] 수정한 주석 &lt;script&gt;bad\(\)&lt;\/script&gt;/)
      assert.doesNotMatch(html, /id="overview"|\[\*/)
      for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
        assert.ok(html.includes(`id="${target}"`), `missing anchor: ${target}`)
      }
    })

    await t.test('example JSON renders nested contents, infobox, images, shared footnotes and references', async () => {
      const { default: WikiDocument } = await server.ssrLoadModule('/src/components/WikiDocument.jsx')
      const wiki = JSON.parse(await readFile(new URL('./fixtures/wikiDocument.json', import.meta.url), 'utf8'))
      const html = renderToStaticMarkup(createElement(WikiDocument, { wiki }))
      assert.match(html, /href="#details">1\.1\.1\. 세부 항목/)
      assert.match(html, /<h4 class="wiki-section-heading">.*1\.1\.1\.<\/a> 세부 항목<\/h4>/)
      assert.ok(html.indexOf('class="toc"') < html.indexOf('class="wiki-infobox'))
      assert.ok(html.indexOf('class="wiki-infobox') < html.indexOf('class="wiki-sections"'))
      assert.match(html, /<th scope="row">예시 연도<\/th><td class="wiki-text">2026/)
      assert.match(html, /<td class="wiki-text">false<\/td>/)
      assert.match(html, /alt="대화위키 아이콘"/)
      assert.match(html, /id="footnote-tooltip-1-3"/)
      assert.equal((html.match(/id="footnote-1"/g) || []).length, 1)
      assert.match(html, /참고 자료/)
      const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
      assert.equal(new Set(ids).size, ids.length, 'duplicate DOM ids')
      for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target), `missing anchor: ${target}`)
      for (const [, target] of html.matchAll(/aria-describedby="([^"]+)"/g)) assert.ok(ids.includes(target), `missing description: ${target}`)

      wiki.infobox.placement = 'top'
      const top = renderToStaticMarkup(createElement(WikiDocument, { wiki }))
      assert.ok(top.indexOf('class="wiki-infobox') < top.indexOf('class="toc"'))
      wiki.infobox.placement = 'right'
      assert.match(renderToStaticMarkup(createElement(WikiDocument, { wiki })), /class="wiki-infobox infobox-right"/)

    })

    await t.test('partial and hostile JSON displays supplied text without scripts or invented document data', async () => {
      const { default: WikiDocument } = await server.ssrLoadModule('/src/components/WikiDocument.jsx')
      const { wiki } = parseWikiData({ title: '<script>title()</script>', category: '<img src=x onerror=alert(1)>',
        content: '##<script>section()</script>\n<img src=x onerror=alert(1)>[^missing]',
        infobox: { fields: [{ label: '없음' }] }, references: [{ url: 'javascript:bad' }],
      })
      const html = renderToStaticMarkup(createElement(WikiDocument, { wiki }))
      assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
      assert.match(html, /\[\^missing\]/)
      assert.doesNotMatch(html, /<script|<img|javascript:|data:text\/html|wiki-infobox|부산|예시 문서/)
      const minimal = parseWikiData({ title: '제목만 있는 문서', content: '' }).wiki
      const minimalHtml = renderToStaticMarkup(createElement(WikiDocument, { wiki: minimal }))
      assert.match(minimalHtml, /<h1>제목만 있는 문서<\/h1>/)
      assert.doesNotMatch(minimalHtml, /class="toc"|wiki-infobox|참고 자료/)
    })
  } finally {
    axios.defaults.adapter = originalAdapter
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
  }
})
