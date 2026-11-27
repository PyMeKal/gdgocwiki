import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const { API_PROXY_TARGET } = loadEnv(mode, '.', 'API_PROXY_')

  return {
    base: '/',
    plugins: [react()],
    server: {
      proxy: API_PROXY_TARGET ? {
        '/api': {
          target: API_PROXY_TARGET,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      } : undefined,
    },
  }
})
