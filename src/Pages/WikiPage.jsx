import { Link, useLoaderData, useParams } from 'react-router'
import CopyWikiUrlButton from '../components/CopyWikiUrlButton.jsx'
import Breadcrumb from '../components/Breadcrumb.jsx'
import WikiDocument from '../components/WikiDocument.jsx'
import { wikiPagePath, wikiPath } from '../utils/paths.js'

export default function WikiPage() {
  const { wikiId, pagesId } = useParams()
  const { wiki, document } = useLoaderData()
  return (
    <>
      <title>{`${document.title} · ${wiki.name} · 대화위키`}</title>
      <main id="main" className="container wiki-layout article-page">
        <article className="wiki-article">
          <form className="article-search" action={wikiPath(wikiId)}><label className="sr-only" htmlFor="article-search">위키 문서 검색</label><input id="article-search" name="q" type="search" placeholder={`Search ${wiki.name}`} /><button type="submit">Search</button></form>
          <Breadcrumb><Link to={wikiPath(wikiId)}>{wiki.name}</Link> / 위키 문서</Breadcrumb>
          <WikiDocument actions={<CopyWikiUrlButton key={wikiId} wikiId={wikiId} iconOnly />} wiki={document} editPath={`${wikiPagePath(wikiId, pagesId)}/edit`} />
          <div className="article-bottom"><a href="#main">맨 위로 ↑</a></div>
        </article>
        <aside className="wiki-sidebar" aria-label="문서 도구">
          <div className="sidebar-box">
            <h2>문서 도구</h2>
            <p><Link to={wikiPath(wikiId)}>위키 홈</Link></p>
            <p><Link to={`${wikiPath(wikiId)}/preview`}>브라우저 문서 미리보기</Link></p>
            <p><Link to="/form">새 대화 올리기</Link></p>
          </div>
          <Link className="back-home" to="/">← 홈으로 돌아가기</Link>
        </aside>
      </main>
    </>
  )
}
