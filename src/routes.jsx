import { Link } from 'react-router'
import App from './App.jsx'
import GenerationPage from './Pages/GenerationPage.jsx'
import FormPage from './Pages/FormPage.jsx'
import WikiHomePage from './Pages/WikiHomePage.jsx'
import WikiPage from './Pages/WikiPage.jsx'
import WikiListPage from './Pages/WikiListPage.jsx'
import WikiApiError from './components/common/WikiApiError.jsx'
import { pageEditAction, unlockAction, uploadAction } from './api/routeHandlers.js'
import WikiPageEditPage from './Pages/WikiPageEditPage.jsx'

export const createRoutes = (client) => [{
  element: <App />,
  children: [
    { path: '/', element: <FormPage />, action: (args) => uploadAction(args, client) },
    { path: '/wikis', element: <WikiListPage />, errorElement: <WikiApiError /> },
    { path: '/wiki/:wikiId', element: <WikiHomePage />, action: (args) => unlockAction(args, client), errorElement: <WikiApiError /> },
    { path: '/wiki/:wikiId/generations/:jobId', element: <GenerationPage />, action: (args) => unlockAction(args, client), errorElement: <WikiApiError /> },
    { path: '/wiki/:wikiId/pages/:pagesId', element: <WikiPage />, action: (args) => unlockAction(args, client), errorElement: <WikiApiError /> },
    { path: '/wiki/:wikiId/pages/:pagesId/edit', element: <WikiPageEditPage />, action: (args) => pageEditAction(args, client), errorElement: <WikiApiError /> },
    { path: '*', element: (
      <main id="main" className="container form-page">
        <title>페이지를 찾을 수 없습니다 · 대화위키</title>
        <h1>페이지를 찾을 수 없습니다.</h1>
        <Link to="/">홈으로 돌아가기</Link>
      </main>
    ) },
  ],
}]
