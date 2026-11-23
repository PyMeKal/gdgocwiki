import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultWiki } from './fixtures/wiki.js'
import { prepareWiki, validateWiki } from '../src/utils/wiki.js'

test('footnotes are numbered in reading order across paragraphs, lists and table cells', () => {
  const wiki = { sections: [{ id: 'example', title: '제목', blocks: [
    { type: 'paragraph', text: '본문[* 첫 주석] 이어지는 본문[* 두 번째]' },
    { type: 'list', items: ['목록[* 세 번째]'] },
    { type: 'table', rows: [['표[* 네 번째]', '다른 셀[* 다섯 번째]']] },
  ] }] }
  const original = structuredClone(wiki)
  const { sections, footnotes } = prepareWiki(wiki)
  assert.deepEqual(footnotes.map(({ number, content }) => [number, content]), [
    [1, '첫 주석'], [2, '두 번째'], [3, '세 번째'], [4, '네 번째'], [5, '다섯 번째'],
  ])
  assert.deepEqual(sections[0].blocks[0].text, ['본문', { number: 1, content: '첫 주석', referenceId: 'footnote-ref-1' }, ' 이어지는 본문', { number: 2, content: '두 번째', referenceId: 'footnote-ref-2' }, ''])
  assert.deepEqual(wiki, original)
  wiki.sections[0].blocks[0].text = '수정[* 바뀐 내용] 미완성[* 닫히지 않은 주석'
  assert.equal(prepareWiki(wiki).footnotes[0].content, '바뀐 내용')
  wiki.sections[0].blocks[0].text = '주석을 삭제한 본문'
  assert.equal(prepareWiki(wiki).footnotes[0].content, '세 번째')
  assert.deepEqual(prepareWiki({ sections: [] }), { description: [{ type: 'paragraph', text: [''] }], sections: [], footnotes: [], infobox: undefined, warnings: [] })
})

test('wiki links resolve titles within the current wiki and preserve footnotes and unsafe-looking text', () => {
  const wiki = { description: '소개 [[다른 문서]]', sections: [{ id: 'section-1', title: '개요', blocks: [
    { type: 'paragraph', text: '[[ 다른 문서 ]]와 [[없는 문서]][* 주석] [[javascript:alert(1)]] [[미완성' },
    { type: 'list', items: ['[[다른 문서]]'] },
    { type: 'table', rows: [['[[다른 문서]]']] },
  ] }] }
  const original = structuredClone(wiki)
  const prepared = prepareWiki(wiki, { wikiId: 'team/42', pages: [{ id: 'page/2', title: '다른 문서' }] })
  const target = { type: 'wikiLink', label: '다른 문서', to: '/wiki/team%2F42/pages/page%2F2' }
  assert.deepEqual(prepared.description, [{ type: 'paragraph', text: ['소개 ', target, ''] }])
  const parts = prepared.sections[0].blocks[0].text
  assert.deepEqual(parts[1], target)
  assert.deepEqual(parts[3], { type: 'wikiLink', label: '없는 문서', to: '/wiki/team%2F42?q=%EC%97%86%EB%8A%94%20%EB%AC%B8%EC%84%9C' })
  assert.equal(parts[5].number, 1)
  assert.match(parts[7].to, /^\/wiki\/team%2F42\?q=javascript%3A/)
  assert.equal(parts[8], ' [[미완성')
  assert.deepEqual(prepared.sections[0].blocks[1].items[0][1], target)
  assert.deepEqual(prepared.sections[0].blocks[2].rows[0][0][1], target)
  assert.deepEqual(wiki, original)
  assert.equal(prepareWiki(wiki).description[0].text[0], '소개 [[다른 문서]]')
})

test('validates titles, unique section anchors and editable block shapes', () => {
  validateWiki(defaultWiki)
  validateWiki({ ...defaultWiki, sections: [] })
  const invalid = [
    null,
    { ...defaultWiki, title: ' ' },
    { ...defaultWiki, title: 'a'.repeat(101) },
    { ...defaultWiki, description: null },
    { ...defaultWiki, sections: null },
    { ...defaultWiki, sections: [defaultWiki.sections[0], defaultWiki.sections[0]] },
    ...[null, { id: 'bad anchor', title: '제목', blocks: [] }, { id: 'okay', title: null, blocks: [] },
      ...[null, { type: 'html', text: '<script>' }, { type: 'list', items: [1] },
        { type: 'table', caption: '표', header: true, rows: [] },
        { type: 'table', caption: '표', header: false, rows: [['a', 'b'], ['a']] },
      ].map((block) => ({ id: 'okay', title: '제목', blocks: [block] })),
    ].map((section) => ({ ...defaultWiki, sections: [section] })),
  ]
  for (const wiki of invalid) assert.throws(() => validateWiki(wiki))
})
