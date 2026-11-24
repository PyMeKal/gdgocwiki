import { useQueryClient } from '@tanstack/react-query'
import { Form, Link, useActionData, useNavigation, useRouteError, useLocation, useNavigate } from 'react-router'
import PasswordInput from './PasswordInput.jsx'

export default function WikiApiError({ error: queryError, onRetry }) {
  const routeError = useRouteError()
  const error = queryError ?? routeError
  const result = useActionData()
  const navigation = useNavigation()
  const client = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const locked = error.status === 401
  const busy = navigation.state !== 'idle'
  return (
    <main id="main" className="container form-page">
      <title>{`${locked ? '위키 인증' : '위키 조회 오류'} · 대화위키`}</title>
      <h1>{locked ? '위키 비밀번호를 입력해주세요.' : '위키를 불러오지 못했습니다.'}</h1>
      <p role="alert" className="upload-error">{error.status === 404 ? '요청한 위키 또는 문서를 찾을 수 없습니다.' : error.message}</p>
      {locked ? (
        <Form method="post" className="panel">
          <div className="field">
            <label htmlFor="wiki-password">위키 비밀번호</label>
            <PasswordInput id="wiki-password" name="password" autoComplete="current-password" required disabled={busy} />
          </div>
          {result?.error && <p role="alert" className="upload-error">{result.error}</p>}
          <button className="button primary" type="submit" disabled={busy}>{busy ? '확인 중…' : '위키 열기'}</button>
        </Form>
      ) : <button className="button" type="button" disabled={busy} onClick={async () => {
        if (onRetry) return onRetry()
        await client.resetQueries()
        navigate(location.pathname + location.search, { replace: true })
      }}>다시 시도</button>}
      <p><Link to="/">홈으로 돌아가기</Link></p>
    </main>
  )
}
