import { useState } from 'react'
import { Link, useLoaderData, useParams, useSearchParams } from 'react-router'
import CopyWikiUrlButton from '../components/CopyWikiUrlButton.jsx'
import ButtonLink from '../components/ButtonLink.jsx'
import { wikiPagePath, wikiPath } from '../utils/paths.js'
import { filterPages } from '../utils/filterPages.js'

export default function WikiHomePage() {
  const { wikiId } = useParams()
  const { wiki, pages } = useLoaderData()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [sort, setSort] = useState('newest')
  const visiblePages = filterPages(pages, query, sort)

  return (
    <>
      <title>{`${wiki.name} · 위키 홈 · 대화위키`}</title>
      <main id="main" className="container form-page wiki-home-page">
        <p className="overview-label"><img src="/design/back.svg" alt="" />My wikis</p>
        <section className="wiki-overview" aria-labelledby="wiki-name">
          <div className="section-heading"><span className="wiki-visibility">{wiki.hasPassword ? 'PRIVATE WIKI' : 'PUBLIC WIKI'}</span><CopyWikiUrlButton key={wikiId} wikiId={wikiId} iconOnly /></div>
          <h1 id="wiki-name">{wiki.name}</h1>
          <p>함께 나눈 대화와 지식을 한곳에 모아보세요.</p>
          <div className="wiki-statistics"><div><strong>{pages.length}</strong><span>articles</span></div><div><strong>{new Set(pages.map((page) => page.category).filter(Boolean)).size}</strong><span>categories</span></div></div>
        </section>
        <label className="wiki-search"><img src="/design/search.svg" alt="" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this wiki" aria-label="위키 문서 검색" /></label>
        <p className="all-articles">All articles</p>
        <section aria-labelledby="pages-title">
          <div className="section-heading"><h2 id="pages-title">Your conversation, organized</h2><span className="muted small" role="status">{visiblePages.length} articles</span></div>
          <div className="sort-row"><label><span className="sr-only">문서 정렬</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Last modified ↓</option><option value="oldest">Last modified ↑</option><option value="title">Title A–Z</option></select></label><span>{sort === 'title' ? 'Alphabetical' : sort === 'oldest' ? 'Oldest first' : 'Newest first'}</span></div>
          {visiblePages.length ? <ul className="wiki-page-list">{visiblePages.map((page, index) => <li key={page.id}><Link to={wikiPagePath(wikiId, page.id)}><span className="article-number">{String(index + 1).padStart(2, '0')}</span><span className="article-summary"><strong>{page.title}</strong>{Number.isFinite(Date.parse(page.updatedAt)) && <time dateTime={page.updatedAt}>Modified {new Date(page.updatedAt).toLocaleDateString('ko-KR')}</time>}{page.category && <small>Folder: {page.category}</small>}</span><img src="/design/arrow.svg" alt="" /></Link></li>)}</ul> : <p className="empty-results">{pages.length ? '검색 결과가 없습니다.' : '아직 생성된 문서가 없습니다.'}</p>}
        </section>
        <div className="actions"><ButtonLink to={`${wikiPath(wikiId)}/import`}>새 대화 올리기</ButtonLink><ButtonLink to={`${wikiPath(wikiId)}/preview`}>브라우저 문서 미리보기</ButtonLink></div>
      </main>
    </>
  )
}
