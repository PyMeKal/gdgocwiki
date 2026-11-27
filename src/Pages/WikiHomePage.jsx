import { useQuery, useQueryClient } from '@tanstack/react-query'
import { wikiQuery, pagesQuery } from '../api/queries.js'
import WikiApiError from '../components/common/WikiApiError.jsx'
import Skeleton from 'react-loading-skeleton'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import CopyWikiUrlButton from '../components/common/CopyWikiUrlButton.jsx'
import { wikiPagePath} from '../utils/paths.js'
import { filterPages } from '../utils/filterPages.js'

export default function WikiHomePage() {
  const { wikiId } = useParams()
  const client = useQueryClient()
  const wikiResult = useQuery(wikiQuery(wikiId))
  const pagesResult = useQuery(pagesQuery(wikiId, client))
  const wiki = wikiResult.data
  const pages = pagesResult.data ?? []
  const wikiLoading = wikiResult.isPending
  const pagesLoading = pagesResult.isPending
  const loading = wikiLoading || pagesLoading
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [sort, setSort] = useState('newest')
  const [category, setCategory] = useState('')
  const categories = [...new Set(pages.map((page) => page.category).filter(Boolean))]
  const visiblePages = filterPages(pages, query, sort, category)

  const error = wikiResult.error || pagesResult.error
  if (error) return <WikiApiError error={error} onRetry={() => client.resetQueries({ queryKey: ['wiki', wikiId] })} />

  return (
    <>
      <title>{wikiLoading ? '위키 홈 · 대화위키' : `${wiki.name} · 위키 홈 · 대화위키`}</title>
      <main id="main" className="container form-page wiki-home-page" aria-busy={loading}>
        <Link className="overview-label" to="/wikis"><img src="/design/back.svg" alt="" />내 위키</Link>
        <section className="wiki-overview" aria-labelledby="wiki-name">
          <div className="section-heading"><span className="wiki-visibility">{wikiLoading ? <Skeleton width={80} /> : wiki.hasPassword ? '비공개 위키' : '공개 위키'}</span><CopyWikiUrlButton key={wikiId} wikiId={wikiId} iconOnly /></div>
          <h1 id="wiki-name" title={wiki?.name}>{wikiLoading ? <Skeleton width="60%" /> : wiki.name}</h1>
          <p>함께 나눈 대화와 지식을 한곳에 모아보세요.</p>
          <div className="wiki-statistics"><div><strong>{pagesLoading ? <Skeleton width={30} /> : pages.length}</strong><span>문서</span></div><div><strong>{pagesLoading ? <Skeleton width={30} /> : categories.length}</strong><span>분류</span></div></div>
        </section>
        <label className="wiki-search"><img src="/design/search.svg" alt="" /><input type="search" disabled={pagesLoading} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이 위키에서 검색" aria-label="위키 문서 검색" /></label>
        <div className="article-categories" role="group" aria-label="문서 카테고리 필터">
          <button type="button" disabled={pagesLoading} aria-pressed={category === ''} onClick={() => setCategory('')}>전체 문서</button>
          {pagesLoading ? [0, 1, 2].map((row) => <span className="category-placeholder" aria-hidden="true" key={row}><Skeleton width={64} /></span>) : categories.map((name) => <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}
        </div>
        <section className="wiki-home-results" aria-labelledby="pages-title" aria-busy={pagesLoading}>
          <div className="section-heading"><h2 id="pages-title">대화를 정리한 문서</h2><span className="muted small" role="status">{pagesLoading ? <Skeleton width={25} inline /> : visiblePages.length}개 문서</span></div>
          <div className="sort-row"><label><span className="sr-only">문서 정렬</span><select disabled={pagesLoading} value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">최근 수정순</option><option value="oldest">오래된 수정순</option><option value="title">제목 가나다순</option></select></label></div>
          {pagesLoading ? <ul className="wiki-page-list" aria-label="문서 목록 로딩 중">{[0, 1, 2, 3].map((row) => <li key={row}><div className="wiki-page-placeholder"><span className="article-number">{String(row + 1).padStart(2, '0')}</span><span className="article-summary"><strong><Skeleton width="65%" /></strong><small><Skeleton width="45%" /></small><small><Skeleton width="30%" /></small></span><img src="/design/arrow.svg" alt="" /></div></li>)}</ul> : visiblePages.length ? <ul className="wiki-page-list">{visiblePages.map((page, index) => <li key={page.id}><Link to={wikiPagePath(wikiId, page.id)}><span className="article-number">{String(index + 1).padStart(2, '0')}</span><span className="article-summary"><strong title={page.title}>{page.title}</strong>{Number.isFinite(Date.parse(page.updatedAt)) && <time dateTime={page.updatedAt}>수정일: {new Date(page.updatedAt).toLocaleDateString('ko-KR')}</time>}{page.category && <small title={page.category}>분류: {page.category}</small>}</span><img src="/design/arrow.svg" alt="" /></Link></li>)}</ul> : <p className="empty-results">{pages.length ? '검색 결과가 없습니다.' : '아직 생성된 문서가 없습니다.'}</p>}
        </section>
        
      </main>
    </>
  )
}
