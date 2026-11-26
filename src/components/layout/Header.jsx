import { Link, useMatch } from 'react-router'

export default function Header() {
  const article = useMatch('/wiki/:wikiId/pages/:pagesId')
  return (
    <header className={`site-header${article ? ' article-site-header' : ''}`}>
      <div className="nav-inner">
        <Link className="brand" to="/"><img src="/design/brand.svg" alt="" />WikiTalk</Link>
        <span className="menu-symbol" aria-hidden="true"><img src="/design/menu.svg" alt="" /></span>
      </div>
    </header>
  )
}
