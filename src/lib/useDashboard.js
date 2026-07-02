import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeEvents, SCOREBOARD_URL, TOURNAMENT } from '../../shared/normalize.mjs'
import { demoMatches } from '../../shared/demo.mjs'

const INTERVAL = 45 // 秒

// 三级数据链：同源 /api（dev / standalone）→ 浏览器直连 ESPN（GitHub Pages 等纯静态托管）→ 离线演示
async function fetchAny() {
  try {
    const r = await fetch('/api/dashboard', { signal: AbortSignal.timeout(15000) })
    if (r.ok) {
      const j = await r.json()
      if (j && Array.isArray(j.matches)) return j
    }
    throw new Error('api unavailable')
  } catch { /* 静态托管无 /api，下探 */ }
  try {
    const r = await fetch(SCOREBOARD_URL, { signal: AbortSignal.timeout(12000) })
    if (!r.ok) throw new Error(`ESPN HTTP ${r.status}`)
    const j = await r.json()
    const matches = normalizeEvents(j.events)
    if (matches.length < 10) throw new Error('ESPN 数据异常')
    return { source: 'espn', direct: true, fetchedAt: new Date().toISOString(), tournament: TOURNAMENT, matches }
  } catch { /* 浏览器直连也不通，回退演示 */ }
  return { source: 'demo', fetchedAt: new Date().toISOString(), tournament: TOURNAMENT, matches: demoMatches() }
}

export function useDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [left, setLeft] = useState(INTERVAL)
  const busy = useRef(false)

  const load = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setLoading(true)
    try {
      setData(await fetchAny())
      setError(null)
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      busy.current = false
      setLoading(false)
      setLeft(INTERVAL)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // 每秒一跳：倒计时到 0 自动刷新（顺带驱动直播时钟重渲染）
  useEffect(() => {
    const t = setInterval(
      () =>
        setLeft((v) => {
          if (v <= 1) {
            load()
            return INTERVAL
          }
          return v - 1
        }),
      1000
    )
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    const fn = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', fn)
    return () => document.removeEventListener('visibilitychange', fn)
  }, [load])

  return { data, error, loading, left, interval: INTERVAL, reload: load }
}
