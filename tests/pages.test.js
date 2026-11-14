import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { defaultWiki } from '../src/data/wiki.js'
import { readFile } from 'node:fs/promises'
import { parseWikiJson } from '../src/utils/importWiki.js'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { wikiPagePath, wikiPath } from '../src/utils/paths.js'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { handlers } from '../src/mocks/handlers.js'
import { db, resetDb } from '../src/mocks/db.js'

test('pages render with shared navigation and valid section links', async (t) => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  })
  const originalWindow = globalThis.window
  const originalFetch = globalThis.fetch
  const originalLocation = globalThis.location
  const api = setupServer(...handlers)
  globalThis.location = new URL('http://localhost/')
  api.listen({ onUnhandledFrame: 'error' })
  const interceptedFetch = globalThis.fetch
  let cookie = ''
  const requests = []
  globalThis.fetch = async (path, options = {}) => {
    const url = new URL(path, location.href)
    requests.push(`${options.method ?? 'GET'} ${url.pathname}`)
    const response = await interceptedFetch(url, { ...options, headers: { ...options.headers, Cookie: cookie } })
    if (response.headers.has('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0]
    return response
  }
  resetDb()
  db.wikis[0].password = ''
  db.wikis.push({ ...db.wikis[0], id: 'team-42', name: '다른 위키' })
  db.pages.push({ ...db.pages[0], wikiId: 'team-42', id: 'travel-17', title: '다른 문서', content: '<script>bad()</script> 다른 본문' })

  try {
    const { routes } = await server.ssrLoadModule('/src/routes.jsx')
    async function renderPage(path) {
      const router = createMemoryRouter(routes, { initialEntries: [path] })
      try {
        if (!router.state.initialized) await new Promise((resolve) => {
          const unsubscribe = router.subscribe((state) => {
            if (state.initialized) { unsubscribe(); resolve() }
          })
        })
        return renderToStaticMarkup(createElement(RouterProvider, { router }))
      } finally {
        router.dispose()
      }
    }
    const cases = [
      ['/', '홈', '안녕하세요, 대화위키입니다.'],
      ['/form', '대화 올리기', '새 위키 문서'],
      [wikiPath(), '위키 보기', '문서 목록'],
      [wikiPagePath(), '위키 보기', '2026년 부산 여행'],
      [`${wikiPagePath()}/edit`, '위키 보기', '문서 정보'],
      [`${wikiPath()}/import`, '위키 보기', 'JSON 입력'],
      ['/unknown', null, '페이지를 찾을 수 없습니다.'],
      ['/wiki/team-42/pages/travel-17', '위키 보기', '다른 문서'],
      [`${wikiPath()}/preview`, '위키 보기', '2026년 부산 여행'],
      ['/wiki/missing/pages/missing', '위키 보기', '요청한 위키 또는 문서를 찾을 수 없습니다.'],
      ['/wiki/team-42/pages/travel-17/edit', '위키 보기', '문서 정보'],
    ]

    for (const [path, activeLabel, heading] of cases) {
      await t.test(path, async () => {
        globalThis.window = { localStorage: { getItem: () => null } }
        const html = await renderPage(path)
        assert.ok(html.includes(heading))
        assert.equal((html.match(/class="site-header"/g) || []).length, 1)
        assert.equal((html.match(/class="site-footer"/g) || []).length, 1)
        assert.equal((html.match(/aria-current="page"/g) || []).length, activeLabel ? 1 : 0)
        assert.equal((html.match(/<title>/g) || []).length, 1)
        if (activeLabel) assert.match(html, new RegExp(`aria-current="page"[^>]*>${activeLabel}</a>`))
        assert.doesNotMatch(html, /(?:form|wiki)\.html/)

        for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
          assert.ok(html.includes(`id="${target}"`), `missing anchor: ${target}`)
        }

        for (const [, href] of html.matchAll(/href="([^"#][^"]*)"/g)) {
          assert.ok(href === '/' || href === '/form' || href === '/examples/wiki.json' || href.startsWith('/wiki/'), `unexpected page link: ${href}`)
          assert.ok(!href.includes('?page='), `legacy page link: ${href}`)
        }

        if (path === '/form') {
          const fileInput = html.match(/<input\b[^>]*type="file"[^>]*>/)[0]
          const inputId = fileInput.match(/id="([^"]+)"/)[1]
          assert.ok(html.includes(`for="${inputId}"`))
          assert.match(html, /type="file" accept="\.txt,text\/plain"/)
          assert.match(html, /maxLength="100"/)
          assert.match(html, /type="submit" disabled=""/)
        }

        if (path === wikiPath()) {
          assert.ok(html.includes(`href="${wikiPagePath()}"`))
        }

        if (path === wikiPagePath()) {
          assert.match(html, /<title>2026년 부산 여행 · 우리들의 위키 · 대화위키<\/title>/)
          assert.match(html, /친구들과 부산에 가기로 계획한 여행이다/)
          assert.match(html, /버전 3/)
          assert.ok(requests.includes(`GET /wikis/${db.wikis[0].id}`))
          assert.ok(requests.includes(`GET /wikis/${db.wikis[0].id}/pages/page_001`))
        }

        if (path === `${wikiPagePath()}/edit`) {
          assert.match(html, /<title>2026년 부산 여행 수정 · 대화위키<\/title>/)
          assert.match(html, /id="edit-wiki-title"[^>]*value="2026년 부산 여행"/)
          assert.match(html, /목차 5 제목/)
          assert.match(html, /표 머리글/)
          assert.match(html, /\[\* 숙소 예산은/)
          assert.match(html, /type="submit">저장하기/)
        }
        if (path === '/wiki/team-42/pages/travel-17') {
          assert.match(html, /다른 위키/)
          assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt; 다른 본문/)
          assert.doesNotMatch(html, /부산 여행에 참여|<script>/)
          assert.ok(html.includes('href="/wiki/team-42"'))
        }
        if (path === '/wiki/team-42/pages/travel-17/edit') {
          assert.ok(html.includes('href="/wiki/team-42/preview"'))
        }
      })
    }

    await t.test('router navigates between pages and supports back and forward history', async () => {
      globalThis.window = { localStorage: { getItem: () => null } }
      const router = createMemoryRouter(routes, { initialEntries: ['/'] })
      const render = () => renderToStaticMarkup(createElement(RouterProvider, { router }))
      try {
        await router.navigate('/form')
        assert.match(render(), /새 위키 문서/)
        await router.navigate(wikiPath('team-42'))
        assert.match(render(), /문서 목록/)
        await router.navigate(wikiPagePath('team-42', 'travel-17'))
        assert.match(render(), /다른 문서/)
        assert.doesNotMatch(render(), /2026년 부산 여행/)
        await router.navigate(-1)
        assert.equal(router.state.location.pathname, '/wiki/team-42')
        await router.navigate(1)
        assert.equal(router.state.location.pathname, '/wiki/team-42/pages/travel-17')
      } finally {
        router.dispose()
      }
    })

    await t.test('password errors render unlock UI and successful submission reloads API data', async () => {
      db.wikis[0].password = '1234'
      cookie = ''
      const router = createMemoryRouter(routes, { initialEntries: ['/'] })
      const render = () => renderToStaticMarkup(createElement(RouterProvider, { router }))
      try {
        await router.navigate(wikiPagePath())
        assert.match(render(), /위키 비밀번호/)
        let formData = new FormData()
        formData.set('password', 'wrong')
        await router.navigate(wikiPagePath(), { formMethod: 'post', formData })
        assert.match(render(), /비밀번호가 올바르지 않습니다/)
        formData = new FormData()
        formData.set('password', '1234')
        await router.navigate(wikiPagePath(), { formMethod: 'post', formData })
        assert.match(render(), /친구들과 부산에 가기로 계획한 여행이다/)
        assert.doesNotMatch(render(), /위키 비밀번호를 입력/)
      } finally {
        router.dispose()
        db.wikis[0].password = ''
        cookie = ''
      }
    })

    await t.test('empty wiki and server errors do not fall back to a local document', async () => {
      db.wikis.push({ ...db.wikis[0], id: 'empty', name: '빈 위키' })
      assert.match(await renderPage(wikiPath('empty')), /아직 생성된 문서가 없습니다/)
      assert.doesNotMatch(await renderPage(wikiPath('empty')), /2026년 부산 여행/)
      api.use(http.get('http://localhost/wikis/broken', () => HttpResponse.json({ message: '일시적인 서버 오류입니다.' }, { status: 500 })))
      assert.match(await renderPage(wikiPath('broken')), /일시적인 서버 오류입니다/)
      api.resetHandlers()
    })

    await t.test('saved edits render safely with updated contents and sequential footnotes', async () => {
      const wiki = structuredClone(defaultWiki)
      wiki.title = '<script>alert("title")</script>'
      wiki.sections = [
        { id: 'custom', title: '수정한 목차', blocks: [
          { type: 'paragraph', text: '수정한 내용[* 수정한 주석 <script>bad()</script>]' },
          { type: 'list', items: ['수정한 목록[* 두 번째 주석]'] },
          { type: 'table', caption: '수정한 표', header: true, rows: [['열 제목'], ['수정한 셀[* 세 번째 주석]']] },
        ] },
      ]
      globalThis.window = { localStorage: { getItem: () => JSON.stringify(wiki) } }
      const html = await renderPage(`${wikiPath()}/preview`)
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
      const { wiki, warnings } = parseWikiJson(await readFile(new URL('../public/examples/wiki.json', import.meta.url), 'utf8'))
      assert.deepEqual(warnings, [])
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

      globalThis.window = { localStorage: { getItem: () => JSON.stringify(wiki) } }
      const editHtml = await renderPage(`${wikiPagePath()}/edit`)
      assert.match(editHtml, /목차 1\.1\.1 제목/)
      assert.match(editHtml, /이미지 대체 텍스트/)
      assert.match(editHtml, /JSON으로 전체 문서 편집/)
    })

    await t.test('partial and hostile JSON displays supplied text without scripts or invented document data', async () => {
      const { default: WikiDocument } = await server.ssrLoadModule('/src/components/WikiDocument.jsx')
      const { wiki } = parseWikiJson(JSON.stringify({ title: '<script>title()</script>', sections: [
        { blocks: [{ type: 'paragraph', text: '<img src=x onerror=alert(1)>[^missing]' }, { type: 'image', src: 'javascript:alert(1)' }, { type: 'link', url: 'data:text/html,bad' }] },
      ], infobox: { fields: [{ label: '없음' }] } }))
      const html = renderToStaticMarkup(createElement(WikiDocument, { wiki }))
      assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
      assert.match(html, /\[\^missing\]/)
      assert.doesNotMatch(html, /<script|<img|javascript:|data:text\/html|wiki-infobox|부산|예시 문서/)
      const minimal = parseWikiJson('{"title":"제목만 있는 문서"}').wiki
      const minimalHtml = renderToStaticMarkup(createElement(WikiDocument, { wiki: minimal }))
      assert.match(minimalHtml, /<h1>제목만 있는 문서<\/h1>/)
      assert.doesNotMatch(minimalHtml, /class="toc"|wiki-infobox|참고 자료/)
    })
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
    api.close()
    globalThis.fetch = originalFetch
    if (originalLocation === undefined) delete globalThis.location
    else globalThis.location = originalLocation
    await server.close()
  }
})
