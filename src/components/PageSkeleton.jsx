import { matchPath, useLocation } from 'react-router'
import WikiHomePage from '../Pages/WikiHomePage.jsx'
import WikiListPage from '../Pages/WikiListPage.jsx'
import WikiPage from '../Pages/WikiPage.jsx'
import WikiPageEditPage from '../Pages/WikiPageEditPage.jsx'
import FormPage from '../Pages/FormPage.jsx'
import GenerationPage from '../Pages/GenerationPage.jsx'
import 'react-loading-skeleton/dist/skeleton.css'

export default function PageSkeleton({ pathname, mainId = 'main' }) {
  const location = useLocation()
  const path = pathname ?? location.pathname
  const props = { loading: true, mainId }
  const article = matchPath('/wiki/:wikiId/pages/:pagesId', path)
  const editing = matchPath('/wiki/:wikiId/pages/:pagesId/edit', path)
  const wiki = matchPath('/wiki/:wikiId', path)

  let content
  if (article) content = <WikiPage {...props} {...article.params} />
  else if (editing) content = <WikiPageEditPage {...props} {...editing.params} />
  else if (wiki) content = <WikiHomePage {...props} {...wiki.params} />
  else if (path === '/wikis') content = <WikiListPage {...props} />
  else if (matchPath('/wiki/:wikiId/generations/:jobId', path)) content = <GenerationPage {...props} />
  else content = <FormPage {...props} />

  return <div className="page-skeleton"><span className="sr-only" role="status">화면을 준비하고 있습니다.</span>{content}</div>
}
