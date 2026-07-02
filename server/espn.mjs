// ESPN 数据抓取（Node 侧）：直连优先，失败走本机 Clash 代理 CONNECT 隧道
import net from 'node:net'
import tls from 'node:tls'
import https from 'node:https'
import { normalizeEvents, SCOREBOARD_URL } from '../shared/normalize.mjs'

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

export async function fetchTournament() {
  let raw
  try {
    raw = await fetchDirect(SCOREBOARD_URL)
  } catch {
    raw = await fetchViaProxy(SCOREBOARD_URL)
  }
  const matches = normalizeEvents(raw.events)
  if (matches.length < 10) throw new Error(`ESPN 数据异常：仅 ${matches.length} 场`)
  return matches
}
