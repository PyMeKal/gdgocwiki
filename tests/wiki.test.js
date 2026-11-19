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
  assert.deepEqual(prepareWiki({ sections: [] }), { sections: [], footnotes: [], infobox: undefined, warnings: [] })
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
