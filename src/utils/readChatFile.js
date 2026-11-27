export async function readChatFile(file) {
  if (!/\.txt$/i.test(file.name)) {
    throw new Error('카카오톡에서 내보낸 .txt 파일을 선택해주세요.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('5MB 이하의 파일을 선택해주세요.')
  }

  let bytes
  try {
    bytes = new Uint8Array(await file.arrayBuffer())
  } catch {
    throw new Error('파일을 읽지 못했습니다. 다시 선택해주세요.')
  }

  let text
  try {
    const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le'
      : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8'
    text = new TextDecoder(encoding, { fatal: true }).decode(bytes)
  } catch {
    try {
      text = new TextDecoder('euc-kr', { fatal: true }).decode(bytes)
    } catch {
      throw new Error('텍스트를 읽을 수 없습니다. 카카오톡에서 대화를 다시 내보내주세요.')
    }
  }

  if (!text.trim()) throw new Error('내용이 비어 있는 파일입니다.')
  if (text.includes('\0')) throw new Error('텍스트 파일이 아닙니다. 대화 .txt 파일을 선택해주세요.')

  return { file, text }
}
