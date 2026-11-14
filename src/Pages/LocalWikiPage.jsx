import { useState } from 'react'
import { Link, useParams } from 'react-router'
import Breadcrumb from '../components/Breadcrumb.jsx'
import ButtonLink from '../components/ButtonLink.jsx'
import WikiDocument from '../components/WikiDocument.jsx'
import { loadWiki } from '../utils/wiki.js'
import { wikiPagePath, wikiPath } from '../utils/paths.js'

export default function LocalWikiPage() {
  const { wikiId, pagesId } = useParams()
  const [{ wiki, error }] = useState(loadWiki)
  return (
    <>
      <title>{`${wiki.title} · 대화위키`}</title>
      <meta name="description" content={wiki.description} />
      <main id="main" className="container wiki-layout">
        <article className="wiki-article">
          <Breadcrumb><Link to={wikiPath(wikiId)}>위키 홈</Link> / 위키 문서</Breadcrumb>
          {error && <p className="upload-error" role="alert">{error}</p>}
          <p className="notice">브라우저에 저장된 문서 미리보기입니다. API 문서와 별도로 보관됩니다.</p>
          <WikiDocument wiki={wiki} actions={<ButtonLink to={`${wikiPagePath(wikiId, pagesId)}/edit`}>위키 수정</ButtonLink>} />
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
