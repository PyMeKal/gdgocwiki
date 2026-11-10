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

test('rejects large files before reading and reports file read errors', async () => {
  await assert.rejects(readChatFile({
    name: 'large.txt',
    size: 10 * 1024 * 1024 + 1,
    arrayBuffer: () => assert.fail('oversized file must not be read'),
  }), /10MB/)

  await assert.rejects(readChatFile({
    name: 'unreadable.txt',
    size: 10,
    arrayBuffer: async () => { throw new Error('disk error') },
  }), /파일을 읽지 못했습니다/)
})
