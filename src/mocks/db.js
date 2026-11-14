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

// 브라우저에서는 요청 경계에서 IndexedDB와 동기화하고, Node 테스트는 메모리 DB를 사용합니다.
export const db = structuredClone(seed)

export function resetDb() {
  Object.assign(db, structuredClone(seed))
}

let storage
let pending = Promise.resolve()

export function configureDbStorage(value) {
  storage = value
}

function restoreSnapshot(snapshot) {
  if (!snapshot || !['wikis', 'chats', 'pages', 'jobs'].every((key) =>
    Array.isArray(snapshot[key]) && snapshot[key].every((record) => record && typeof record === 'object')) ||
    !snapshot.sessions || typeof snapshot.sessions !== 'object' || Array.isArray(snapshot.sessions) ||
    !Object.values(snapshot.sessions).every((value) => typeof value === 'string') ||
    !snapshot.wikis.every((wiki) => typeof wiki.id === 'string' && typeof wiki.name === 'string' && typeof wiki.password === 'string') ||
    !snapshot.pages.every((page) => typeof page.id === 'string' && typeof page.wikiId === 'string' && typeof page.title === 'string' && typeof page.content === 'string') ||
    !snapshot.chats.every((chat) => typeof chat.id === 'string' && typeof chat.wikiId === 'string') ||
    !snapshot.jobs.every((job) => typeof job.jobId === 'string' && typeof job.wikiId === 'string' && Array.isArray(job.chatIds))) {
    throw new Error('저장된 가상 DB 형식을 확인해주세요. 기존 데이터는 유지했습니다.')
  }
  for (const key of Object.keys(seed)) db[key] = snapshot[key]
}

export function withDb(operation) {
  if (!storage) return operation()
  const currentStorage = storage
  const execute = async () => {
    const saved = await currentStorage.read()
    restoreSnapshot(saved ?? structuredClone(seed))
    const before = structuredClone(db)
    try {
      const response = await operation()
      if (response.ok) await currentStorage.write(structuredClone(db))
      else restoreSnapshot(before)
      return response
    } catch (error) {
      restoreSnapshot(before)
      throw error
    }
  }
  const result = pending.then(() => currentStorage.run ? currentStorage.run(execute) : execute())
  pending = result.catch(() => {})
  return result
}
