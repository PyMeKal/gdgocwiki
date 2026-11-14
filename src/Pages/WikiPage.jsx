import { Link, useLoaderData, useParams } from 'react-router'
import Breadcrumb from '../components/Breadcrumb.jsx'
import WikiDocument from '../components/WikiDocument.jsx'
import { wikiPath } from '../utils/paths.js'

export default function WikiPage() {
  const { wikiId } = useParams()
  const { wiki, document } = useLoaderData()
  return (
    <>
      <title>{`${document.title} · ${wiki.name} · 대화위키`}</title>
      <main id="main" className="container wiki-layout">
        <article className="wiki-article">
          <Breadcrumb><Link to={wikiPath(wikiId)}>{wiki.name}</Link> / 위키 문서</Breadcrumb>
          <WikiDocument wiki={document} />
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
