import { useQuery, useQueryClient } from '@tanstack/react-query'
import { wikiQuery, pageQuery, pageTitlesQuery } from '../api/queries.js'
import WikiApiError from '../components/common/WikiApiError.jsx'
import Skeleton from 'react-loading-skeleton'
import { Link, useParams } from 'react-router'
import CopyWikiUrlButton from '../components/common/CopyWikiUrlButton.jsx'
import Breadcrumb from '../components/common/Breadcrumb.jsx'
import WikiDocument from '../components/wiki/WikiDocument.jsx'
import { wikiPagePath, wikiPath } from '../utils/paths.js'

export default function WikiPage() {
  const { wikiId, pagesId } = useParams()
  const client = useQueryClient()
  const wikiResult = useQuery(wikiQuery(wikiId))
  const pageResult = useQuery(pageQuery(wikiId, pagesId))
  const wiki = wikiResult.data
  const { page, document } = pageResult.data ?? {}
  const pageTitles = useQuery({ ...pageTitlesQuery(wikiId), enabled: page?.content.includes('[[') ?? false })
  const loading = pageResult.isPending
  const error = wikiResult.error || pageResult.error
  if (error) return <WikiApiError error={error} onRetry={() => client.resetQueries({ queryKey: ['wiki', wikiId] })} />
  return (
    <>
      <title>{loading || wikiResult.isPending ? '위키 문서 · 대화위키' : `${document.title} · ${wiki.name} · 대화위키`}</title>
      <main id="main" className="container wiki-layout article-page" aria-busy={loading || wikiResult.isPending}>
        <article className="wiki-article">
          <form className="article-search" action={wikiPath(wikiId)}>
            <label className="sr-only" htmlFor="article-search">위키 문서 검색</label>
            <input id="article-search" name="q" type="search" placeholder={wikiResult.isPending ? 'Search this wiki' : `Search ${wiki.name}`} />
            <button type="submit">Search</button>
          </form>
          <Breadcrumb><Link to={wikiPath(wikiId)}>{wikiResult.isPending ? <Skeleton width={80} /> : wiki.name}</Link> / 위키 문서</Breadcrumb>
          <WikiDocument key={`${wikiId}/${pagesId}`} loading={loading} updatedAt={page?.updatedAt} actions={<CopyWikiUrlButton key={wikiId} wikiId={wikiId} iconOnly />} wiki={document} wikiId={wikiId} pages={pageTitles.data} editPath={`${wikiPagePath(wikiId, pagesId)}/edit`} />
          <div className="article-bottom"><a href="#main">맨 위로 ↑</a></div>
        </article>
        <aside className="wiki-sidebar" aria-label="문서 도구">
          <div className="sidebar-box">
            <h2>문서 도구</h2>
            <p><Link to={wikiPath(wikiId)}>위키 홈</Link></p>
            <p><Link to="/form">새 대화 올리기</Link></p>
          </div>
          <Link className="back-home" to="/">← 홈으로 돌아가기</Link>
        </aside>
      </main>
    </>
  )
}
