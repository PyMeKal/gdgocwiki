export const DEMO_WIKI_ID = '550e8400-e29b-41d4-a716-446655440000'
const timestamp = '2026-11-05T12:00:00Z'

export const generationPages = [
  {
    id: 'page_001', title: '2026년 부산 여행', category: 'EVENT',
    content: '## 개요\n친구들과 부산에 가기로 계획한 여행이다.\n\n## 일정\n2026년 12월 20일',
  },
  { id: 'page_002', title: '김철수', category: 'PERSON', content: '## 개요\n부산 여행에 참여하는 친구이다.' },
  {
    id: 'page_003', title: '김철수/논란 및 사건사고', category: 'INCIDENT',
    content: '## 개요\n여행을 준비하며 생긴 에피소드를 정리한 문서이다.',
  },
]

const seed = {
  wikis: [{ id: DEMO_WIKI_ID, name: '우리들의 위키', password: '1234', createdAt: timestamp }],
  chats: [{
    id: 'chat_001', wikiId: DEMO_WIKI_ID, fileName: 'KakaoTalk_Chat.txt',
    messageCount: 1523, uploadedAt: timestamp,
  }],
  pages: generationPages.map((page) => ({
    ...page, wikiId: DEMO_WIKI_ID, version: 3, updatedAt: timestamp, generationKey: page.id,
  })),
  jobs: [],
  sessions: {},
}

// shortcut: 메모리 데이터는 새로고침하면 초기화된다. 영속 저장이 필요할 때 실제 서버로 교체한다.
export const db = structuredClone(seed)

export function resetDb() {
  Object.assign(db, structuredClone(seed))
}
