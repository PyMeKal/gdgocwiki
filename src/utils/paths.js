export const DEFAULT_WIKI_ID = '550e8400-e29b-41d4-a716-446655440000'
export const DEFAULT_PAGE_ID = 'page_001'

export const wikiPath = (wikiId = DEFAULT_WIKI_ID) => `/wiki/${encodeURIComponent(wikiId)}`
export const wikiPagePath = (wikiId, pagesId = DEFAULT_PAGE_ID) => `${wikiPath(wikiId)}/pages/${encodeURIComponent(pagesId)}`
