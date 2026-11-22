import { Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router'
import PageLayout from './components/PageLayout.jsx'
import PageSkeleton from './components/PageSkeleton.jsx'

export default function App() {
  const navigation = useNavigation()
  const location = useLocation()
  const loading = navigation.state === 'loading' && !navigation.formMethod && (
    navigation.location.pathname !== location.pathname || navigation.location.search !== location.search
  )
  return (
    <PageLayout loading={loading}>
      {loading && <PageSkeleton pathname={navigation.location.pathname} mainId="loading-main" />}
      {/* 저장 실패나 이동 취소 시에도 편집 상태를 유지합니다. */}
      <div hidden={loading}><Outlet /></div>
      <ScrollRestoration />
    </PageLayout>
  )
}
