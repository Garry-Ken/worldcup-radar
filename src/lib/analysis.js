// 胜负与比分分析引擎：战力榜 / 比分分布 / 进球结构 / 泊松预测

function outcome(m) {
  if (m.home.winner) return 'home'
  if (m.away.winner) return 'away'
  return 'draw'
}

export function analyze(matches) {
  const finished = matches.filter(
    (m) => m.status.state === 'post' && m.home.score != null && m.away.score != null
  )
  const live = matches.filter((m) => m.status.state === 'in')
  const upcoming = matches.filter((m) => m.status.state === 'pre')

  // —— 球队战力（按场均积分 → 场均净胜球排序）——
  const teams = new Map()
  const get = (t) => {
    if (!teams.has(t.name))
      teams.set(t.name, {
        name: t.name, cn: t.cn, iso: t.iso, flag: t.flag, logo: t.logo,
        p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, form: [],
      })
    const rec = teams.get(t.name)
    rec.logo ||= t.logo
    return rec
  }
  for (const m of finished) {
    const h = get(m.home)
    const a = get(m.away)
    h.p++; a.p++
    h.gf += m.home.score; h.ga += m.away.score
    a.gf += m.away.score; a.ga += m.home.score
    const o = outcome(m)
    if (o === 'home') { h.w++; a.l++; h.form.push('W'); a.form.push('L') }
    else if (o === 'away') { a.w++; h.l++; a.form.push('W'); h.form.push('L') }
    else { h.d++; a.d++; h.form.push('D'); a.form.push('D') }
  }
  const table = [...teams.values()]
    .map((t) => ({
      ...t,
      gd: t.gf - t.ga,
      pts: t.w * 3 + t.d,
      ppg: (t.w * 3 + t.d) / Math.max(1, t.p),
      form: t.form.slice(-5),
    }))
    .sort((x, y) => y.ppg - x.ppg || y.gd / y.p - x.gd / x.p || y.gf - x.gf)

  // —— 比分分布（不分主客，大比分在前）——
  const slMap = new Map()
  for (const m of finished) {
    const k = [m.home.score, m.away.score].sort((a, b) => b - a).join('-')
    slMap.set(k, (slMap.get(k) || 0) + 1)
  }
  const scorelines = [...slMap.entries()]
    .map(([score, count]) => ({ score, count }))
    .sort((a, b) => b.count - a.count || a.score.localeCompare(b.score))

  // —— 单场总进球结构 ——
  const buckets = [
    { label: '0-1球', min: 0, max: 1, count: 0 },
    { label: '2-3球', min: 2, max: 3, count: 0 },
    { label: '4-5球', min: 4, max: 5, count: 0 },
    { label: '6球+', min: 6, max: 99, count: 0 },
  ]
  for (const m of finished) {
    const g = m.home.score + m.away.score
    buckets.find((b) => g >= b.min && g <= b.max).count++
  }

  // —— 每日进球趋势（按 UTC 比赛日）——
  const dayMap = new Map()
  for (const m of finished) {
    const k = m.date.slice(5, 10)
    const e = dayMap.get(k) || { day: k, goals: 0, matches: 0 }
    e.goals += m.home.score + m.away.score
    e.matches++
    dayMap.set(k, e)
  }
  const byDay = [...dayMap.values()].sort((a, b) => a.day.localeCompare(b.day))

  // —— 总览指标 ——
  const goals = finished.reduce((s, m) => s + m.home.score + m.away.score, 0)
  const cleanSheets = finished.reduce((s, m) => s + (m.away.score === 0) + (m.home.score === 0), 0)
  const extra = finished.filter((m) => m.status.aet).length
  const draws = finished.filter((m) => outcome(m) === 'draw').length
  let biggest = null
  for (const m of finished) {
    const diff = Math.abs(m.home.score - m.away.score)
    if (!biggest || diff > biggest.diff) biggest = { diff, m }
  }

  return {
    finished, live, upcoming, table, scorelines, buckets, byDay,
    tiles: {
      played: finished.length,
      total: matches.length,
      goals,
      avg: finished.length ? goals / finished.length : 0,
      cleanSheets, extra, draws, biggest,
    },
  }
}

// —— 泊松比分预测（Maher 型对手强度校准 + 赛前实力先验）——
// E[进球] = mu × att(自) × def(对手)；att/def 交替迭代拟合，
// 每支队的数据都按「面对的对手强弱」折算，并向赛前实力先验做贝叶斯收缩。
import { priorAtt, priorDef } from '../../shared/strength.mjs'

function pois(k, l) {
  let p = Math.exp(-l)
  for (let i = 1; i <= k; i++) p *= l / i
  return p
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
// 先验权重：相当于 K 场「面对平均对手、按赛前实力发挥」的虚拟比赛，
// 防止 4-5 场小样本把弱旅摆大巴刷出的数据当真实力（如佛得角）
const SHRINK_K = 2.5

export function buildRatings(finished, mu) {
  const teams = new Map()
  const rec = (name) => {
    if (!teams.has(name))
      teams.set(name, { p: 0, att: priorAtt(name), def: priorDef(name), a0: priorAtt(name), d0: priorDef(name), rows: [] })
    return teams.get(name)
  }
  for (const m of finished) {
    const h = rec(m.home.name)
    const w = rec(m.away.name)
    h.p++; w.p++
    h.rows.push({ gf: m.home.score, ga: m.away.score, opp: m.away.name })
    w.rows.push({ gf: m.away.score, ga: m.home.score, opp: m.home.name })
  }
  for (let it = 0; it < 8; it++) {
    for (const t of teams.values()) {
      let expAtt = 0, expDef = 0, gf = 0, ga = 0
      for (const r of t.rows) {
        expAtt += teams.get(r.opp).def
        expDef += teams.get(r.opp).att
        gf += r.gf
        ga += r.ga
      }
      t.att = (gf / mu + SHRINK_K * t.a0) / (expAtt + SHRINK_K)
      t.def = (ga / mu + SHRINK_K * t.d0) / (expDef + SHRINK_K)
    }
    // 归一化：全体平均攻/防强度锚定为 1
    const arr = [...teams.values()]
    const mA = arr.reduce((s, t) => s + t.att, 0) / arr.length
    const mD = arr.reduce((s, t) => s + t.def, 0) / arr.length
    for (const t of arr) {
      t.att /= mA
      t.def /= mD
    }
  }
  return teams
}

export function predictMatch(ratings, mu, m) {
  const h = ratings.get(m.home.name)
  const w = ratings.get(m.away.name)
  if (!h?.p || !w?.p) return null
  const lh = clamp(mu * h.att * w.def, 0.15, 4.5)
  const la = clamp(mu * w.att * h.def, 0.15, 4.5)
  let pH = 0, pD = 0, pA = 0, blowH = 0, blowA = 0
  const cells = []
  for (let i = 0; i <= 8; i++)
    for (let j = 0; j <= 8; j++) {
      const p = pois(i, lh) * pois(j, la)
      cells.push({ h: i, a: j, p })
      if (i > j) pH += p
      else if (i === j) pD += p
      else pA += p
      if (i - j >= 2) blowH += p
      if (j - i >= 2) blowA += p
    }
  const norm = pH + pD + pA
  cells.sort((x, y) => y.p - x.p)
  return {
    m,
    lh, la,
    pH: pH / norm, pD: pD / norm, pA: pA / norm,
    blowH: blowH / norm, blowA: blowA / norm,
    top: cells.slice(0, 5).map((c) => ({ ...c, p: c.p / norm })),
  }
}

export function predictUpcoming(a, maxN = 6) {
  const { finished, upcoming, tiles } = a
  if (!tiles.played) return []
  const mu = tiles.goals / (2 * tiles.played) // 场均每队进球
  const ratings = buildRatings(finished, mu)
  const out = []
  for (const m of upcoming) {
    if (m.home.tbd || m.away.tbd) continue
    const p = predictMatch(ratings, mu, m)
    if (!p) continue
    out.push(p)
    if (out.length >= maxN) break
  }
  return out
}
