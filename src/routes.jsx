import { Link } from 'react-router'
import App from './App.jsx'
import PageLayout from './components/PageLayout.jsx'
import GenerationPage from './Pages/GenerationPage.jsx'
import FormPage from './Pages/FormPage.jsx'
// import HomePage from './Pages/HomePage.jsx'
import WikiHomePage from './Pages/WikiHomePage.jsx'
import WikiPage from './Pages/WikiPage.jsx'
import LocalWikiPage from './Pages/LocalWikiPage.jsx'
import WikiApiError from './components/WikiApiError.jsx'
import { generationLoader, pageEditAction, pageEditLoader, pageLoader, unlockAction, uploadAction, wikiLoader } from './api/routeHandlers.js'
import WikiEditPage from './Pages/WikiEditPage.jsx'
import WikiPageEditPage from './Pages/WikiPageEditPage.jsx'
import WikiImportPage from './Pages/WikiImportPage.jsx'

export const routes = [{
  element: <App />,
  hydrateFallbackElement: <PageLayout><main id="main" className="container form-page" role="status">불러오는 중입니다…</main></PageLayout>,
  children: [
    // { path: '/', element: <HomePage /> },
    { path: '/', element: <WikiImportPage />, action: uploadAction },
    { path: '/form', element: <FormPage />, action: uploadAction },
    { path: '/wiki/:wikiId', element: <WikiHomePage />, loader: wikiLoader, action: unlockAction, errorElement: <WikiApiError /> },
    { path: '/wiki/:wikiId/generations/:jobId', element: <GenerationPage />, loader: generationLoader, action: unlockAction, errorElement: <WikiApiError /> },
    { path: '/wiki/:wikiId/import', element: <WikiImportPage />, action: uploadAction },
    { path: '/wiki/:wikiId/pages/:pagesId', element: <WikiPage />, loader: pageLoader, action: unlockAction, errorElement: <WikiApiError /> },
    { path: '/wiki/:wikiId/preview', element: <LocalWikiPage /> },
    { path: '/wiki/:wikiId/preview/edit', element: <WikiEditPage /> },
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
