import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // dev 模式下把 /api 转发给本地 Python 后端(npm run server)
      '/api': 'http://127.0.0.1:8788',
    },
  },
})
