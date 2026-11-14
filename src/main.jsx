import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import { routes } from './routes.jsx'

async function start() {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW !== 'false') {
    try {
      const { worker } = await import('./mocks/browser.js')
      await worker.start({
        onUnhandledFrame: 'bypass',
        serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
      })
    } catch (error) {
      console.error('MSW를 시작하지 못했습니다. mock API를 사용할 수 없습니다.', error)
    }
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <RouterProvider router={createBrowserRouter(routes)} />
    </StrictMode>,
  )
}

start()
