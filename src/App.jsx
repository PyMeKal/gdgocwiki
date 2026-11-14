import { Outlet, ScrollRestoration, useNavigation } from 'react-router'
import PageLayout from './components/PageLayout.jsx'

export default function App() {
  const navigation = useNavigation()
  return (
    <PageLayout>
      {navigation.state === 'loading' && <p className="container" role="status">불러오는 중입니다…</p>}
      <Outlet />
      <ScrollRestoration />
    </PageLayout>
  )
}
