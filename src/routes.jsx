import { Link } from 'react-router'
import App from './App.jsx'
import PageLayout from './components/PageLayout.jsx'
import GenerationPage from './Pages/GenerationPage.jsx'
import FormPage from './Pages/FormPage.jsx'
// import HomePage from './Pages/HomePage.jsx'
import WikiHomePage from './Pages/WikiHomePage.jsx'
import WikiPage from './Pages/WikiPage.jsx'
import WikiListPage from './Pages/WikiListPage.jsx'
import WikiApiError from './components/WikiApiError.jsx'
import { importLoader, generationLoader, pageEditAction, pageEditLoader, pageLoader, unlockAction, uploadAction, wikiListLoader, wikiLoader } from './api/routeHandlers.js'
import WikiPageEditPage from './Pages/WikiPageEditPage.jsx'

export const routes = [{
  element: <App />,
  hydrateFallbackElement: <PageLayout><main id="main" className="container form-page" role="status">불러오는 중입니다…</main></PageLayout>,
  children: [
    // { path: '/', element: <HomePage /> },
    { path: '/', element: <FormPage />, loader: importLoader, action: uploadAction },
    { path: '/wikis', element: <WikiListPage />, loader: wikiListLoader, errorElement: <WikiApiError /> },
    { path: '/wiki/:wikiId', element: <WikiHomePage />, loader: wikiLoader, action: unlockAction, errorElement: <WikiApiError /> },
    { path: '/wiki/:wikiId/generations/:jobId', element: <GenerationPage />, loader: generationLoader, action: unlockAction, errorElement: <WikiApiError /> },
    { path: '/wiki/:wikiId/pages/:pagesId', element: <WikiPage />, loader: pageLoader, action: unlockAction, errorElement: <WikiApiError /> },
    { path: '/wiki/:wikiId/pages/:pagesId/edit', element: <WikiPageEditPage />, loader: pageEditLoader, action: pageEditAction, errorElement: <WikiApiError /> },
    { path: '*', element: (
      <main id="main" className="container form-page">
        <title>페이지를 찾을 수 없습니다 · 대화위키</title>
        <h1>페이지를 찾을 수 없습니다.</h1>
        <Link to="/">홈으로 돌아가기</Link>
      </main>
    ) },
  ],
}]
