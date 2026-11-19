import { Link, useLoaderData } from 'react-router'
import ButtonLink from '../components/ButtonLink.jsx'
import { wikiPath } from '../utils/paths.js'

export default function WikiListPage() {
  const { wikis } = useLoaderData()
  return (
    <>
      <title>My wikis · 대화위키</title>
      <main id="main" className="container form-page wiki-home-page wiki-list-page">
        <section className="wiki-overview" aria-labelledby="wikis-title">
          <span className="wiki-visibility">YOUR KNOWLEDGE SPACE</span>
          <h1 id="wikis-title">My wikis</h1>
          <p>함께 나눈 대화, 다시 꺼내볼 수 있는 지식으로.</p>
          <div className="wiki-statistics"><div><strong>{wikis.length}</strong><span>accessible wikis</span></div></div>
        </section>
        <div className="section-heading"><h2>Your conversations, connected</h2><ButtonLink to="/" primary>새 위키 만들기</ButtonLink></div>
        <p className="muted small">이 브라우저에서 만들거나 방문한 위키 중 지금 접근할 수 있는 항목입니다.</p>
        {wikis.length ? (
          <ul className="wiki-list">
            {wikis.map((wiki) => (
              <li key={wiki.id}>
                <Link className="recent-wiki-card" to={wikiPath(wiki.id)}>
                  <span className="recent-wiki-icon"><img src="/design/bookInactive.svg" alt="" /></span>
                  <span><strong>{wiki.name}</strong><small>{wiki.hasPassword ? 'PRIVATE WIKI' : 'PUBLIC WIKI'}</small></span>
                  <img src="/design/recentArrow.svg" alt="" />
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="empty-results">아직 이 브라우저에 기록된 접근 가능한 위키가 없습니다. 새 위키를 만들어 대화를 모아보세요.</p>}
      </main>
    </>
  )
}
