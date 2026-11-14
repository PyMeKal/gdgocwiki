import { parseWikiData } from '../utils/importWiki.js'

// shortcut: 예시의 [문서: 제목 | 분류] 구간을 추출합니다. 실제 AI 연결 시 이 변환기를 교체합니다.
export function convertChat(text) {
  const pages = []
  let page
  for (const line of text.split(/\r\n|\n|\r/)) {
    const heading = line.match(/^\[문서: (.+?) \| ([A-Z]+)\]$/)
    if (heading) {
      if (pages.length === 1000) throw new Error('문서는 최대 1,000개까지 지원합니다.')
      page = { title: heading[1], category: heading[2], content: '' }
      pages.push(page)
    } else if (page) {
      const message = line.replace(/^\[.*?\] \[.*?\] /, '')
      page.content += `${message}\n`
    }
  }
  if (!pages.length) pages.push({ title: '대화 기록', category: 'EVENT', content: `##개요\n${text}` })
  for (const page of pages) parseWikiData(page)
  return pages
}
