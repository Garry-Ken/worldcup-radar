export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

export const fmtDay = (iso) =>
  new Date(iso).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })

export const fmtDateTime = (iso) => `${fmtDay(iso)} ${fmtTime(iso)}`

// 本地时区的 YYYY-MM-DD，用于按天分组
export const dayKey = (iso) => new Date(iso).toLocaleDateString('sv')

export const isToday = (iso) => dayKey(iso) === dayKey(new Date().toISOString())

const POST_LABEL = { FT: '完场', AET: '加时', 'FT-Pens': '点球' }

export function statusLabel(m) {
  const { state, detail, clock, pens, aet } = m.status
  if (state === 'in') return { text: clock || '进行中', tone: 'live' }
  if (state === 'post')
    return { text: POST_LABEL[detail] || (pens ? '点球' : aet ? '加时' : '完场'), tone: 'post' }
  return { text: fmtTime(m.date), tone: 'pre' }
}

export function countdown(iso, now = Date.now()) {
  let s = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000))
  const d = Math.floor(s / 86400)
  s -= d * 86400
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}天${h}小时`
  if (h > 0) return `${h}小时${String(m).padStart(2, '0')}分`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export const ROUND_KEYS = ['group', 'r32', 'r16', 'qf', 'sf', 'bronze', 'final']
