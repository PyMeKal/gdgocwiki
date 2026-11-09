import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      input: {
        home: fileURLToPath(new URL('./index.html', import.meta.url)),
        form: fileURLToPath(new URL('./form.html', import.meta.url)),
        wiki: fileURLToPath(new URL('./wiki.html', import.meta.url)),
      },
    },
  },
})
