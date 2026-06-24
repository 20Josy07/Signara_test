import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Backend Sign Translate (sign.mt) — proyecto C:\Users\josya\Desktop\translate
      '/sign-mt': {
        target: 'https://sign.mt',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sign-mt/, '/api'),
      },
    },
  },
})
