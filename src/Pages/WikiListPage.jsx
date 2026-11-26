import { useQueryClient } from '@tanstack/react-query'
import { useRecentWikis } from '../api/queries.js'
import WikiApiError from '../components/common/WikiApiError.jsx'
import Skeleton from 'react-loading-skeleton'
import { Link } from 'react-router'
import ButtonLink from '../components/common/ButtonLink.jsx'
import { wikiPath } from '../utils/paths.js'

export default function WikiListPage() {
  const client = useQueryClient()
  const { wikis, entries, isPending: loading, error } = useRecentWikis()
  if (error) return <WikiApiError error={error} onRetry={() => client.resetQueries({ queryKey: ['wiki'] })} />
  return (
    <>
      <title>My wikis · 대화위키</title>
      <main id="main" className="container form-page wiki-home-page wiki-list-page" aria-busy={loading}>
        <section className="wiki-overview" aria-labelledby="wikis-title">
          <span className="wiki-visibility">YOUR KNOWLEDGE SPACE</span>
          <h1 id="wikis-title">My wikis</h1>
          <p>함께 나눈 대화, 다시 꺼내볼 수 있는 지식으로.</p>
          <div className="wiki-statistics"><div><strong>{loading ? <Skeleton width={30} /> : wikis.length}</strong><span>accessible wikis</span></div></div>
        </section>
        <div className="section-heading wiki-list-heading"><h2>Your conversations, connected</h2><ButtonLink to="/" primary>새 위키 만들기</ButtonLink></div>
        <p className="muted small wiki-list-description">이 브라우저에서 생성하거나 방문한 위키 중 지금 접근할 수 있는 위키를 모았어요.</p>
        <section className="wiki-list-results" aria-label="위키 목록" aria-busy={loading}>
          {entries.length ? (
            <ul className="wiki-list" aria-label={loading ? '위키 목록 로딩 중' : '위키 목록'}>
              {entries.map(({ id, wiki }) => {
                const Card = wiki ? Link : 'div'
                return <li key={id} data-wiki-id={id}>
                  <Card className="recent-wiki-card" to={wiki ? wikiPath(wiki.id) : undefined}>
                    <span className="recent-wiki-icon"><img src="/design/bookInactive.svg" alt="" /></span>
                    <span><strong title={wiki?.name}>{wiki ? wiki.name : <Skeleton width="70%" />}</strong><small>{wiki ? wiki.hasPassword ? 'PRIVATE WIKI' : 'PUBLIC WIKI' : <Skeleton width={80} />}</small></span>
                    <img src="/design/recentArrow.svg" alt="" />
                  </Card>
                </li>
              })}
            </ul>
          ) : <p className="empty-results">아직 이 브라우저에 기록된 접근 가능한 위키가 없습니다. 새 위키를 만들어 대화를 모아보세요.</p>}
        </section>
      </main>
    </>
  )
}
