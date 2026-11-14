import { Link, useLoaderData, useParams } from 'react-router'
import Breadcrumb from '../components/Breadcrumb.jsx'
import { wikiPath } from '../utils/paths.js'

export default function WikiPage() {
  const { wikiId } = useParams()
  const { wiki, page } = useLoaderData()
  return (
    <>
      <title>{`${page.title} · ${wiki.name} · 대화위키`}</title>
      <main id="main" className="container wiki-layout">
        <article className="wiki-article">
          <Breadcrumb><Link to={wikiPath(wikiId)}>위키 홈</Link> / 위키 문서</Breadcrumb>
          <header className="article-header"><h1>{page.title}</h1><p className="muted small">{wiki.name} · {page.category} · 버전 {page.version}</p></header>
          {/* shortcut: API 본문은 원문 텍스트로 표시합니다. Markdown 렌더링이 필요해지면 안전한 렌더러를 연결합니다. */}
          <div className="wiki-text">{page.content}</div>
          <div className="article-bottom"><Link to={`${wikiPath(wikiId)}/import`}>JSON으로 위키 만들기 →</Link><a href="#main">맨 위로 ↑</a></div>
        </article>
        <aside className="wiki-sidebar" aria-label="문서 도구">
          <div className="sidebar-box">
            <h2>문서 도구</h2>
            <p><Link to={wikiPath(wikiId)}>위키 홈</Link></p>
            <p><Link to={`${wikiPath(wikiId)}/preview`}>브라우저 문서 미리보기</Link></p>
            <p><Link to={`${wikiPath(wikiId)}/import`}>JSON으로 위키 만들기</Link></p>
            <p><Link to="/form">새 대화 올리기</Link></p>
          </div>
          <Link className="back-home" to="/">← 홈으로 돌아가기</Link>
        </aside>
      </main>
    </>
  )
}
