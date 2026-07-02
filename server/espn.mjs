// ESPN 世界杯公开接口：直连优先，失败走本机 Clash 代理 CONNECT 隧道
import net from 'node:net'
import tls from 'node:tls'
import https from 'node:https'
import { teamInfo } from './teams.mjs'

const SCOREBOARD =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=300'
const PROXY = process.env.WC_PROXY || '127.0.0.1:7897'

async function fetchDirect(url, timeoutMs = 10000) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'user-agent': 'Mozilla/5.0 worldcup-radar' },
  })
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`)
  return res.json()
}

// 经 HTTP 代理建立 CONNECT 隧道后再走 TLS（Node 的 fetch 不认系统代理）
function fetchViaProxy(urlStr, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const [proxyHost, proxyPort] = PROXY.split(':')
    const u = new URL(urlStr)
    const timer = setTimeout(() => {
      sock.destroy()
      reject(new Error('proxy tunnel timeout'))
    }, timeoutMs)
    const fail = (err) => {
      clearTimeout(timer)
      reject(err)
    }
    const sock = net.connect(Number(proxyPort), proxyHost)
    sock.on('error', fail)
    sock.once('connect', () => {
      sock.write(`CONNECT ${u.hostname}:443 HTTP/1.1\r\nHost: ${u.hostname}:443\r\n\r\n`)
    })
    let header = ''
    const onData = (chunk) => {
      header += chunk.toString('latin1')
      if (!header.includes('\r\n\r\n')) return
      sock.off('data', onData)
      if (!/^HTTP\/1\.[01] 200/.test(header)) return fail(new Error('proxy CONNECT refused'))
      const tlsSock = tls.connect({ socket: sock, servername: u.hostname })
      tlsSock.on('error', fail)
      const req = https.request(
        urlStr,
        { createConnection: () => tlsSock, headers: { 'user-agent': 'Mozilla/5.0 worldcup-radar' } },
        (res) => {
          const chunks = []
          res.on('data', (c) => chunks.push(c))
          res.on('end', () => {
            clearTimeout(timer)
            try {
              if (res.statusCode !== 200) throw new Error(`ESPN HTTP ${res.statusCode} (proxy)`)
              resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
            } catch (err) {
              reject(err)
            } finally {
              tlsSock.destroy()
            }
          })
        }
      )
      req.on('error', fail)
      req.end()
    }
    sock.on('data', onData)
  })
}

const ROUNDS = {
  'group-stage': { key: 'group', name: '小组赛', order: 0 },
  'round-of-32': { key: 'r32', name: '1/16决赛', order: 1 },
  'round-of-16': { key: 'r16', name: '1/8决赛', order: 2 },
  quarterfinals: { key: 'qf', name: '1/4决赛', order: 3 },
  semifinals: { key: 'sf', name: '半决赛', order: 4 },
  '3rd-place-match': { key: 'bronze', name: '季军赛', order: 5 },
  final: { key: 'final', name: '决赛', order: 6 },
}

function normTeam(competitor) {
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
    score: score === '' || score == null ? null : Number(score),
    pens: competitor?.shootoutScore == null ? null : Number(competitor.shootoutScore),
    winner: competitor?.winner === true,
  }
}

export function normalizeEvents(events) {
  const matches = []
  for (const ev of events || []) {
    const comp = ev.competitions?.[0]
    if (!comp) continue
    const st = comp.status || {}
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
        state: st.type?.state || 'pre', // pre | in | post
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
      home: normTeam(homeC),
      away: normTeam(awayC),
    })
  }
  matches.sort((a, b) => new Date(a.date) - new Date(b.date))
  return matches
}

export async function fetchTournament() {
  let raw
  try {
    raw = await fetchDirect(SCOREBOARD)
  } catch {
    raw = await fetchViaProxy(SCOREBOARD)
  }
  const matches = normalizeEvents(raw.events)
  if (matches.length < 10) throw new Error(`ESPN 数据异常：仅 ${matches.length} 场`)
  return matches
}
