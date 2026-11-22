import Skeleton from 'react-loading-skeleton'
import { Link, useLoaderData, useParams } from 'react-router'
import CopyWikiUrlButton from '../components/CopyWikiUrlButton.jsx'
import Breadcrumb from '../components/Breadcrumb.jsx'
import WikiDocument from '../components/WikiDocument.jsx'
import { wikiPagePath, wikiPath } from '../utils/paths.js'

export default function WikiPage({ loading = false, wikiId: pendingWikiId, pagesId: pendingPagesId, mainId = 'main' }) {
  const params = useParams()
  const wikiId = pendingWikiId ?? params.wikiId
  const pagesId = pendingPagesId ?? params.pagesId
  const data = useLoaderData()
  const { wiki, document, page } = loading ? {} : data
  const searchId = `${mainId}-article-search`
  return (
    <>
      <title>{loading ? '위키 문서 · 대화위키' : `${document.title} · ${wiki.name} · 대화위키`}</title>
      <main id={mainId} className="container wiki-layout article-page" aria-busy={loading}>
        <article className="wiki-article">
          <form className="article-search" action={wikiPath(wikiId)}><label className="sr-only" htmlFor={searchId}>위키 문서 검색</label><input id={searchId} name="q" type="search" placeholder={loading ? 'Search this wiki' : `Search ${wiki.name}`} /><button type="submit">Search</button></form>
          <Breadcrumb><Link to={wikiPath(wikiId)}>{loading ? <Skeleton width={80} /> : wiki.name}</Link> / 위키 문서</Breadcrumb>
          <WikiDocument loading={loading} updatedAt={page?.updatedAt} actions={<CopyWikiUrlButton key={wikiId} wikiId={wikiId} iconOnly />} wiki={document} editPath={`${wikiPagePath(wikiId, pagesId)}/edit`} />
          <div className="article-bottom"><a href={`#${mainId}`}>맨 위로 ↑</a></div>
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
