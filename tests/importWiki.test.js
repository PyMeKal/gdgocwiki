import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { parseWikiJson, readWikiJson } from '../src/utils/importWiki.js'
import { loadWiki, prepareWiki, saveWiki, validateWiki } from '../src/utils/wiki.js'
import { isSafeUrl } from '../src/utils/wikiSchema.js'

test('example JSON preserves original content, generates hierarchical numbers and reuses footnotes', async () => {
  const text = await readFile(new URL('../public/examples/wiki.json', import.meta.url), 'utf8')
  const raw = JSON.parse(text)
  const { wiki, warnings } = parseWikiJson(text)
  assert.deepEqual(warnings, [])
  assert.equal(wiki.title, raw.title)
  assert.equal(wiki.sections[0].blocks[0].text, raw.sections[0].blocks[0].text)
  assert.equal(wiki.infobox.fields[2].value, 'false')
  validateWiki(wiki)
  const copy = structuredClone(wiki)
  const prepared = prepareWiki(wiki)
  assert.equal(prepared.sections[0].sections[0].sections[0].number, '1.1.1')
  assert.equal(prepared.sections[1].number, '2')
  assert.equal(prepared.footnotes.length, 2)
  assert.equal(prepared.footnotes[0].references.length, 3)
  assert.equal(prepared.sections[0].blocks[0].text[1].number, 1)
  assert.equal(prepared.sections[0].blocks[1].items[1][1].number, 1)
  assert.deepEqual(wiki, copy)
  wiki.sections.reverse()
  assert.equal(prepareWiki(wiki).sections[0].number, '1')
})

test('recovers partial data, preserves valid siblings and produces unique safe anchors', () => {
  const { wiki, warnings } = parseWikiJson(JSON.stringify({
    title: '원본 제목', description: 3,
    sections: [null, { id: 'main', blocks: [
      null, { type: 'unknown' }, { type: { toString: 'hostile' } },
      { type: 'paragraph', text: '  원본\n내용  ' },
      { type: 'table', rows: [['a', 'b'], ['broken']] },
      { type: 'list', items: ['유지', null] },
    ], sections: [{ id: 'same', title: '하위', blocks: [{ type: 'table', rows: [['개수', 0, false]] }] }] },
    { id: 'same', title: '동일 식별자' }],
    footnotes: [{ id: '__proto__', content: '안전한 키' }, { id: '__proto__', content: '중복' }, null],
    references: [{ url: 'javascript:alert(1)' }, { url: 'https://example.com' }],
    infobox: { placement: 'unknown', fields: [{ label: '0', value: 0 }, { label: '없음' }, null] },
  }))
  validateWiki(wiki)
  assert.ok(warnings.length > 5)
  assert.equal(wiki.sections[0].title, '')
  assert.equal(wiki.sections[0].blocks[0].text, '  원본\n내용  ')
  assert.deepEqual(wiki.sections[0].blocks[1].items, ['유지'])
  assert.deepEqual(wiki.sections[0].sections[0].blocks[0].rows, [['개수', '0', 'false']])
  assert.notEqual(wiki.sections[0].id, 'main')
  assert.notEqual(wiki.sections[1].id, wiki.sections[0].sections[0].id)
  assert.equal(wiki.footnotes.length, 1)
  assert.equal(wiki.references.length, 1)
  assert.equal(wiki.infobox.placement, 'after-toc')
  assert.deepEqual(wiki.infobox.fields, [{ label: '0', value: '0' }])
  assert.equal({}.polluted, undefined)
})

test('missing footnotes stay readable and unreferenced notes remain available', () => {
  const { wiki } = parseWikiJson(JSON.stringify({ title: '주석', sections: [
    { title: '내용', blocks: [{ type: 'paragraph', text: '[^missing] 그대로[* 직접 주석] [^shared]' }] },
  ], footnotes: [{ id: 'shared', content: '함께 쓰는 내용' }, { id: 'unused', content: '참고 주석' }] }))
  const result = prepareWiki(wiki)
  assert.equal(result.warnings.length, 1)
  assert.equal(result.sections[0].blocks[0].text[0], '[^missing] 그대로')
  assert.deepEqual(result.footnotes.map(({ content }) => content), ['직접 주석', '함께 쓰는 내용', '참고 주석'])
  assert.deepEqual(result.footnotes[2].references, [])
})

test('limits nesting and section count while still rendering valid content', () => {
  let nested = { title: '마지막', blocks: [] }
  for (let i = 0; i < 25; i++) nested = { title: `목차${i}`, sections: [nested] }
  const { wiki, warnings } = parseWikiJson(JSON.stringify({ title: '깊은 문서', sections: [nested] }))
  validateWiki(wiki)
  assert.ok(warnings.some((warning) => warning.includes('20단계')))
  const many = parseWikiJson(JSON.stringify({ title: '많은 문서', sections: Array.from({ length: 1005 }, () => ({ title: '목차' })) }))
  assert.equal(many.wiki.sections.length, 1000)
  validateWiki(many.wiki)
  assert.ok(many.warnings.some((warning) => warning.includes('1,000')))
})

test('rejects unsafe protocols and validates stored image, link, infobox and source fields', () => {
  for (const url of ['javascript:alert(1)', 'java\nscript:alert(1)', 'data:image/svg+xml,bad', '//evil.test', '\\evil.test', 'https://good.test/ bad']) assert.equal(isSafeUrl(url), false, url)
  for (const url of ['https://example.com', 'http://example.com/a?q=1', '/favicon.svg', './image.png']) assert.equal(isSafeUrl(url), true, url)
  const { wiki } = parseWikiJson('{"title":"검증","sections":[]}')
  for (const patch of [
    { references: [{ url: 'javascript:alert(1)', label: '악성' }] },
    { infobox: { title: '정보', placement: 'after-toc', fields: [], image: { src: 'data:bad', alt: '', caption: '' } } },
    { footnotes: [{ id: 'source', content: '내용', url: 'javascript:bad' }] },
    { sections: [{ id: 'footnote-1', title: '충돌', blocks: [] }] },
    { sections: [{ id: 'image', title: '이미지', blocks: [{ type: 'image', src: 'javascript:bad', alt: '', caption: '' }] }] },
  ]) assert.throws(() => validateWiki({ ...wiki, ...patch }))
})

test('JSON file and pasted input validation report syntax, file and read errors', async () => {
  for (const text of ['', '{broken', '[]', 'null', '{}', '{"title":3}', JSON.stringify({ title: 'a'.repeat(101) })]) assert.throws(() => parseWikiJson(text))
  assert.equal(parseWikiJson('\uFEFF{"title":"BOM"}').wiki.title, 'BOM')
  assert.throws(() => parseWikiJson(' '.repeat(5 * 1024 * 1024 + 1)), /5MB/)
  const parsed = await readWikiJson(new File(['{"title":"파일","sections":[]}'], 'wiki.JSON'))
  assert.equal(parsed.wiki.title, '파일')
  await assert.rejects(readWikiJson(new File(['{}'], 'wiki.txt')), /\.json/)
  await assert.rejects(readWikiJson({ name: 'large.json', size: 5 * 1024 * 1024 + 1, text: () => assert.fail('must not read') }), /5MB/)
  await assert.rejects(readWikiJson({ name: 'broken.json', size: 3, text: async () => { throw new Error('denied') } }), /읽지 못했습니다/)
})

test('imported nested content and metadata survive save/load without replacing saved data on invalid input', () => {
  const originalWindow = globalThis.window
  const values = new Map()
  try {
    globalThis.window = { localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } }
    const { wiki } = parseWikiJson('{"title":"저장","sections":[{"title":"상위","sections":[{"title":"하위"}]}],"infobox":{"fields":[{"label":"항목","value":"값"}]},"footnotes":[{"id":"a","content":"주석"}],"references":[{"url":"https://example.com"}]}')
    saveWiki(wiki)
    assert.deepEqual(loadWiki().wiki, wiki)
    assert.throws(() => parseWikiJson('{bad'))
    assert.deepEqual(loadWiki().wiki, wiki)
    assert.throws(() => saveWiki({ ...wiki, references: [{ url: 'javascript:bad', label: 'bad' }] }))
    assert.deepEqual(loadWiki().wiki, wiki)
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  }
})
