import type { CapacitorConfig } from '@capacitor/cli'

// 安卓 App 壳:页面用 dist/(npm run build 产物),
// API 走局域网电脑端,见 src/services/apiBase.ts 与设置页「服务器地址」
const config: CapacitorConfig = {
  appId: 'com.expressiontrainer.app',
  appName: '表达力训练器',
  webDir: 'dist',
}

export default config
