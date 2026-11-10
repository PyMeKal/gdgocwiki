import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultWiki } from '../src/data/wiki.js'
import { loadWiki, prepareWiki, saveWiki, validateWiki } from '../src/utils/wiki.js'

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
  assert.deepEqual(sections[0].blocks[0].text, ['본문', footnotes[0], ' 이어지는 본문', footnotes[1], ''])
  assert.deepEqual(wiki, original)
  wiki.sections[0].blocks[0].text = '수정[* 바뀐 내용] 미완성[* 닫히지 않은 주석'
  assert.equal(prepareWiki(wiki).footnotes[0].content, '바뀐 내용')
  wiki.sections[0].blocks[0].text = '주석을 삭제한 본문'
  assert.equal(prepareWiki(wiki).footnotes[0].content, '세 번째')
  assert.deepEqual(prepareWiki({ sections: [] }), { sections: [], footnotes: [] })
})

test('validates titles, unique section anchors and editable block shapes', () => {
  validateWiki(defaultWiki)
  const invalid = [
    null,
    { ...defaultWiki, title: ' ' },
    { ...defaultWiki, title: 'a'.repeat(101) },
    { ...defaultWiki, description: null },
    { ...defaultWiki, sections: [] },
    { ...defaultWiki, sections: [defaultWiki.sections[0], defaultWiki.sections[0]] },
    ...[null, { id: 'bad anchor', title: '제목', blocks: [] }, { id: 'okay', title: ' ', blocks: [] },
      ...[null, { type: 'html', text: '<script>' }, { type: 'list', items: [1] },
        { type: 'table', caption: '표', header: true, rows: [] },
        { type: 'table', caption: '표', header: false, rows: [['a', 'b'], ['a']] },
      ].map((block) => ({ id: 'okay', title: '제목', blocks: [block] })),
    ].map((section) => ({ ...defaultWiki, sections: [section] })),
  ]
  for (const wiki of invalid) assert.throws(() => validateWiki(wiki))
})

test('edits persist across loads, bad storage falls back and failed saves report errors', () => {
  const originalWindow = globalThis.window
  const values = new Map()
  try {
    globalThis.window = { localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    } }
    assert.deepEqual(loadWiki(), { wiki: defaultWiki, error: '' })
    const edited = structuredClone(defaultWiki)
    edited.title = '수정한 여행'
    edited.sections.reverse()
    edited.sections[0].title = '변경한 목차'
    edited.sections[0].blocks[0].items[0] = '수정한 내용[* 수정한 주석]'
    saveWiki(edited)
    assert.deepEqual(loadWiki(), { wiki: edited, error: '' })

    const stored = [...values.values()][0]
    assert.throws(() => saveWiki({ ...edited, title: ' ' }))
    assert.equal([...values.values()][0], stored)

    for (const value of ['{invalid', '{}']) {
      globalThis.window.localStorage.getItem = () => value
      const loaded = loadWiki()
      assert.equal(loaded.wiki, defaultWiki)
      assert.match(loaded.error, /불러오지 못해/)
    }
    globalThis.window.localStorage.getItem = () => { throw new Error('denied') }
    globalThis.window.localStorage.setItem = () => { throw new Error('quota') }
    assert.match(loadWiki().error, /불러오지 못해/)
    assert.throws(() => saveWiki(edited), /입력한 내용은 이 화면에 남아/)
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  }
})
