import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { defaultWiki } from '../src/data/wiki.js'

test('pages render with shared navigation and valid section links', async (t) => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  })
  const originalWindow = globalThis.window

  try {
    const { default: App } = await server.ssrLoadModule('/src/App.jsx')
    const cases = [
      ['', '홈', '안녕하세요, 대화위키입니다.'],
      ['?page=form', '대화 올리기', '새 위키 문서'],
      ['?page=wiki', '위키 보기', '2026년 부산 여행'],
      ['?page=wiki-edit', '위키 보기', '문서 정보'],
      ['?page=unknown', '홈', '안녕하세요, 대화위키입니다.'],
      ['?page=__proto__', '홈', '안녕하세요, 대화위키입니다.'],
    ]

    for (const [search, activeLabel, heading] of cases) {
      await t.test(search || 'home', () => {
        globalThis.window = { location: { search }, localStorage: { getItem: () => null } }
        const html = renderToStaticMarkup(createElement(App))
        assert.ok(html.includes(heading))
        assert.equal((html.match(/class="site-header"/g) || []).length, 1)
        assert.equal((html.match(/class="site-footer"/g) || []).length, 1)
        assert.equal((html.match(/aria-current="page"/g) || []).length, 1)
        assert.equal((html.match(/<title>/g) || []).length, 1)
        assert.ok(html.includes(`aria-current="page">${activeLabel}</a>`))
        assert.doesNotMatch(html, /(?:form|wiki)\.html/)

        for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
          assert.ok(html.includes(`id="${target}"`), `missing anchor: ${target}`)
        }

        for (const [, href] of html.matchAll(/href="([^"#][^"]*)"/g)) {
          assert.ok(['./', './?page=form', './?page=wiki', './?page=wiki-edit'].includes(href), `unexpected page link: ${href}`)
        }

        if (search === '?page=form') {
          const fileInput = html.match(/<input\b[^>]*type="file"[^>]*>/)[0]
          const inputId = fileInput.match(/id="([^"]+)"/)[1]
          assert.ok(html.includes(`for="${inputId}"`))
          assert.match(html, /type="file" accept="\.txt,text\/plain"/)
          assert.match(html, /maxLength="100"/)
          assert.match(html, /type="submit" disabled=""/)
        }

        if (search === '?page=wiki') {
          assert.match(html, /href="\.\/\?page=wiki-edit">위키 수정/)
          assert.match(html, /<title>2026년 부산 여행 · 대화위키<\/title>/)
          assert.match(html, /aria-describedby="footnote-1"/)
          assert.match(html, /title="아직 확정되지 않은 일정은/)
          assert.match(html, /id="footnote-1"/)
        }

        if (search === '?page=wiki-edit') {
          assert.match(html, /<title>2026년 부산 여행 수정 · 대화위키<\/title>/)
          assert.match(html, /id="edit-wiki-title"[^>]*value="2026년 부산 여행"/)
          assert.match(html, /목차 5 제목/)
          assert.match(html, /표 머리글/)
          assert.match(html, /\[\* 숙소 예산은/)
          assert.match(html, /type="submit">저장하기/)
        }
      })
    }

    await t.test('saved edits render safely with updated contents and sequential footnotes', () => {
      const wiki = structuredClone(defaultWiki)
      wiki.title = '<script>alert("title")</script>'
      wiki.sections = [
        { id: 'custom', title: '수정한 목차', blocks: [
          { type: 'paragraph', text: '수정한 내용[* 수정한 주석 <script>bad()</script>]' },
          { type: 'list', items: ['수정한 목록[* 두 번째 주석]'] },
          { type: 'table', caption: '수정한 표', header: true, rows: [['열 제목'], ['수정한 셀[* 세 번째 주석]']] },
        ] },
      ]
      globalThis.window = { location: { search: '?page=wiki' }, localStorage: { getItem: () => JSON.stringify(wiki) } }
      const html = renderToStaticMarkup(createElement(App))
      assert.doesNotMatch(html, /<script>/)
      assert.match(html, /&lt;script&gt;/)
      assert.match(html, /href="#custom">수정한 목차/)
      assert.match(html, /id="custom"/)
      assert.match(html, /수정한 내용/)
      assert.match(html, /수정한 셀/)
      assert.match(html, /두 번째 주석/)
      assert.match(html, /세 번째 주석/)
      assert.doesNotMatch(html, /id="overview"|\[\*/)
      for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
        assert.ok(html.includes(`id="${target}"`), `missing anchor: ${target}`)
      }
    })
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
    await server.close()
  }
})
