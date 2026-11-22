import Skeleton from 'react-loading-skeleton'
import { useState } from 'react'
import { Link, useLoaderData, useParams, useSearchParams } from 'react-router'
import CopyWikiUrlButton from '../components/CopyWikiUrlButton.jsx'
import { wikiPagePath} from '../utils/paths.js'
import { filterPages } from '../utils/filterPages.js'

export default function WikiHomePage({ loading = false, wikiId: pendingWikiId, mainId = 'main' }) {
  const routeParams = useParams()
  const wikiId = pendingWikiId ?? routeParams.wikiId
  const data = useLoaderData()
  const { wiki, pages = [] } = loading ? {} : data
  const prefix = loading ? `${mainId}-` : ''
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [sort, setSort] = useState('newest')
  const [category, setCategory] = useState('')
  const categories = [...new Set(pages.map((page) => page.category).filter(Boolean))]
  const visiblePages = filterPages(pages, query, sort, category)

  return (
    <>
      <title>{loading ? '위키 홈 · 대화위키' : `${wiki.name} · 위키 홈 · 대화위키`}</title>
      <main id={mainId} className="container form-page wiki-home-page" aria-busy={loading}>
        <Link className="overview-label" to="/wikis"><img src="/design/back.svg" alt="" />My wikis</Link>
        <section className="wiki-overview" aria-labelledby={`${prefix}wiki-name`}>
          <div className="section-heading"><span className="wiki-visibility">{loading ? <Skeleton width={80} /> : wiki.hasPassword ? 'PRIVATE WIKI' : 'PUBLIC WIKI'}</span><CopyWikiUrlButton key={wikiId} wikiId={wikiId} iconOnly /></div>
          <h1 id={`${prefix}wiki-name`}>{loading ? <Skeleton width="60%" /> : wiki.name}</h1>
          <p>함께 나눈 대화와 지식을 한곳에 모아보세요.</p>
          <div className="wiki-statistics"><div><strong>{loading ? <Skeleton width={30} /> : pages.length}</strong><span>articles</span></div><div><strong>{loading ? <Skeleton width={30} /> : categories.length}</strong><span>categories</span></div></div>
        </section>
        <label className="wiki-search"><img src="/design/search.svg" alt="" /><input type="search" disabled={loading} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this wiki" aria-label="위키 문서 검색" /></label>
        <div className="article-categories" role="group" aria-label="문서 카테고리 필터">
          <button type="button" disabled={loading} aria-pressed={category === ''} onClick={() => setCategory('')}>All articles</button>
          {categories.map((name) => <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}
        </div>
        <section aria-labelledby={`${prefix}pages-title`}>
          <div className="section-heading"><h2 id={`${prefix}pages-title`}>Your conversation, organized</h2><span className="muted small" role="status">{loading ? <Skeleton width={25} inline /> : visiblePages.length} articles</span></div>
          <div className="sort-row"><label><span className="sr-only">문서 정렬</span><select disabled={loading} value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Last modified ↓</option><option value="oldest">Last modified ↑</option><option value="title">Title A–Z</option></select></label></div>
          {loading ? <ul className="wiki-page-list" aria-label="문서 목록 로딩 중">{[0, 1, 2, 3].map((row) => <li key={row}><div className="wiki-page-placeholder"><span className="article-number">{String(row + 1).padStart(2, '0')}</span><span className="article-summary"><strong><Skeleton width="65%" /></strong><small><Skeleton width="45%" /></small><small><Skeleton width="30%" /></small></span><img src="/design/arrow.svg" alt="" /></div></li>)}</ul> : visiblePages.length ? <ul className="wiki-page-list">{visiblePages.map((page, index) => <li key={page.id}><Link to={wikiPagePath(wikiId, page.id)}><span className="article-number">{String(index + 1).padStart(2, '0')}</span><span className="article-summary"><strong>{page.title}</strong>{Number.isFinite(Date.parse(page.updatedAt)) && <time dateTime={page.updatedAt}>Modified {new Date(page.updatedAt).toLocaleDateString('ko-KR')}</time>}{page.category && <small>Folder: {page.category}</small>}</span><img src="/design/arrow.svg" alt="" /></Link></li>)}</ul> : <p className="empty-results">{pages.length ? '검색 결과가 없습니다.' : '아직 생성된 문서가 없습니다.'}</p>}
        </section>
        
      </main>
    </>
  )
}
