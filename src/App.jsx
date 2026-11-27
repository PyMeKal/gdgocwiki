import { Outlet, ScrollRestoration } from 'react-router'
import { Analytics } from '@vercel/analytics/react'
import PageLayout from './components/layout/PageLayout.jsx'

export default function App() {
  return (
    <PageLayout>
      <Outlet />
      <ScrollRestoration />
      <Analytics mode={import.meta.env.DEV ? 'development' : 'production'} />
    </PageLayout>
  )
}
