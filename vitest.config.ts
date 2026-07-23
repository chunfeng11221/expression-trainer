import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// 组件级测试(jsdom):文字稿点段跳转等交互断言;构建仍用 vite.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.tsx'],
  },
})
