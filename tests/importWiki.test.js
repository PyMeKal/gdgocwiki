import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { getPageSection, parseWikiData } from '../src/utils/importWiki.js'
import { prepareWiki, validateWiki } from '../src/utils/wiki.js'
import { isSafeUrl } from '../src/utils/wikiSchema.js'

const page = (content, extra = {}) => ({ title: '문서', category: 'EVENT', content, ...extra })

test('API JSON becomes a WikiDocument with numbered sections and category', async () => {
  const text = await readFile(new URL('../public/examples/wiki.json', import.meta.url), 'utf8')
  const raw = JSON.parse(text)
  const { wiki, warnings } = parseWikiData(raw)
  assert.deepEqual(warnings, [])
  assert.equal(wiki.title, raw.title)
  assert.equal(wiki.category, raw.category)
  assert.deepEqual(wiki.sections.map(({ title }) => title), ['개요', '일정', '참고'])
  assert.match(wiki.sections[0].blocks[0].text, /이 문단도 다음 제목 전까지/)
  assert.match(wiki.sections[1].blocks[0].text, /- 오전: 모임\n- 오후: 여행/)
  assert.deepEqual(prepareWiki(wiki).sections.map(({ number }) => number), ['1', '2', '3'])
  validateWiki(wiki)
})

test('only level-two heading lines split sections and every body character is preserved', () => {
  const body = '  첫 문단\r\n\r\n- 목록\r\n### 하위 제목은 본문\r\n문장 속 ## 기호\r\n'
  const raw = page(`머리말\r\n##개요\r\n${body}## 다음\r\n##마지막`)
  const copy = structuredClone(raw)
  const { wiki } = parseWikiData(raw)
  assert.equal(wiki.description, '머리말\r\n')
  assert.deepEqual(wiki.sections.map(({ title }) => title), ['개요', '다음', '마지막'])
  assert.equal(wiki.sections[0].blocks[0].text, body)
  assert.equal(wiki.sections[1].blocks[0].text, '')
  assert.equal(wiki.sections[2].blocks[0].text, '')
  assert.deepEqual(raw, copy)
  const repeated = parseWikiData(page('##동일\n하나\n##동일\n둘\n'))
  assert.equal(new Set(repeated.wiki.sections.map(({ id }) => id)).size, 2)
  assert.equal(parseWikiData(page('##개요\r본문\r##끝\r끝 본문')).wiki.sections[1].blocks[0].text, '끝 본문')
})

test('unheaded or empty content is preserved and unsupported fields are ignored', () => {
  const { wiki } = parseWikiData(page('제목 없는 본문\n  그대로', {
    description: '가져오지 않음', sections: [{ title: '가짜 섹션' }],
    infobox: { title: '가짜 정보' }, footnotes: [{ id: 'a', content: '가짜 주석' }],
    references: [{ url: 'javascript:bad' }],
  }))
  assert.equal(wiki.description, '제목 없는 본문\n  그대로')
  assert.deepEqual(wiki.sections, [])
  for (const key of ['infobox', 'footnotes', 'references']) assert.equal(wiki[key], undefined)
  assert.deepEqual(parseWikiData(page('')).wiki.sections, [])
  assert.equal(parseWikiData({ title: '분류 없음', content: '' }).wiki.category, '')
})

test('section editing uses the renderer boundaries and preserves the exact original source', () => {
  const content = '소개\r\n## 동일\r\n첫 본문\r\n### 하위 제목\r\n##동일\r\n둘째 본문\r\n##마지막'
  const first = getPageSection(content, 'section-1')
  assert.equal(first.content, '## 동일\r\n첫 본문\r\n### 하위 제목\r\n')
  assert.equal(getPageSection(content, 'section-2').content, '##동일\r\n둘째 본문\r\n')
  assert.equal(getPageSection(content, 'section-3').content, '##마지막')
  assert.equal(content.slice(first.start, first.end), first.content)
  for (const id of ['', 'section-0', 'section-4', 'section-01', 'invalid']) assert.throws(() => getPageSection(content, id), /섹션을 찾을 수 없습니다/)
  assert.throws(() => getPageSection('', 'section-1'), /섹션을 찾을 수 없습니다/)
})

test('invalid API fields and oversized content fail before replacing a document', () => {
  for (const raw of [null, [], {}, page('', { title: 1 }), page('', { title: ' ' }), page('', { title: 'a'.repeat(101) }),
    page(null), page(123), page('', { category: {} })]) assert.throws(() => parseWikiData(raw))
  assert.throws(() => parseWikiData(page('a'.repeat(5 * 1024 * 1024 + 1))), /5MB/)
  assert.equal(parseWikiData(page('##제목\n'.repeat(1000))).wiki.sections.length, 1000)
  assert.throws(() => parseWikiData(page('##제목\n'.repeat(1001))), /1,000/)
})

test('rejects unsafe protocols and validates stored image, link, infobox and source fields', () => {
  for (const url of ['javascript:alert(1)', 'java\nscript:alert(1)', 'data:image/svg+xml,bad', '//evil.test', '\\evil.test', 'https://good.test/ bad']) assert.equal(isSafeUrl(url), false, url)
  for (const url of ['https://example.com', 'http://example.com/a?q=1', '/favicon.svg', './image.png']) assert.equal(isSafeUrl(url), true, url)
  const { wiki } = parseWikiData(page(''))
  for (const patch of [
    { references: [{ url: 'javascript:bad', label: '악성' }] },
    { infobox: { title: '정보', placement: 'after-toc', fields: [], image: { src: 'data:bad', alt: '', caption: '' } } },
    { footnotes: [{ id: 'source', content: '내용', url: 'javascript:bad' }] },
    { sections: [{ id: 'footnote-1', title: '충돌', blocks: [] }] },
    { sections: [{ id: 'image', title: '이미지', blocks: [{ type: 'image', src: 'javascript:bad', alt: '', caption: '' }] }] },
  ]) assert.throws(() => validateWiki({ ...wiki, ...patch }))
})
