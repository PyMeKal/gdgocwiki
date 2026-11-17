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
import { createWiki, generatePages, uploadChat } from '../src/api/wikis.js'
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
      ['/', 'Create', 'Good chats.'],
      ['/form', 'Create', 'Add your conversation'],
      [wikiPath(), 'My wikis', 'Your conversation, organized'],
      [wikiPagePath(), 'My wikis', '2026년 부산 여행'],
      [`${wikiPagePath()}/edit`, 'My wikis', '전체 문서 편집'],
      [`${wikiPagePath()}/edit?section=section-2`, 'My wikis', '섹션 편집'],
      [`${wikiPath()}/preview/edit`, 'My wikis', '문서 정보'],
      [`${wikiPath()}/import`, 'Create', 'JSON 입력'],
      ['/unknown', null, '페이지를 찾을 수 없습니다.'],
      ['/wiki/team-42/pages/travel-17', 'My wikis', '다른 문서'],
      [`${wikiPath()}/preview`, 'My wikis', '2026년 부산 여행'],
      ['/wiki/missing/pages/missing', 'My wikis', '요청한 위키 또는 문서를 찾을 수 없습니다.'],
      ['/wiki/team-42/pages/travel-17/edit', 'My wikis', '전체 문서 편집'],
    ]

    for (const [path, activeLabel, heading] of cases) {
      await t.test(path, async () => {
        globalThis.window = { localStorage: { getItem: () => null } }
        const html = await renderPage(path)
        assert.ok(html.includes(heading))
        assert.equal((html.match(/class="site-header(?: article-site-header)?"/g) || []).length, 1)
        assert.equal((html.match(/class="bottom-navigation"/g) || []).length, 1)
        assert.equal((html.match(/aria-current="page"/g) || []).length, activeLabel ? 1 : 0)
        assert.equal((html.match(/<title>/g) || []).length, 1)
        if (activeLabel) assert.match(html, new RegExp(`aria-current="page"[^>]*><img[^>]*>${activeLabel}</a>`))
        assert.doesNotMatch(html, /(?:form|wiki)\.html/)

        for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
          assert.ok(html.includes(`id="${target}"`), `missing anchor: ${target}`)
        }

        for (const [, href] of html.matchAll(/href="([^"#][^"]*)"/g)) {
          assert.ok(href === '/' || href === '/form' || href === '/examples/wiki.json' || href === '/examples/kakao-chat.txt' || href.startsWith('/wiki/') || href.startsWith('/design/'), `unexpected page link: ${href}`)
          assert.ok(!href.includes('?page='), `legacy page link: ${href}`)
        }

        if (path === '/' || path === '/form' || path.endsWith('/import')) {
          const fileInput = html.match(/<input\b[^>]*type="file"[^>]*>/)[0]
          const inputId = fileInput.match(/id="([^"]+)"/)[1]
          assert.ok(html.includes(`for="${inputId}"`))
          assert.match(html, /type="file" accept="\.txt,text\/plain"/)
          assert.match(html, /id="wiki-password" type="password" autoComplete="new-password" aria-describedby="password-help" name="password"/)
          assert.match(html, /maxLength="100"/)
          assert.match(html, /type="submit" disabled=""/)
        }

        if (path === wikiPath() || path === wikiPagePath()) {
          assert.match(html, /aria-label="위키 URL 복사"/ )
          assert.match(html, /share-icon-button/ )
        }

        assert.match(html, /<button type="button" aria-disabled="true"><img[^>]*>Explore<\/button>/)
        assert.match(html, /<button type="button" aria-disabled="true"><img[^>]*>Settings<\/button>/)

        if (path === wikiPath()) {
          assert.match(html, /aria-label="위키 문서 검색"/)
          assert.match(html, /Modified /)
          assert.match(html, /value="newest"/)
          assert.match(html, /value="oldest"/)
          assert.match(html, /value="title"/)
          assert.ok(html.includes(`href="${wikiPagePath()}"`))
        }

        if (path === wikiPagePath()) {
          assert.match(html, /<title>2026년 부산 여행 · 우리들의 위키 · 대화위키<\/title>/)
          assert.match(html, /친구들과 부산에 가기로 계획한 여행이다/)
          assert.match(html, /class="toc"/)
          assert.match(html, /href="#section-1">1\. 개요/)
          assert.match(html, /href="#section-2">2\. 일정/)
          assert.match(html, /id="section-1" class="wiki-section"/)
          assert.doesNotMatch(html, /## 개요|## 일정|버전 undefined/)
          assert.ok(requests.includes(`GET /wikis/${db.wikis[0].id}`))
          assert.ok(requests.includes(`GET /wikis/${db.wikis[0].id}/pages/page_001`))
          assert.ok(html.includes(`href="${wikiPagePath()}/edit"`))
          assert.ok(html.includes(`href="${wikiPagePath()}/edit?section=section-1"`))
          assert.ok(html.includes(`href="${wikiPagePath()}/edit?section=section-2"`))
          assert.match(html, /aria-label="1\. 개요 섹션 편집"/)
        }

        if (path === `${wikiPagePath()}/edit`) {
          assert.match(html, /<title>2026년 부산 여행 수정 · 대화위키<\/title>/)
          assert.match(html, /name="version" value="3"/)
          assert.match(html, /## 개요/)
          assert.match(html, /## 일정/)
          assert.match(html, /type="submit">편집 완료/)
          assert.doesNotMatch(html, /edit-wiki-title|브라우저에 저장됩니다/)
        }
        if (path === `${wikiPagePath()}/edit?section=section-2`) {
          assert.match(html, /## 일정/)
          assert.doesNotMatch(html, /## 개요|친구들과 부산에 가기로/)
        }
        if (path === `${wikiPath()}/preview/edit`) {
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
          assert.ok(html.includes('href="/wiki/team-42/pages/travel-17"'))
          assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt; 다른 본문/)
        }
      })
    }

    await t.test('router navigates between pages and supports back and forward history', async () => {
      globalThis.window = { localStorage: { getItem: () => null } }
      const router = createMemoryRouter(routes, { initialEntries: ['/'] })
      const render = () => renderToStaticMarkup(createElement(RouterProvider, { router }))
      try {
        await router.navigate('/form')
        assert.match(render(), /Add your conversation/)
        await router.navigate(wikiPath('team-42'))
        assert.match(render(), /Your conversation, organized/)
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

    await t.test('protected wiki creation authenticates before upload and retries without duplication', async () => {
      cookie = ''
      const router = createMemoryRouter(routes, { initialEntries: ['/form'] })
      const render = () => renderToStaticMarkup(createElement(RouterProvider, { router }))
      const formData = new FormData()
      formData.set('title', '비밀번호 위키')
      formData.set('password', ' secret 1234 ')
      formData.set('chat', new File(['[문서: 보호된 문서 | EVENT]\n[가상 인물] [오후 1:00] ##개요\n비공개 본문'], 'chat.txt'))
      const submit = () => router.navigate('/form', { formMethod: 'post', formEncType: 'multipart/form-data', formData })
      const count = db.wikis.length
      try {
        api.use(http.post('http://localhost/wikis/:wikiId/chats', () => HttpResponse.json({ message: '업로드 실패' }, { status: 500 })))
        await submit()
        assert.equal(Object.values(router.state.actionData)[0].error, '업로드 실패')
        const wiki = db.wikis.at(-1)
        assert.equal(wiki.name, '비밀번호 위키')
        assert.equal(wiki.password, ' secret 1234 ')
        assert.equal(db.wikis.length, count + 1)
        assert.doesNotMatch(JSON.stringify(router.state.actionData), /secret 1234/)
        api.resetHandlers()
        cookie = '' // 인증 쿠키를 잃은 재시도에서도 같은 위키를 인증합니다.
        formData.set('wikiId', wiki.id)
        await submit()
        assert.equal(db.wikis.length, count + 1)
        assert.equal(db.chats.filter((chat) => chat.wikiId === wiki.id).length, 1)
        assert.match(router.state.location.pathname, new RegExp(`^/wiki/${wiki.id}/generations/`))
        const job = db.jobs.find((job) => job.wikiId === wiki.id)
        job.startedAt = Date.now() - 6001
        await router.revalidate()
        const page = db.pages.find((page) => page.wikiId === wiki.id)
        assert.ok(page)
        cookie = ''
        for (const path of [wikiPath(wiki.id), wikiPagePath(wiki.id, page.id), `${wikiPagePath(wiki.id, page.id)}/edit`, `/wiki/${wiki.id}/generations/${job.jobId}`]) {
          await router.navigate(path)
          assert.match(render(), /위키 비밀번호를 입력해주세요/)
          assert.doesNotMatch(render(), /비공개 본문/)
        }
        const unlock = new FormData()
        unlock.set('password', 'wrong')
        await router.navigate(wikiPath(wiki.id), { formMethod: 'post', formData: unlock })
        assert.match(render(), /비밀번호가 올바르지 않습니다/)
        unlock.set('password', ' secret 1234 ')
        await router.navigate(wikiPath(wiki.id), { formMethod: 'post', formData: unlock })
        assert.match(render(), /보호된 문서/)
        await router.navigate(wikiPagePath(wiki.id, page.id))
        assert.match(render(), /비공개 본문/)
      } finally {
        router.dispose()
        api.resetHandlers()
        cookie = ''
      }
    })

    await t.test('edit submission redirects to the updated document and back navigation reloads the editor', async () => {
      const path = `${wikiPagePath('team-42', 'travel-17')}/edit`
      const router = createMemoryRouter(routes, { initialEntries: ['/'] })
      const render = () => renderToStaticMarkup(createElement(RouterProvider, { router }))
      try {
        await router.navigate(path)
        const formData = new FormData()
        formData.set('content', '소개\n## 개요\n저장 후 본문\n## 일정\n보존할 일정')
        formData.set('version', '3')
        await router.navigate(path, { formMethod: 'post', formData })
        assert.equal(router.state.location.pathname, wikiPagePath('team-42', 'travel-17'))
        assert.match(render(), /저장 후 본문/)
        await router.navigate(`${path}?section=section-1`)
        assert.match(render(), /저장 후 본문/)
        assert.doesNotMatch(render(), /보존할 일정/)
        formData.set('content', '## 새 개요\n부분 수정 결과')
        formData.set('version', '4')
        await router.navigate(`${path}?section=section-1`, { formMethod: 'post', formData })
        assert.equal(router.state.location.hash, '#section-1')
        assert.match(render(), /부분 수정 결과/)
        assert.match(render(), /보존할 일정/)
      } finally {
        router.dispose()
      }
    })

    await t.test('a protected edit URL unlocks in place and missing sections show a recoverable error', async () => {
      db.wikis[0].password = '1234'
      cookie = ''
      const path = `${wikiPagePath()}/edit?section=section-2`
      const router = createMemoryRouter(routes, { initialEntries: ['/'] })
      const render = () => renderToStaticMarkup(createElement(RouterProvider, { router }))
      try {
        await router.navigate(path)
        assert.match(render(), /위키 비밀번호/)
        const formData = new FormData()
        formData.set('password', 'wrong')
        await router.navigate(path, { formMethod: 'post', formData })
        assert.match(render(), /비밀번호가 올바르지 않습니다/)
        formData.set('password', '1234')
        await router.navigate(path, { formMethod: 'post', formData })
        assert.match(render(), /선택한 섹션의 제목과 본문/)
        assert.doesNotMatch(render(), /## 개요/)
        await router.navigate(`${wikiPagePath()}/edit?section=section-999`)
        assert.match(render(), /편집할 섹션을 찾을 수 없습니다/)
        assert.match(render(), /다시 시도/)
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

    await t.test('generation route shows waiting, completion and a link to persisted wiki pages', async () => {
      const wiki = await createWiki({ name: '대기 화면 테스트' })
      const chat = await uploadChat(wiki.id, new File(['[문서: 화면 테스트 | EVENT]\n[가상 인물] [오후 1:00] ##개요\n본문'], 'chat.txt'))
      const job = await generatePages(wiki.id, { chatIds: [chat.id], mode: 'MERGE' })
      const path = `${wikiPath(wiki.id)}/generations/${job.jobId}`
      const waiting = await renderPage(path)
      assert.match(waiting, /위키를 만들고 있습니다/)
      assert.doesNotMatch(waiting, /위키로 이동|위키 URL 복사/)
      db.jobs.find((item) => item.jobId === job.jobId).startedAt = Date.now() - 6001
      const done = await renderPage(path)
      assert.match(done, /다 제작되었습니다!/)
      assert.match(done, /aria-label="위키 URL 복사"/)
      assert.match(done, /문서 1개를 저장했습니다/)
      assert.ok(done.includes(`href="${wikiPath(wiki.id)}"`))
      assert.match(await renderPage(wikiPath(wiki.id)), /화면 테스트/)
      db.jobs.find((item) => item.jobId === job.jobId).status = 'FAILED'
      assert.match(await renderPage(path), /문서를 만들지 못했습니다/)
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

    await t.test('API responses with only title, category and content render through WikiDocument', async () => {
      api.use(http.get('http://localhost/wikis/team-42/pages/travel-17', () => HttpResponse.json({
        title: 'API 전용 문서', category: 'PERSON', content: '##개요\n첫 문단\n\n둘째 문단\n## 활동\n활동 본문',
      })))
      try {
        const html = await renderPage('/wiki/team-42/pages/travel-17')
        assert.match(html, /<h1>API 전용 문서<\/h1>/)
        assert.match(html, /href="#section-1">1\. 개요/)
        assert.match(html, /href="#section-2">2\. 활동/)
        assert.match(html, /첫 문단\n\n둘째 문단/)
        assert.match(html, /활동 본문/)
        assert.doesNotMatch(html, /##|undefined|wiki-infobox/)
      } finally {
        api.resetHandlers()
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

      globalThis.window = { localStorage: { getItem: () => JSON.stringify(wiki) } }
      const editHtml = await renderPage(`${wikiPath()}/preview/edit`)
      assert.match(editHtml, /목차 1\.1\.1 제목/)
      assert.match(editHtml, /이미지 대체 텍스트/)
      assert.match(editHtml, /JSON으로 전체 문서 편집/)
    })

    await t.test('partial and hostile JSON displays supplied text without scripts or invented document data', async () => {
      const { default: WikiDocument } = await server.ssrLoadModule('/src/components/WikiDocument.jsx')
      const { wiki } = parseWikiJson(JSON.stringify({ title: '<script>title()</script>', category: '<img src=x onerror=alert(1)>',
        content: '##<script>section()</script>\n<img src=x onerror=alert(1)>[^missing]',
        infobox: { fields: [{ label: '없음' }] }, references: [{ url: 'javascript:bad' }],
      }))
      const html = renderToStaticMarkup(createElement(WikiDocument, { wiki }))
      assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
      assert.match(html, /\[\^missing\]/)
      assert.doesNotMatch(html, /<script|<img|javascript:|data:text\/html|wiki-infobox|부산|예시 문서/)
      const minimal = parseWikiJson('{"title":"제목만 있는 문서","content":""}').wiki
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
