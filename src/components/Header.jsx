import { Link, NavLink, useMatch } from 'react-router'
import { wikiPath } from '../utils/paths.js'

export default function Header() {
  const match = useMatch('/wiki/:wikiId/*')
  const links = [
    { to: '/', label: '홈', end: true },
    { to: '/form', label: '대화 올리기' },
    { to: wikiPath(match?.params.wikiId), label: '위키 보기' },
  ]
  return (
    <header className="site-header">
      <nav className="nav-inner" aria-label="주 메뉴">
        <Link className="brand" to="/">대화위키</Link>
        <div className="nav-links">
          {links.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  )
}
