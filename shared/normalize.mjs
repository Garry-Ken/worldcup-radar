// ESPN 赛事数据归一化：纯函数，服务端与浏览器共用
import { teamInfo } from './teams.mjs'

export const SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=300'

export const TOURNAMENT = 'FIFA 世界杯 2026 · 美加墨'

const ROUNDS = {
  'group-stage': { key: 'group', name: '小组赛', order: 0 },
  'round-of-32': { key: 'r32', name: '1/16决赛', order: 1 },
  'round-of-16': { key: 'r16', name: '1/8决赛', order: 2 },
  quarterfinals: { key: 'qf', name: '1/4决赛', order: 3 },
  semifinals: { key: 'sf', name: '半决赛', order: 4 },
  '3rd-place-match': { key: 'bronze', name: '季军赛', order: 5 },
  final: { key: 'final', name: '决赛', order: 6 },
}

function normTeam(competitor, isPre) {
  const t = competitor?.team || {}
  const info = teamInfo(t.displayName || t.name)
  const score = competitor?.score
  return {
    name: t.displayName || 'TBD',
    cn: info.cn,
    iso: info.iso,
    flag: info.flag,
    tbd: info.tbd === true,
    abbr: t.abbreviation || '???',
    logo: t.logo || null,
    // ESPN 对临近开赛的场次会提前填 "0"，未开赛一律置空，避免渲染成假 0-0
    score: isPre || score === '' || score == null ? null : Number(score),
    pens: isPre || competitor?.shootoutScore == null ? null : Number(competitor.shootoutScore),
    winner: !isPre && competitor?.winner === true,
  }
}

export function normalizeEvents(events) {
  const matches = []
  for (const ev of events || []) {
    const comp = ev.competitions?.[0]
    if (!comp) continue
    const st = comp.status || {}
    const state = st.type?.state || 'pre'
    const detail = st.type?.shortDetail || st.type?.detail || ''
    const round = ROUNDS[ev.season?.slug] || { key: 'other', name: '其他', order: 9 }
    const group = /Group ([A-L])/.exec(comp.altGameNote || '')?.[1] || null
    const homeC = comp.competitors?.find((c) => c.homeAway === 'home') || comp.competitors?.[0]
    const awayC = comp.competitors?.find((c) => c.homeAway === 'away') || comp.competitors?.[1]
    matches.push({
      id: String(ev.id),
      date: ev.date,
      round: { ...round, group },
      status: {
        state, // pre | in | post
        completed: st.type?.completed === true,
        detail,
        clock: st.displayClock || '',
        aet: /AET|Pens/i.test(detail),
        pens: /Pens/i.test(detail),
      },
      venue: {
        name: comp.venue?.fullName || '',
        city: comp.venue?.address?.city || '',
      },
      home: normTeam(homeC, state === 'pre'),
      away: normTeam(awayC, state === 'pre'),
    })
  }
  matches.sort((a, b) => new Date(a.date) - new Date(b.date))
  return matches
}
