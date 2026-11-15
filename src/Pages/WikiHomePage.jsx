import { Link, useLoaderData, useParams } from 'react-router'
import CopyWikiUrlButton from '../components/CopyWikiUrlButton.jsx'
import Breadcrumb from '../components/Breadcrumb.jsx'
import ButtonLink from '../components/ButtonLink.jsx'
import { wikiPagePath, wikiPath } from '../utils/paths.js'

export default function WikiHomePage() {
  const { wikiId } = useParams()
  const { wiki, pages } = useLoaderData()

  return (
    <>
      <title>{`${wiki.name} · 위키 홈 · 대화위키`}</title>
      <main id="main" className="container form-page">
        <Breadcrumb>위키 홈</Breadcrumb>
        <div className="article-title-row"><h1>{wiki.name}</h1><CopyWikiUrlButton key={wikiId} wikiId={wikiId} iconOnly /></div>
        <section className="panel" aria-labelledby="pages-title">
          <h2 id="pages-title">문서 목록</h2>
          {pages.length ? <ul>{pages.map((page) => <li key={page.id}><Link to={wikiPagePath(wikiId, page.id)}>{page.title}</Link></li>)}</ul> : <p>아직 생성된 문서가 없습니다.</p>}
        </section>
        <div className="actions">
          <ButtonLink to="/form">새 대화 올리기</ButtonLink>
          <ButtonLink to={`${wikiPath(wikiId)}/preview`}>브라우저 문서 미리보기</ButtonLink>
        </div>
      </main>
    </>
  )
}
