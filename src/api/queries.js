import { QueryClient, useQueries } from '@tanstack/react-query'
import { getGeneration, getPage, getPages, getWiki } from './wikis.js'
import { getPageSection, parseWikiData } from '../utils/importWiki.js'
import { getRecentWikiIds } from '../utils/recentWikis.js'

export function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: {
    staleTime: 30_000,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  } } })
}

export const wikiQuery = (wikiId) => ({
  queryKey: ['wiki', wikiId],
  queryFn: () => getWiki(wikiId),
})

export const pageQuery = (wikiId, pageId) => ({
  queryKey: ['wiki', wikiId, 'pages', pageId],
  queryFn: async () => {
    const page = await getPage(wikiId, pageId)
    const { wiki: document } = parseWikiData(page)
    return { page, document }
  },
})

// 내부 링크에는 제목과 ID만 필요하므로 각 문서의 상세 조회는 생략합니다.
export const pageTitlesQuery = (wikiId) => ({
  queryKey: ['wiki', wikiId, 'page-titles'],
  queryFn: async () => (await getPages(wikiId)).pages,
})

export const pagesQuery = (wikiId, client) => ({
  queryKey: ['wiki', wikiId, 'pages'],
  queryFn: async () => {
    const { pages } = await getPages(wikiId)
    // 목록에 없는 수정일을 보충할 때 상세 조회 캐시도 함께 채웁니다.
    return Promise.all(pages.map(async (page) => page.updatedAt ? page : {
      ...page, updatedAt: (await client.fetchQuery(pageQuery(wikiId, page.id))).page.updatedAt,
    }))
  },
})

export const editPageQuery = (wikiId, pageId, sectionId) => ({
  queryKey: ['wiki', wikiId, 'pages', pageId, 'edit', sectionId],
  // 편집을 새로 열 때는 최신 버전으로 시작하고, 편집 중인 스냅샷은 유지합니다.
  staleTime: 0,
  gcTime: 0,
  queryFn: async () => {
    const page = await getPage(wikiId, pageId)
    parseWikiData(page)
    if (!Number.isInteger(page.version) || page.version <= 0) throw new Error('문서 버전을 불러오지 못했습니다. 다시 시도해주세요.')
    const editContent = sectionId === null ? page.content : getPageSection(page.content, sectionId).content
    return { page, editContent }
  },
})

export const generationQuery = (wikiId, jobId, client) => ({
  queryKey: ['wiki', wikiId, 'generations', jobId],
  queryFn: async () => {
    const job = await getGeneration(wikiId, jobId)
    if (!['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(job.status)) throw new Error('생성 작업 상태가 올바르지 않습니다.')
    if (job.status === 'COMPLETED') await client.invalidateQueries({ queryKey: ['wiki', wikiId, 'pages'] })
    return job
  },
  refetchInterval: (query) => !query.state.error && ['PENDING', 'PROCESSING'].includes(query.state.data?.status) ? 1000 : false,
})

export function useRecentWikis(wikiId, optional = false) {
  // shortcut: 전체 목록 API가 없어 이 브라우저에서 기록한 위키만 조회합니다.
  const ids = [...new Set([wikiId, ...getRecentWikiIds()].filter(Boolean))]
  const results = useQueries({ queries: ids.map(wikiQuery) })
  const unavailable = (result) => result.error?.status === 401 || result.error?.status === 404
  return {
    wikis: results.filter((result) => result.data && !unavailable(result)).map((result) => result.data),
    isPending: results.some((result) => result.isPending),
    error: optional ? null : results.find((result) => result.error && !unavailable(result))?.error,
  }
}

export async function refreshWiki(client, wikiId) {
  const queryKey = ['wiki', wikiId]
  await client.cancelQueries({ queryKey })
  await client.invalidateQueries({ queryKey })
}
