// 离线演示模式：ESPN 不可达时生成一届确定性的模拟世界杯（种子固定，比分可复现）
// 注意：分组与比分均为虚构，前端会明确标注「演示数据」
import { teamInfo } from './teams.mjs'

const GROUPS = {
  A: ['Mexico', 'Italy', 'South Korea', 'Cape Verde'],
  B: ['Canada', 'Germany', "Côte d'Ivoire", 'Qatar'],
  C: ['Brazil', 'Morocco', 'Scotland', 'Haiti'],
  D: ['United States', 'Croatia', 'Egypt', 'New Zealand'],
  E: ['Argentina', 'Austria', 'Tunisia', 'Jordan'],
  F: ['Spain', 'Uruguay', 'Australia', 'South Africa'],
  G: ['France', 'Senegal', 'Uzbekistan', 'Panama'],
  H: ['England', 'Colombia', 'Iran', 'Curaçao'],
  I: ['Portugal', 'Denmark', 'Algeria', 'Iraq'],
  J: ['Netherlands', 'Türkiye', 'Japan', 'Ghana'],
  K: ['Belgium', 'Ecuador', 'Saudi Arabia', 'DR Congo'],
  L: ['Switzerland', 'Paraguay', 'Ukraine', 'Norway'],
}

const STRENGTH = {
  Spain: 2110, Argentina: 2095, France: 2075, England: 2050, Brazil: 2030,
  Portugal: 2010, Netherlands: 1985, Germany: 1975, Italy: 1950, Belgium: 1935,
  Croatia: 1925, Uruguay: 1915, Colombia: 1905, Morocco: 1900, Japan: 1880,
  'United States': 1860, Norway: 1855, Switzerland: 1850, Mexico: 1845, Denmark: 1840,
  Austria: 1832, 'Türkiye': 1828, Ukraine: 1820, Senegal: 1810, 'South Korea': 1800,
  Ecuador: 1795, Canada: 1790, Iran: 1782, Paraguay: 1778, "Côte d'Ivoire": 1775,
  Australia: 1768, Algeria: 1765, 'Scotland': 1758, Egypt: 1755, Tunisia: 1748,
  Ghana: 1740, 'Saudi Arabia': 1700, 'DR Congo': 1698, 'South Africa': 1695,
  Panama: 1688, Uzbekistan: 1685, Qatar: 1678, Jordan: 1660, Iraq: 1650,
  'New Zealand': 1640, 'Cape Verde': 1620, 'Curaçao': 1600, Haiti: 1590,
}

const VENUES = [
  ['MetLife Stadium', 'New York/New Jersey'], ['SoFi Stadium', 'Los Angeles'],
  ['AT&T Stadium', 'Dallas'], ['NRG Stadium', 'Houston'], ['Mercedes-Benz Stadium', 'Atlanta'],
  ['Hard Rock Stadium', 'Miami'], ['Lincoln Financial Field', 'Philadelphia'],
  ['Levi\'s Stadium', 'San Francisco'], ['Lumen Field', 'Seattle'], ['Gillette Stadium', 'Boston'],
  ['Arrowhead Stadium', 'Kansas City'], ['Estadio Azteca', 'Mexico City'],
  ['Estadio Akron', 'Guadalajara'], ['Estadio BBVA', 'Monterrey'],
  ['BMO Field', 'Toronto'], ['BC Place', 'Vancouver'],
]

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function poissonSample(lambda, rnd) {
  const L = Math.exp(-lambda)
  let k = 0, p = 1
  do { k++; p *= rnd() } while (p > L && k < 12)
  return k - 1
}

function simScore(a, b, seed) {
  const rnd = mulberry32(seed)
  const sa = STRENGTH[a] || 1700, sb = STRENGTH[b] || 1700
  const la = Math.min(3.4, Math.max(0.25, 1.32 * Math.pow(10, (sa - sb) / 780)))
  const lb = Math.min(3.4, Math.max(0.25, 1.32 * Math.pow(10, (sb - sa) / 780)))
  return [poissonSample(la, rnd), poissonSample(lb, rnd), rnd]
}

function goalMinutes(n, rnd) {
  return Array.from({ length: n }, () => 1 + Math.floor(rnd() * 92)).sort((x, y) => x - y)
}

let matchSeq = 0
function makeMatch({ home, away, dateISO, round, group, feeders = null }) {
  matchSeq++
  const seed = 20260000 + matchSeq * 137
  const [hs, as, rnd] = simScore(home, away, seed)
  const venue = VENUES[matchSeq % VENUES.length]
  let pens = null
  let winnerSide = hs > as ? 'home' : as > hs ? 'away' : null
  const knockout = round.key !== 'group'
  let aet = false
  if (knockout && hs === as) {
    aet = true
    if (rnd() < 0.55) {
      const pw = rnd() < 0.5 ? 'home' : 'away'
      const lo = 3 + Math.floor(rnd() * 2)
      pens = pw === 'home' ? [lo + 1, lo] : [lo, lo + 1]
      winnerSide = pw
    } else {
      winnerSide = rnd() < 0.5 ? 'home' : 'away'
    }
  }
  return {
    id: `demo-${matchSeq}`,
    date: dateISO,
    round,
    feeders,
    seed,
    venue: { name: venue[0], city: venue[1] },
    group,
    homeName: home,
    awayName: away,
    hs: aet && !pens ? hs + 1 * (winnerSide === 'home') : hs,
    as: aet && !pens ? as + 1 * (winnerSide === 'away') : as,
    pens,
    aet,
    winnerSide,
    goalMins: null, // 延迟生成
  }
}

const ROUND_DEF = {
  group: { key: 'group', name: '小组赛', order: 0 },
  r32: { key: 'r32', name: '1/16决赛', order: 1 },
  r16: { key: 'r16', name: '1/8决赛', order: 2 },
  qf: { key: 'qf', name: '1/4决赛', order: 3 },
  sf: { key: 'sf', name: '半决赛', order: 4 },
  bronze: { key: 'bronze', name: '季军赛', order: 5 },
  final: { key: 'final', name: '决赛', order: 6 },
}

function iso(y, m, d, h, min = 0) {
  return new Date(Date.UTC(y, m - 1, d, h, min)).toISOString().replace('.000Z', 'Z')
}

function buildFixtures() {
  matchSeq = 0
  const fixtures = []
  const letters = Object.keys(GROUPS)
  // 小组赛三轮：6/11-16、6/17-22、6/23-27
  const mdPlan = [
    [11, [[0, 1], [2, 3]]],
    [17, [[0, 2], [1, 3]]],
    [23, [[0, 3], [1, 2]]],
  ]
  for (const [mdIdx, [startDay, pairs]] of mdPlan.entries()) {
    letters.forEach((g, gi) => {
      pairs.forEach(([i, j], pi) => {
        const slot = gi * 2 + pi // 每轮 24 场，摊到 5~6 天
        const day = startDay + Math.floor(slot / 5)
        const hour = [15, 18, 20, 22, 23][slot % 5]
        fixtures.push(
          makeMatch({
            home: GROUPS[g][i], away: GROUPS[g][j],
            dateISO: iso(2026, 6, day, hour),
            round: { ...ROUND_DEF.group, group: g }, group: g,
          })
        )
      })
    })
  }
  // 小组积分 → 前二 + 8 个最佳第三 出线
  const table = {}
  for (const g of letters) for (const t of GROUPS[g]) table[t] = { g, pts: 0, gd: 0, gf: 0 }
  for (const m of fixtures) {
    const a = table[m.homeName], b = table[m.awayName]
    a.gf += m.hs; b.gf += m.as
    a.gd += m.hs - m.as; b.gd += m.as - m.hs
    if (m.hs > m.as) a.pts += 3
    else if (m.as > m.hs) b.pts += 3
    else { a.pts += 1; b.pts += 1 }
  }
  const rankOf = {}
  const thirds = []
  for (const g of letters) {
    const rows = GROUPS[g]
      .map((t) => ({ t, ...table[t] }))
      .sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf)
    rows.forEach((r, i) => (rankOf[`${i + 1}${g}`] = r.t))
    thirds.push(rows[2])
  }
  thirds.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf)
  const T = thirds.slice(0, 8).map((r) => r.t)
  // 1/16 决赛对阵模板（演示用简化版）
  const r32Pairs = [
    [rankOf['1A'], T[0]], [rankOf['2B'], rankOf['2C']], [rankOf['1C'], T[1]], [rankOf['1D'], rankOf['2E']],
    [rankOf['1B'], T[2]], [rankOf['1F'], rankOf['2H']], [rankOf['1E'], T[3]], [rankOf['1G'], rankOf['2I']],
    [rankOf['1I'], rankOf['2A']], [rankOf['1J'], T[4]], [rankOf['1H'], rankOf['2D']], [rankOf['1K'], T[5]],
    [rankOf['1L'], rankOf['2F']], [rankOf['2G'], rankOf['2J']], [T[6], rankOf['2K']], [T[7], rankOf['2L']],
  ]
  const r32 = r32Pairs.map(([h, a], i) =>
    makeMatch({
      home: h, away: a,
      dateISO: iso(2026, 6, 28 + Math.floor((i * 6) / 16), [15, 19, 22][i % 3]),
      round: ROUND_DEF.r32,
    })
  )
  fixtures.push(...r32)
  // 后续轮次：胜者依次配对
  const advance = (prev, roundKey, month, days) =>
    Array.from({ length: prev.length / 2 }, (_, i) => {
      const w = (m) => (m.winnerSide === 'home' ? m.homeName : m.awayName)
      const d = days[Math.floor((i * days.length) / (prev.length / 2))]
      return makeMatch({
        home: w(prev[i * 2]), away: w(prev[i * 2 + 1]),
        dateISO: iso(2026, month, d, i % 2 === 0 ? 19 : 22),
        round: ROUND_DEF[roundKey],
        feeders: [prev[i * 2].id, prev[i * 2 + 1].id],
      })
    })
  const r16 = advance(r32, 'r16', 7, [4, 5, 6, 7])
  const qf = advance(r16, 'qf', 7, [9, 10, 11])
  const sf = advance(qf, 'sf', 7, [14, 15])
  const w = (m) => (m.winnerSide === 'home' ? m.homeName : m.awayName)
  const l = (m) => (m.winnerSide === 'home' ? m.awayName : m.homeName)
  const bronze = makeMatch({ home: l(sf[0]), away: l(sf[1]), dateISO: iso(2026, 7, 18, 21), round: ROUND_DEF.bronze, feeders: [sf[0].id, sf[1].id] })
  const final = makeMatch({ home: w(sf[0]), away: w(sf[1]), dateISO: iso(2026, 7, 19, 19), round: ROUND_DEF.final, feeders: [sf[0].id, sf[1].id] })
  fixtures.push(...r16, ...qf, ...sf, bronze, final)
  return fixtures
}

const FIXTURES = buildFixtures()

function toTeam(name, score, winner, pens) {
  const info = teamInfo(name)
  return {
    name, cn: info.cn, iso: info.iso, flag: info.flag, tbd: info.tbd === true,
    abbr: name.slice(0, 3).toUpperCase(), logo: null,
    score, pens, winner,
  }
}

// 依据当前时间输出各场状态；保证总有 1-2 场「直播中」让看板活起来
export function demoMatches(now = Date.now()) {
  const LIVE_MS = 118 * 60 * 1000
  const list = FIXTURES.map((f) => ({ ...f }))
  const upcoming = list.filter((f) => new Date(f.date).getTime() > now - LIVE_MS)
  if (!list.some((f) => Math.abs(new Date(f.date).getTime() - now) < LIVE_MS) && upcoming.length >= 2) {
    upcoming[0].date = new Date(now - 41 * 60 * 1000).toISOString()
    upcoming[1].date = new Date(now - 67 * 60 * 1000).toISOString()
  }
  // 未来轮次里，若上游比赛尚未完赛 → 对阵显示为待定，避免剧透
  const stateOf = {}
  for (const f of list) {
    const elapsed = now - new Date(f.date).getTime()
    stateOf[f.id] = elapsed >= LIVE_MS ? 'post' : elapsed >= 0 ? 'in' : 'pre'
  }
  return list
    .map((f) => {
      const kickoff = new Date(f.date).getTime()
      const elapsedMs = now - kickoff
      const state = stateOf[f.id]
      const unknown =
        state === 'pre' && Array.isArray(f.feeders) && f.feeders.some((id) => stateOf[id] !== 'post')
      let hs = null, as = null, clock = '', detail = ''
      let pens = state === 'post' ? f.pens : null
      if (state === 'post') {
        hs = f.hs; as = f.as
        detail = f.pens ? 'FT-Pens' : f.aet ? 'AET' : 'FT'
      } else if (state === 'in') {
        const rnd = mulberry32(f.seed + 7)
        const hMins = goalMinutes(f.hs, rnd)
        const aMins = goalMinutes(f.as, rnd)
        const minute = Math.floor(elapsedMs / 60000)
        const playMin = minute <= 45 ? minute : minute <= 60 ? Math.max(45, minute - 15) : Math.min(90, minute - 15)
        hs = hMins.filter((m) => m <= playMin).length
        as = aMins.filter((m) => m <= playMin).length
        clock = minute > 45 && minute <= 60 ? 'HT' : `${playMin}'`
        detail = clock
      } else {
        detail = ''
      }
      const winnerSide = state === 'post' ? f.winnerSide : null
      return {
        id: f.id,
        date: f.date,
        round: { ...f.round, group: f.group || f.round.group || null },
        status: {
          state, completed: state === 'post', detail, clock,
          aet: state === 'post' && f.aet, pens: state === 'post' && !!f.pens,
        },
        venue: f.venue,
        home: toTeam(unknown ? 'TBD' : f.homeName, hs, winnerSide === 'home', pens ? pens[0] : null),
        away: toTeam(unknown ? 'TBD' : f.awayName, as, winnerSide === 'away', pens ? pens[1] : null),
      }
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}
