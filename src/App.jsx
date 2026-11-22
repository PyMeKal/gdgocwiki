import { Outlet, ScrollRestoration } from 'react-router'
import PageLayout from './components/PageLayout.jsx'

export default function App() {
  return (
    <PageLayout>
      <Outlet />
      <ScrollRestoration />
    </PageLayout>
  )
}
