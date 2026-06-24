import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Functions emulator (translate-textToText) — no usar Hosting :4015 (da 404 sin build Angular)
  const signMtTarget =
    env.VITE_SIGN_MT_PROXY_TARGET ||
    'http://127.0.0.1:4013/sign-mt/us-central1/translate-textToText'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: true,
      proxy: {
        // Proyecto translate en C:\Users\josya\Desktop\translate — no copiar dentro de Signara
        '/sign-mt': {
          target: signMtTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/sign-mt/, '/api'),
        },
      },
    },
  }
})
