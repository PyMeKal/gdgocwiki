import assert from 'node:assert/strict'
import test from 'node:test'
import { readChatFile } from '../src/utils/readChatFile.js'

test('reads chat text without changing its contents', async () => {
  const text = '[민수] [오후 2:00] 안녕하세요\r\n<script>alert("hello")</script>'
  const file = new File([text], '카카오톡 대화.TXT')
  const result = await readChatFile(file)
  assert.equal(result.file, file)
  assert.equal(result.text, text)
})

test('reads Korean text in supported encodings', async () => {
  const cases = [
    [0xef, 0xbb, 0xbf, ...new TextEncoder().encode('안녕')],
    [0xff, 0xfe, 0x48, 0xc5, 0x55, 0xb1],
    [0xfe, 0xff, 0xc5, 0x48, 0xb1, 0x55],
    [0xbe, 0xc8, 0xb3, 0xe7],
  ]
  for (const bytes of cases) {
    const { text } = await readChatFile(new File([new Uint8Array(bytes)], 'chat.txt'))
    assert.equal(text, '안녕')
  }
})

test('rejects other file types, empty content, binary content, and invalid text', async () => {
  await assert.rejects(readChatFile(new File(['hello'], 'chat.csv')), /\.txt/)
  await assert.rejects(readChatFile(new File([], 'chat.txt')), /비어/)
  await assert.rejects(readChatFile(new File([' \n\t'], 'chat.txt')), /비어/)
  await assert.rejects(readChatFile(new File(['hello\0world'], 'chat.txt')), /텍스트 파일이 아닙니다/)
  await assert.rejects(readChatFile(new File([new Uint8Array([0xff])], 'chat.txt')), /텍스트를 읽을 수 없습니다/)
})

test('accepts files at the 5MB limit', async () => {
  const file = new File(['a'.repeat(5 * 1024 * 1024)], 'chat.txt')
  const result = await readChatFile(file)
  assert.equal(result.file, file)
  assert.equal(result.text.length, file.size)
})

test('reports file read errors', async () => {
  await assert.rejects(readChatFile({
    name: 'unreadable.txt',
    size: 10,
    arrayBuffer: async () => { throw new Error('disk error') },
  }), /파일을 읽지 못했습니다/)
})

test('prepares a UTF-8 upload of at most 5MB while preserving the original file', async () => {
  const header = '테스트 님과 카카오톡 대화\n저장한 날짜 : 2026년 11월 28일\n\n'
  const old = `2026년 11월 27일 오전 9:00, 테스트 : ${'과거'.repeat(900_000)}\n`
  const recent = '2026년 11월 28일 오후 1:00, 테스트 : 최신 대화😀\n두 번째 줄\n'
  const file = new File([header, old, recent], 'chat.txt', { lastModified: 123 })
  const result = await readChatFile(file)
  assert.ok(file.size > 5 * 1024 * 1024)
  assert.equal(result.text, header + recent)
  assert.equal(await result.file.text(), result.text)
  assert.ok(result.file.size <= 5 * 1024 * 1024)
  assert.equal(result.file.name, file.name)
  assert.equal(result.file.lastModified, 123)
  assert.equal(result.originalSize, file.size)
  assert.equal(await file.text(), header + old + recent)
})

test('large UTF-16 files are decoded before trimming and re-encoded as UTF-8', async () => {
  const text = '2026년 11월 28일 오후 1:00, 테스트 : ' + '가'.repeat(3_000_000)
  const bytes = new Uint8Array(2 + text.length * 2)
  bytes.set([0xff, 0xfe])
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < text.length; i += 1) view.setUint16(2 + i * 2, text.charCodeAt(i), true)
  const result = await readChatFile(new File([bytes], 'chat.txt'))
  assert.ok(result.file.size <= 5 * 1024 * 1024)
  assert.ok(result.text.startsWith('2026년 11월 28일 오후 1:00, 테스트 : '))
  assert.ok(result.text.endsWith('가'))
  assert.ok(!result.text.includes('�'))
  assert.equal(await result.file.text(), result.text)
})
