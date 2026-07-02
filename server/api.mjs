// /api 处理器：ESPN 实时数据（45s 缓存）→ 失败回退上次缓存 → 再失败回退演示模式
import { fetchTournament } from './espn.mjs'
import { demoMatches } from '../shared/demo.mjs'

const TTL = 45 * 1000
let cache = { matches: null, ts: 0 }

function send(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(body)
}

export async function apiHandler(req, res) {
  const url = req.url || '/'
  if (!url.startsWith('/dashboard')) return send(res, 404, { error: 'not found' })

  const now = Date.now()
  if (cache.matches && now - cache.ts < TTL) {
    return send(res, 200, payload('espn', cache.matches, cache.ts))
  }
  try {
    const matches = await fetchTournament()
    cache = { matches, ts: now }
    return send(res, 200, payload('espn', matches, now))
  } catch (err) {
    if (cache.matches) {
      return send(res, 200, { ...payload('espn', cache.matches, cache.ts), stale: true, error: String(err?.message || err) })
    }
    return send(res, 200, payload('demo', demoMatches(now), now))
  }
}

function payload(source, matches, ts) {
  return {
    source, // espn | demo
    fetchedAt: new Date(ts).toISOString(),
    tournament: 'FIFA 世界杯 2026 · 美加墨',
    matches,
  }
}
