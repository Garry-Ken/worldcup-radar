import { Card, TeamFlag, RoundChip, LiveBadge } from './ui.jsx'
import { countdown, fmtDateTime } from '../lib/format.js'

function BigTeam({ team, align }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${align === 'r' ? 'flex-row-reverse text-right' : ''}`}>
      <TeamFlag team={team} size={34} />
      <div className="min-w-0">
        <div className={`truncate text-[15px] font-semibold ${team.tbd ? 'text-white/35' : 'text-white'}`}>
          {team.cn}
        </div>
        <div className="truncate text-[11px] uppercase tracking-wider text-white/35">{team.abbr}</div>
      </div>
    </div>
  )
}

function Score({ m }) {
  const live = m.status.state === 'in'
  return (
    <div className="flex flex-col items-center px-2">
      <div className={`num flex items-baseline gap-2 text-4xl font-bold ${live ? 'text-white' : 'text-white/90'}`}>
        <span>{m.home.score ?? '–'}</span>
        <span className="text-xl text-white/30">:</span>
        <span>{m.away.score ?? '–'}</span>
      </div>
      {m.status.pens && m.home.pens != null && (
        <div className="num mt-1 text-[11px] text-amber-300/90">点球 {m.home.pens} - {m.away.pens}</div>
      )}
    </div>
  )
}

function LiveCard({ m }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <RoundChip round={m.round} />
        <LiveBadge text={m.status.clock || 'LIVE'} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <BigTeam team={m.home} />
        <Score m={m} />
        <BigTeam team={m.away} align="r" />
      </div>
      <div className="mt-3 truncate text-center text-[11px] text-white/35">
        {m.venue.name}{m.venue.city ? ` · ${m.venue.city}` : ''}
      </div>
    </Card>
  )
}

function NextCard({ m }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <RoundChip round={m.round} />
        <span className="chip num bg-sky-400/10 text-sky-300 ring-1 ring-sky-400/25">
          ⏱ 距开赛 {countdown(m.date)}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <BigTeam team={m.home} />
        <div className="px-3 text-lg font-bold tracking-widest text-white/25">VS</div>
        <BigTeam team={m.away} align="r" />
      </div>
      <div className="mt-3 truncate text-center text-[11px] text-white/35">
        {fmtDateTime(m.date)} · {m.venue.name}
      </div>
    </Card>
  )
}

export default function LiveStrip({ live, upcoming }) {
  const showLive = live.length > 0
  const next = upcoming.filter((m) => !m.home.tbd && !m.away.tbd).slice(0, 2)
  const list = showLive ? live : next
  if (!list.length) return null
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[15px] font-semibold text-white">
          {showLive ? '正在进行' : '即将开赛'}
        </h2>
        {showLive && <LiveBadge text={`${live.length} 场直播中`} />}
      </div>
      <div className={`grid gap-4 ${list.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {list.map((m) => (showLive ? <LiveCard key={m.id} m={m} /> : <NextCard key={m.id} m={m} />))}
      </div>
    </section>
  )
}
