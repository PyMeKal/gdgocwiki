import { Link, useLocation, useMatch } from 'react-router'

export default function BottomNavigation() {
  const match = useMatch('/wiki/:wikiId/*')
  const generation = useMatch('/wiki/:wikiId/generations/:jobId')
  const { pathname } = useLocation()
  const myWikis = pathname === '/wikis' || Boolean(match)
  const creating = pathname === '/' || pathname === '/form' || pathname.endsWith('/import') || Boolean(generation)
  return (
    <nav className="bottom-navigation" aria-label="주 메뉴">
      <div className="bottom-navigation-inner">
        <Link to="/" aria-current={creating ? 'page' : undefined}><img src={`/design/${creating ? 'plusActive' : 'plus'}.svg`} alt="" />위키 생성</Link>
        <button type="button" aria-disabled="true"><img src="/design/grid.svg" alt="" />찾아보기</button>
        <Link to="/wikis" aria-current={myWikis && !creating ? 'page' : undefined}><img src={`/design/${myWikis && !creating ? 'book' : 'bookInactive'}.svg`} alt="" />내 위키</Link>
        <button type="button" aria-disabled="true"><img src="/design/settings.svg" alt="" />설정</button>
      </div>
    </nav>
  )
}
