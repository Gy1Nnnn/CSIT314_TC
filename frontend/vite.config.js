import { copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
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

/** GitHub Pages serves 404.html for unknown paths; mirror index.html for client-side routes. */
function ghPagesSpaFallback() {
  return {
    name: 'gh-pages-spa-fallback',
    closeBundle() {
      const index = join(process.cwd(), 'dist', 'index.html')
      if (existsSync(index)) {
        copyFileSync(index, join(process.cwd(), 'dist', '404.html'))
      }
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), ghPagesSpaFallback()],
  server: {
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
})
