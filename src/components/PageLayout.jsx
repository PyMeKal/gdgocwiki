import Footer from './Footer.jsx'
import Header from './Header.jsx'

export default function PageLayout({ currentPage, children }) {
  return (
    <>
      <a className="skip-link" href="#main">본문 바로가기</a>
      <Header currentPage={currentPage} />
      {children}
      <Footer />
    </>
  )
}
