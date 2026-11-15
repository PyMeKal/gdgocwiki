import assert from 'node:assert/strict'
import test from 'node:test'
import { copyWikiUrl } from '../src/utils/copyWikiUrl.js'

test('copies the absolute wiki home URL without the current page, query or hash', async () => {
  const originalWindow = globalThis.window
  const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  const copied = []
  try {
    globalThis.window = { location: new URL('https://example.com/wiki/old/pages/page-1?secret=value#section-1') }
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (url) => copied.push(url) } })
    assert.deepEqual(await copyWikiUrl('team/42'), { url: 'https://example.com/wiki/team%2F42', copied: true })
    assert.deepEqual(copied, ['https://example.com/wiki/team%2F42'])
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied') } } })
    assert.deepEqual(await copyWikiUrl('team-42'), { url: 'https://example.com/wiki/team-42', copied: false })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    assert.equal((await copyWikiUrl('team-42')).copied, false)
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
    if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard)
    else delete navigator.clipboard
  }
})
