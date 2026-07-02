import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { apiHandler } from './server/api.mjs'

// /api 作为 Vite 中间件挂载，前后端同端口，无需单独起服务
const wcApi = {
  name: 'wc-api',
  configureServer(server) {
    server.middlewares.use('/api', apiHandler)
  },
  configurePreviewServer(server) {
    server.middlewares.use('/api', apiHandler)
  },
}

export default defineConfig({
  base: './', // 相对路径，GitHub Pages 子路径可用
  plugins: [react(), wcApi],
  server: { port: 5197, host: true },
})
