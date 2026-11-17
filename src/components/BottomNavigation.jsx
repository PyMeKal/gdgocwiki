import { Link, useLocation, useMatch } from 'react-router'
import { wikiPath } from '../utils/paths.js'

export default function BottomNavigation() {
  const match = useMatch('/wiki/:wikiId/*')
  const { pathname } = useLocation()
  const creating = pathname === '/' || pathname === '/form' || pathname.endsWith('/import')
  return (
    <nav className="bottom-navigation" aria-label="주 메뉴">
      <div className="bottom-navigation-inner">
        <Link to="/" aria-current={creating ? 'page' : undefined}><img src={`/design/${creating ? 'plusActive' : 'plus'}.svg`} alt="" />Create</Link>
        <button type="button" aria-disabled="true"><img src="/design/grid.svg" alt="" />Explore</button>
        <Link to={wikiPath(match?.params.wikiId)} aria-current={match && !creating ? 'page' : undefined}><img src={`/design/${match && !creating ? 'book' : 'bookInactive'}.svg`} alt="" />My wikis</Link>
        <button type="button" aria-disabled="true"><img src="/design/settings.svg" alt="" />Settings</button>
      </div>
    </nav>
  )
}
