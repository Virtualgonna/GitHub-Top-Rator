import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/github-trending': {
        target: 'https://github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/github-trending/, ''),
        secure: false,
      },
      '/github-api': {
        target: 'https://api.github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/github-api/, ''),
        secure: false,
      },
      '/ai-models': {
        target: 'https://models.inference.ai.azure.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai-models/, ''),
        secure: false,
      },
      '/mymemory-api': {
        target: 'https://api.mymemory.translated.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mymemory-api/, ''),
        secure: false,
      },
    },
  },
})
