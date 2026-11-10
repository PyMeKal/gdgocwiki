import FormPage from './Pages/FormPage.jsx'
import HomePage from './Pages/HomePage.jsx'
import WikiPage from './Pages/WikiPage.jsx'
import PageLayout from './components/PageLayout.jsx'

const pages = new Map([
  ['home', <HomePage />],
  ['form', <FormPage />],
  ['wiki', <WikiPage />],
])

export default function App() {
  const requestedPage = new URLSearchParams(window.location.search).get('page')
  const currentPage = pages.has(requestedPage) ? requestedPage : 'home'

  return (
    <PageLayout currentPage={currentPage}>
      {pages.get(currentPage)}
    </PageLayout>
  )
}
