import BottomNavigation from './BottomNavigation.jsx'
import Header from './Header.jsx'

export default function PageLayout({ children }) {
  return (
    <>
      <a className="skip-link" href="#main">본문 바로가기</a>
      <Header />
      {children}
      <BottomNavigation />
    </>
  )
}
