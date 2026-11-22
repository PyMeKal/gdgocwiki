import BottomNavigation from './BottomNavigation.jsx'
import Header from './Header.jsx'

export default function PageLayout({ children, loading = false }) {
  return (
    <>
      <a className="skip-link" href={loading ? '#loading-main' : '#main'}>본문 바로가기</a>
      <Header />
      {children}
      <BottomNavigation />
    </>
  )
}
