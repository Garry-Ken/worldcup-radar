import { useCallback, useEffect, useRef, useState } from 'react'

const INTERVAL = 45 // 秒

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
      const r = await fetch('/api/dashboard')
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setData(await r.json())
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
