export const MAX_CHAT_FILE_BYTES = 5 * 1024 * 1024

const encoder = new TextEncoder()

function tailWithinBytes(text, maxBytes) {
  const bytes = encoder.encode(text)
  let start = Math.max(0, bytes.length - maxBytes)
  // UTF-8 문자의 중간 바이트에서 시작하지 않습니다.
  while (start < bytes.length && (bytes[start] & 0xc0) === 0x80) start += 1
  return new TextDecoder().decode(bytes.subarray(start))
}

export function trimChatText(text, maxBytes = MAX_CHAT_FILE_BYTES) {
  if (!Number.isInteger(maxBytes) || maxBytes <= 0) throw new Error('파일 크기 한도를 확인해주세요.')
  if (encoder.encode(text).length <= maxBytes) return text

  // 모바일 내보내기의 날짜·메시지와 PC 내보내기의 날짜 구분선·메시지입니다.
  const entries = /^(?:\d{4}년 \d{1,2}월 \d{1,2}일[^\r\n]*|\d{4}[.\-/] ?\d{1,2}[.\-/] ?\d{1,2}[^\r\n]*|-{2,} \d{4}년[^\r\n]*|\[[^\r\n]+?\] \[(?:오전|오후|AM|PM)?\s*\d{1,2}:\d{2}\] ?)/gm
  const starts = []
  let header = ''
  let date = ''
  let first = true
  for (const match of text.matchAll(entries)) {
    if (first) {
      header = text.slice(0, match.index)
      first = false
    }
    const line = match[0]
    if (!line.startsWith('[') && !/, /.test(line)) {
      date = `${line}\n`
    } else {
      starts.push({ index: match.index, date })
    }
  }

  const candidate = (entry) => header + entry.date + text.slice(entry.index)
  // 한도에 들어가는 가장 오래된 메시지부터 원래 순서대로 남깁니다.
  let low = 0
  let high = starts.length
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (encoder.encode(candidate(starts[mid])).length <= maxBytes) high = mid
    else low = mid + 1
  }
  if (low < starts.length) return candidate(starts[low])

  // 메시지 하나가 한도를 넘어도 날짜·발신자와 내용의 끝부분을 남깁니다.
  const latest = starts.at(-1)
  if (latest) {
    const message = text.slice(latest.index)
    const prefix = message.match(/^(?:\[[^\r\n]+?\] \[[^\r\n]+?\] ?|[^\r\n]+?, [^\r\n]+? : ?)/)?.[0] ?? ''
    const context = header + latest.date + prefix
    const remaining = maxBytes - encoder.encode(context).length
    if (remaining > 0) return context + tailWithinBytes(message.slice(prefix.length), remaining)
  }

  // 알 수 없는 형식은 뒤쪽의 줄을 남기고, 개행이 없으면 문자 경계에서 자릅니다.
  const tail = tailWithinBytes(text, maxBytes)
  if (!tail.trim()) return trimChatText(text.trimEnd(), maxBytes)
  if (text[text.length - tail.length - 1] === '\n') return tail
  const newline = tail.indexOf('\n')
  return newline >= 0 && tail.slice(newline + 1).trim() ? tail.slice(newline + 1) : tail
}
