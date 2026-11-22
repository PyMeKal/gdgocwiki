import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import 'react-loading-skeleton/dist/skeleton.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from './api/queries.js'
import { createRoutes } from './routes.jsx'

const queryClient = createQueryClient()
const router = createBrowserRouter(createRoutes(queryClient))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>
  </StrictMode>,
)
