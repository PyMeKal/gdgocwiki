import assert from 'node:assert/strict'
import test from 'node:test'
import { trimChatText } from '../src/utils/trimChatText.js'

const size = text => new TextEncoder().encode(text).length

test('shows which old messages are removed and the exact before/after bytes', (t) => {
  const header = '테스트 님과 카카오톡 대화\n저장한 날짜 : 2026년 11월 28일\n\n'
  const messages = [
    '2026년 11월 26일 오전 9:00, 테스트 : 오래된 대화\n',
    '2026년 11월 27일 오전 9:00, 테스트 : 어제 대화\n',
    '2026년 11월 28일 오전 9:00, 테스트 : 최신 대화😀\n이어지는 줄\n',
  ]
  const input = header + messages.join('')
  const expected = header + messages.slice(1).join('')
  const limit = size(expected)
  const output = trimChatText(input, limit)
  assert.equal(output, expected)
  t.diagnostic(`한도 ${limit}바이트 / 원본 ${size(input)}바이트 → 결과 ${size(output)}바이트`)
  t.diagnostic(`처리: 가장 오래된 메시지 1개 제거 → 최근 메시지 2개와 여러 줄 본문 유지`)
  t.diagnostic(`원본:\n${input}\n결과:\n${output}`)
})

test('preserves the PC export header and the date of the first retained message', () => {
  const header = '테스트 님과 카카오톡 대화\n저장한 날짜 : 2026-11-28\n\n'
  const oldDate = '--------------- 2026년 11월 27일 금요일 ---------------\n'
  const date = '--------------- 2026년 11월 28일 토요일 ---------------\n'
  const old = '[테스트] [오후 11:00] 어제\n'
  const first = '[테스트] [오전 9:00] 오늘의 첫 대화\n'
  const latest = '[테스트] [오후 1:00] 최신😀\n여러 줄 내용\n'
  const expected = header + date + latest
  assert.equal(trimChatText(header + oldDate + old + date + first + latest, size(expected)), expected)
})

test('preserves mobile date context when trimming within a day', () => {
  const date = '2026년 11월 28일 오후 1:00\r\n'
  const old = '2026년 11월 28일 오후 1:00, 테스트 : 오래된 대화\r\n'
  const latest = '2026년 11월 28일 오후 2:00, 테스트 : 최근\r\n'
  const result = trimChatText(date + old + latest, size(date + latest))
  assert.equal(result, date.replace('\r\n', '\n') + latest)
})

test('keeps small text unchanged and handles UTF-8 boundaries and unknown formats', () => {
  const text = '가나다😀'
  assert.equal(trimChatText(text, size(text)), text)
  assert.equal(trimChatText('과거\n최근😀\n', size('최근😀\n') + 1), '최근😀\n')
  assert.equal(trimChatText('과거\n최근\n최신\n', size('최근\n최신\n')), '최근\n최신\n')
  assert.equal(trimChatText('최근' + ' '.repeat(100), 10), '최근')
  assert.equal(trimChatText('가'.repeat(10) + '😀', 7), '가😀')
  assert.equal(trimChatText('가'.repeat(10) + '😀', 6), '😀')
  assert.throws(() => trimChatText(text, 0), /한도/)
})

test('keeps the sender and timestamp with the tail of one oversized message', () => {
  const prefix = '2026년 11월 28일 오후 1:00, 테스트 : '
  const result = trimChatText(prefix + '가'.repeat(100) + '끝😀', size(prefix + '가끝😀'))
  assert.equal(result, prefix + '가끝😀')
})
