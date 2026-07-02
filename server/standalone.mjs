// 独立生产服务：静态托管 dist/ + /api 接口，npm run build && npm start
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { join, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apiHandler } from './api.mjs'

const PORT = Number(process.env.PORT || 3189)
const DIST = resolve(fileURLToPath(new URL('../dist', import.meta.url)))
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

http
  .createServer(async (req, res) => {
    const url = (req.url || '/').split('?')[0]
    if (url.startsWith('/api')) {
      req.url = url.slice(4) || '/'
      return apiHandler(req, res)
    }
    const file = url === '/' ? '/index.html' : url
    try {
      const data = await readFile(join(DIST, file))
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' })
      res.end(data)
    } catch {
      try {
        const index = await readFile(join(DIST, 'index.html'))
        res.writeHead(200, { 'content-type': MIME['.html'] })
        res.end(index)
      } catch {
        res.writeHead(404)
        res.end('build first: npm run build')
      }
    }
  })
  .listen(PORT, () => console.log(`绿茵雷达 → http://localhost:${PORT}`))
