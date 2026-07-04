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

// —— 体彩竞彩玩法映射（均为 90 分钟口径，与竞彩结算规则一致）——
// 比分 31 选项 / 总进球 8 档 / 半全场 9 项 / 让球胜平负（让球线按 xG 差自动取整）
const JC_HOME_SCORES = ['1:0', '2:0', '2:1', '3:0', '3:1', '3:2', '4:0', '4:1', '4:2', '5:0', '5:1', '5:2']
const JC_DRAW_SCORES = ['0:0', '1:1', '2:2', '3:3']

function jcPlayTypes(cells, norm, lh, la, pH, pD, pA) {
  const P = (f) => cells.reduce((s, c) => s + (f(c) ? c.p : 0), 0) / norm
  // 让球胜平负：line>0 主让，line<0 主受让
  const diff = lh - la
  const mag = Math.abs(diff)
  const line = (mag < 1.75 ? 1 : mag < 2.75 ? 2 : 3) * (diff >= 0 ? 1 : -1)
  const handicap = {
    line,
    h: P((c) => c.h - line > c.a),
    d: P((c) => c.h - line === c.a),
    a: P((c) => c.h - line < c.a),
  }
  // 比分：竞彩 31 选项（12 胜 + 胜其他 / 4 平 + 平其他 / 12 负 + 负其他）
  const cellP = new Map()
  for (const c of cells) cellP.set(`${c.h}:${c.a}`, (cellP.get(`${c.h}:${c.a}`) || 0) + c.p / norm)
  const pick = (k) => cellP.get(k) || 0
  const scores = []
  let acc = 0
  for (const k of JC_HOME_SCORES) { const p = pick(k); acc += p; scores.push({ key: k, p, res: 'H' }) }
  scores.push({ key: '胜其他', p: Math.max(0, pH / norm - acc), res: 'H' })
  acc = 0
  for (const k of JC_DRAW_SCORES) { const p = pick(k); acc += p; scores.push({ key: k, p, res: 'D' }) }
  scores.push({ key: '平其他', p: Math.max(0, pD / norm - acc), res: 'D' })
  acc = 0
  for (const k of JC_HOME_SCORES) {
    const rk = k.split(':').reverse().join(':')
    const p = pick(rk); acc += p; scores.push({ key: rk, p, res: 'A' })
  }
  scores.push({ key: '负其他', p: Math.max(0, pA / norm - acc), res: 'A' })
  // 总进球：0-6、7+
  const totals = Array.from({ length: 7 }, (_, k) => ({ key: String(k), p: P((c) => c.h + c.a === k) }))
  totals.push({ key: '7+', p: Math.max(0, 1 - totals.reduce((s, t) => s + t.p, 0)) })
  // 半全场：上半场约占全场进球 45%（泊松细分），枚举两个半场
  const G = 6
  const l1 = [lh * 0.45, la * 0.45], l2 = [lh * 0.55, la * 0.55]
  const tb = [0, 1].map((s) => Array.from({ length: G + 1 }, (_, k) => pois(k, l1[s])))
  const tb2 = [0, 1].map((s) => Array.from({ length: G + 1 }, (_, k) => pois(k, l2[s])))
  const acc9 = {}
  for (let h1 = 0; h1 <= G; h1++)
    for (let a1 = 0; a1 <= G; a1++)
      for (let h2 = 0; h2 <= G; h2++)
        for (let a2 = 0; a2 <= G; a2++) {
          const p = tb[0][h1] * tb[1][a1] * tb2[0][h2] * tb2[1][a2]
          const ht = h1 > a1 ? '胜' : h1 === a1 ? '平' : '负'
          const H = h1 + h2, A = a1 + a2
          const ft = H > A ? '胜' : H === A ? '平' : '负'
          acc9[ht + ft] = (acc9[ht + ft] || 0) + p
        }
  const s9 = Object.values(acc9).reduce((a, b) => a + b, 0)
  const ORDER9 = ['胜胜', '胜平', '胜负', '平胜', '平平', '平负', '负胜', '负平', '负负']
  // 半场枚举是独立泊松近似，按主矩阵的全场胜/平/负边际做列校正，保证口径一致
  const ftTarget = { 胜: pH / norm, 平: pD / norm, 负: pA / norm }
  const ftCur = { 胜: 0, 平: 0, 负: 0 }
  for (const k of ORDER9) ftCur[k[1]] += (acc9[k] || 0) / s9
  const halfFull = ORDER9.map((k) => ({
    key: `${k[0]}/${k[1]}`,
    p: ((acc9[k] || 0) / s9) * (ftCur[k[1]] > 0 ? ftTarget[k[1]] / ftCur[k[1]] : 1),
  }))
  return { handicap, scores, totals, halfFull }
}

// 平局校准（2026-07-04 依据 51 场滚动回测网格搜索定标：模型原版平均只给平局 17.9%，
// 现实是 27.5%，淘汰赛 90 分钟平局率 33%）。两个机制配合：
// - BP_SHARED：双变量泊松共享分量，双方进球正相关，抬整条对角线（含 2-2）
// - DC_RHO：Dixon-Coles 低比分修正，抬 0-0/1-1、压 1-0/0-1
// 数值都在文献常见范围内；淘汰赛「压差」参数在同一回测中被数据否决（未采用）
const BP_SHARED = 0.25
const DC_RHO = -0.11

function dcTau(i, j, lh, la) {
  if (i === 0 && j === 0) return 1 - lh * la * DC_RHO
  if (i === 0 && j === 1) return 1 + lh * DC_RHO
  if (i === 1 && j === 0) return 1 + la * DC_RHO
  if (i === 1 && j === 1) return 1 - DC_RHO
  return 1
}

export function predictMatch(ratings, mu, m) {
  const h = ratings.get(m.home.name)
  const w = ratings.get(m.away.name)
  if (!h?.p || !w?.p) return null
  const lh = clamp(mu * h.att * w.def, 0.15, 4.5)
  const la = clamp(mu * w.att * h.def, 0.15, 4.5)
  const l0h = Math.max(0.05, lh - BP_SHARED)
  const l0a = Math.max(0.05, la - BP_SHARED)
  let pH = 0, pD = 0, pA = 0, blowH = 0, blowA = 0
  const cells = []
  for (let i = 0; i <= 8; i++)
    for (let j = 0; j <= 8; j++) {
      let p = 0
      for (let c = 0; c <= Math.min(i, j, 5); c++)
        p += pois(c, BP_SHARED) * pois(i - c, l0h) * pois(j - c, l0a)
      p = Math.max(0, p * dcTau(i, j, lh, la))
      cells.push({ h: i, a: j, p })
      if (i > j) pH += p
      else if (i === j) pD += p
      else pA += p
      if (i - j >= 2) blowH += p
      if (j - i >= 2) blowA += p
    }
  const norm = pH + pD + pA
  const jc = jcPlayTypes(cells, norm, lh, la, pH, pD, pA)
  cells.sort((x, y) => y.p - x.p)
  return {
    m,
    lh, la,
    pH: pH / norm, pD: pD / norm, pA: pA / norm,
    blowH: blowH / norm, blowA: blowA / norm,
    top: cells.slice(0, 5).map((c) => ({ ...c, p: c.p / norm })),
    jc,
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

// —— 模型战绩：滚动复盘，每场只用它开赛前的数据重新预测，与实际对账 ——
// 加时/点球场次按竞彩口径记为「90分钟平局」，且不参与比分命中统计（90分钟比分不可知）
export function modelRecord(matches, minTrain = 36) {
  const fin = matches
    .filter((m) => m.status.state === 'post' && m.home.score != null && m.away.score != null)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  let n = 0, dir = 0, pSum = 0, dPred = 0, dReal = 0, top3 = 0, top5 = 0, scoreN = 0
  const rows = []
  for (let idx = minTrain; idx < fin.length; idx++) {
    const m = fin[idx]
    const train = fin.slice(0, idx)
    const goals = train.reduce((s, x) => s + x.home.score + x.away.score, 0)
    const mu = goals / (2 * train.length)
    const p = predictMatch(buildRatings(train, mu), mu, m)
    if (!p) continue
    const actual = m.status.aet ? 'D' : m.home.winner ? 'H' : m.away.winner ? 'A' : 'D'
    const predDir = p.pH >= p.pD && p.pH >= p.pA ? 'H' : p.pA >= p.pD ? 'A' : 'D'
    const pActual = actual === 'H' ? p.pH : actual === 'A' ? p.pA : p.pD
    n++
    if (predDir === actual) dir++
    pSum += pActual
    dPred += p.pD
    if (actual === 'D') dReal++
    if (!m.status.aet) {
      scoreN++
      const rank = p.top.findIndex((c) => c.h === m.home.score && c.a === m.away.score)
      if (rank > -1 && rank < 3) top3++
      if (rank > -1 && rank < 5) top5++
    }
    rows.push({ m, predDir, actual, hit: predDir === actual, pActual })
  }
  return {
    n, dir,
    avgP: n ? pSum / n : 0,
    drawPred: n ? dPred / n : 0,
    drawReal: n ? dReal / n : 0,
    top3, top5, scoreN,
    rows: rows.slice(-6).reverse(),
  }
}
