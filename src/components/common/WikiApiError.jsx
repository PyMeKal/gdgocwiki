import { useQueryClient } from '@tanstack/react-query'
import { Link, useActionData, useNavigation, useRouteError, useLocation, useNavigate, useParams } from 'react-router'
import WikiPasswordAuth from '../auth/WikiPasswordAuth.jsx'

export default function WikiApiError({ error: queryError, onRetry }) {
  const routeError = useRouteError()
  const error = queryError ?? routeError
  const result = useActionData()
  const navigation = useNavigation()
  const client = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const { wikiId } = useParams()
  const locked = error.status === 401
  const busy = navigation.state !== 'idle'
  if (locked) return <WikiPasswordAuth wikiName={client.getQueryData(['wiki', wikiId])?.name} busy={busy} error={result?.error} />
  return (
    <main id="main" className="container form-page">
      <title>위키 조회 오류 · 대화위키</title>
      <h1>위키를 불러오지 못했습니다.</h1>
      <p role="alert" className="upload-error">{error.status === 404 ? '요청한 위키 또는 문서를 찾을 수 없습니다.' : error.message}</p>
      <button className="button" type="button" disabled={busy} onClick={async () => {
        if (onRetry) return onRetry()
        await client.resetQueries()
        navigate(location.pathname + location.search, { replace: true })
      }}>다시 시도</button>
      <p><Link to="/">홈으로 돌아가기</Link></p>
    </main>
  )
}
