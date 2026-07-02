import { useMemo, useState } from 'react'
import { Card, SectionTitle, TeamFlag, RoundChip } from './ui.jsx'
import { fmtDay, fmtTime, dayKey, isToday, statusLabel, ROUND_KEYS } from '../lib/format.js'

const TABS = [
  ['today', '今日'],
  ['live', '直播'],
  ['pre', '未开赛'],
  ['post', '已完赛'],
  ['all', '全部'],
]

function TeamCell({ team, right = false, winner, finished }) {
  const nameCls = team.tbd
    ? 'text-white/30'
    : finished
      ? winner
        ? 'font-semibold text-white'
        : 'text-white/45'
      : 'text-white/85'
  return (
    <div className={`flex min-w-0 items-center gap-2 ${right ? 'flex-row-reverse' : ''}`}>
      <TeamFlag team={team} size={18} />
      <span className={`truncate text-sm ${nameCls}`}>{team.tbd ? team.cn : team.cn}</span>
    </div>
  )
}

function Row({ m }) {
  const s = statusLabel(m)
  const finished = m.status.state === 'post'
  const live = m.status.state === 'in'
  return (
    <div
      className={`grid grid-cols-[44px_minmax(0,1fr)_auto_minmax(0,1fr)_64px] items-center gap-2 rounded-xl px-2.5 py-2.5 transition hover:bg-white/[0.04] md:grid-cols-[44px_96px_minmax(0,1fr)_auto_minmax(0,1fr)_64px] ${
        live ? 'bg-rose-500/[0.06]' : ''
      }`}
    >
      <time className="num text-xs text-white/40">{fmtTime(m.date)}</time>
      <div className="hidden md:block">
        <RoundChip round={m.round} />
      </div>
      <div className="flex justify-end">
        <TeamCell team={m.home} right winner={m.home.winner} finished={finished} />
      </div>
      <div className="flex w-14 flex-col items-center">
        {m.home.score != null ? (
          <span className={`num text-sm font-bold ${live ? 'text-rose-200' : 'text-white/90'}`}>
            {m.home.score} : {m.away.score}
          </span>
        ) : (
          <span className="text-xs font-semibold tracking-widest text-white/20">VS</span>
        )}
        {m.status.pens && m.home.pens != null && (
          <span className="num text-[9px] text-amber-300/80">点 {m.home.pens}-{m.away.pens}</span>
        )}
      </div>
      <TeamCell team={m.away} winner={m.away.winner} finished={finished} />
      <div className="text-right">
        {s.tone === 'live' ? (
          <span className="num text-xs font-semibold text-rose-300">
            <span className="live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
            {s.text}
          </span>
        ) : (
          <span className={`text-xs ${m.status.aet ? 'text-amber-300/80' : 'text-white/35'}`}>
            {s.tone === 'pre' ? '未开赛' : s.text}
          </span>
        )}
      </div>
    </div>
  )
}

export default function Schedule({ matches }) {
  const hasLive = matches.some((m) => m.status.state === 'in')
  const hasToday = matches.some((m) => isToday(m.date))
  const [tab, setTab] = useState(hasLive ? 'live' : hasToday ? 'today' : 'all')
  const [round, setRound] = useState('all')

  const rounds = useMemo(() => {
    const seen = new Map()
    for (const m of matches) seen.set(m.round.key, m.round.name)
    return ROUND_KEYS.filter((k) => seen.has(k)).map((k) => [k, seen.get(k)])
  }, [matches])

  const base = useMemo(
    () => (round === 'all' ? matches : matches.filter((m) => m.round.key === round)),
    [matches, round]
  )
  const counts = useMemo(
    () => ({
      today: base.filter((m) => isToday(m.date)).length,
      live: base.filter((m) => m.status.state === 'in').length,
      pre: base.filter((m) => m.status.state === 'pre').length,
      post: base.filter((m) => m.status.state === 'post').length,
      all: base.length,
    }),
    [base]
  )

  const list = useMemo(() => {
    let l
    if (tab === 'today') l = base.filter((m) => isToday(m.date))
    else if (tab === 'all') l = [...base]
    else l = base.filter((m) => m.status.state === tab || (tab === 'live' && m.status.state === 'in'))
    l.sort((a, b) => new Date(a.date) - new Date(b.date))
    if (tab === 'post') l.reverse()
    return l
  }, [base, tab])

  const groups = useMemo(() => {
    const g = []
    let cur = null
    for (const m of list) {
      const k = dayKey(m.date)
      if (!cur || cur.key !== k) {
        cur = { key: k, label: fmtDay(m.date), ms: [] }
        g.push(cur)
      }
      cur.ms.push(m)
    }
    return g
  }, [list])

  return (
    <section>
      <SectionTitle
        icon="📅"
        title="赛程与比分"
        right={
          <select
            value={round}
            onChange={(e) => setRound(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-white/70 outline-none [&>option]:bg-slate-900"
          >
            <option value="all">全部轮次</option>
            {rounds.map(([k, n]) => (
              <option key={k} value={k}>{n}</option>
            ))}
          </select>
        }
      />
      <Card className="p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                tab === k
                  ? 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30'
                  : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
              }`}
            >
              {label}
              <span className="num ml-1 opacity-60">{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="max-h-[620px] overflow-y-auto pr-1">
          {groups.length === 0 && (
            <div className="py-10 text-center text-sm text-white/35">该筛选下暂无比赛</div>
          )}
          {groups.map((g) => (
            <div key={g.key}>
              <div className="mt-3 flex items-center justify-between px-2 pb-1 first:mt-1">
                <span className="text-xs font-medium text-white/45">{g.label}</span>
                <span className="num text-[11px] text-white/25">{g.ms.length} 场</span>
              </div>
              <div className="space-y-0.5">
                {g.ms.map((m) => (
                  <Row key={m.id} m={m} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
