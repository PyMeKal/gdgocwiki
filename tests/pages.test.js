import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

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
      ['?page=unknown', '홈', '안녕하세요, 대화위키입니다.'],
      ['?page=__proto__', '홈', '안녕하세요, 대화위키입니다.'],
    ]

    for (const [search, activeLabel, heading] of cases) {
      await t.test(search || 'home', () => {
        globalThis.window = { location: { search } }
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
          assert.ok(['./', './?page=form', './?page=wiki'].includes(href), `unexpected page link: ${href}`)
        }

        if (search === '?page=form') {
          const fileInput = html.match(/<input\b[^>]*type="file"[^>]*>/)[0]
          const inputId = fileInput.match(/id="([^"]+)"/)[1]
          assert.ok(html.includes(`for="${inputId}"`))
          assert.match(html, /type="file" accept="\.txt,text\/plain"/)
          assert.match(html, /maxLength="100"/)
          assert.match(html, /type="submit" disabled=""/)
        }
      })
    }
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
    await server.close()
  }
})
