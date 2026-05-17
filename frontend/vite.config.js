import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project sites: set VITE_BASE=/repo-name/ in CI. Local dev uses /.
// https://vite.dev/config/shared-options.html#base
const base = process.env.VITE_BASE || '/'

// https://vite.dev/config/
const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:5000',
    changeOrigin: true,
  },
}

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
})
