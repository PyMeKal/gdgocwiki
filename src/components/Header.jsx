const links = [
  { page: 'home', href: './', label: '홈' },
  { page: 'form', href: './?page=form', label: '대화 올리기' },
  { page: 'wiki', href: './?page=wiki', label: '위키 보기' },
]

export default function Header({ currentPage }) {
  return (
    <header className="site-header">
      <nav className="nav-inner" aria-label="주 메뉴">
        <a className="brand" href="./">대화위키</a>
        <div className="nav-links">
          {links.map(({ page, href, label }) => (
            <a key={page} href={href} aria-current={currentPage === page ? 'page' : undefined}>
              {label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  )
}
