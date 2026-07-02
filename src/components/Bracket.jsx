import { SectionTitle, TeamFlag } from './ui.jsx'
import { statusLabel } from '../lib/format.js'

const short = (iso) => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function MiniRow({ team, m }) {
  const post = m.status.state === 'post'
  const cls = team.tbd
    ? 'text-white/30'
    : post
      ? team.winner
        ? 'font-semibold text-emerald-300'
        : 'text-white/45'
      : 'text-white/85'
  return (
    <div className="flex items-center gap-1.5 py-[3px]">
      <TeamFlag team={team} size={15} />
      <span className={`min-w-0 flex-1 truncate text-xs ${cls}`}>{team.tbd ? '待定' : team.cn}</span>
      <span className={`num text-xs ${cls}`}>
        {team.score ?? ''}
        {m.status.pens && team.pens != null && (
          <span className="ml-0.5 text-[9px] opacity-70">({team.pens})</span>
        )}
      </span>
    </div>
  )
}

function Mini({ m, highlight = false }) {
  const s = statusLabel(m)
  return (
    <div
      className={`w-44 shrink-0 rounded-xl border p-2 ${
        highlight
          ? 'border-amber-400/25 bg-amber-400/[0.06]'
          : 'border-white/[0.08] bg-white/[0.04]'
      }`}
    >
      <MiniRow team={m.home} m={m} />
      <MiniRow team={m.away} m={m} />
      <div className="mt-1 flex items-center justify-between border-t border-white/[0.06] pt-1 text-[10px] text-white/35">
        <span className="num">{short(m.date)}</span>
        <span className={`num ${s.tone === 'live' ? 'font-semibold text-rose-300' : ''}`}>
          {s.tone === 'live' ? `● ${s.text}` : s.text}
        </span>
      </div>
    </div>
  )
}

function Col({ title, ms, center = false }) {
  return (
    <div className="flex flex-col">
      <div className="mb-2 text-center text-[11px] font-medium tracking-wider text-white/40">{title}</div>
      <div className={`flex flex-1 flex-col gap-2 ${center ? 'justify-center' : 'justify-around'}`}>
        {ms.map((m) => (
          <Mini key={m.id} m={m} highlight={m.round.key === 'final'} />
        ))}
      </div>
    </div>
  )
}

export default function Bracket({ matches }) {
  const by = (key) =>
    matches.filter((m) => m.round.key === key).sort((a, b) => new Date(a.date) - new Date(b.date))
  const r32 = by('r32')
  const r16 = by('r16')
  const qf = by('qf')
  const sf = by('sf')
  const final = by('final')
  const bronze = by('bronze')
  if (!r32.length) return null
  const half = (arr) => [arr.slice(0, arr.length / 2), arr.slice(arr.length / 2)]
  const [r32L, r32R] = half(r32)
  const [r16L, r16R] = half(r16)
  const [qfL, qfR] = half(qf)
  const [sfL, sfR] = half(sf)

  return (
    <section>
      <SectionTitle icon="🏆" title="淘汰赛对阵" sub="1/16决赛 → 决赛 · 左右分半区" />
      <div className="glass overflow-x-auto p-4">
        <div className="flex min-w-max items-stretch gap-3">
          <Col title="1/16决赛" ms={r32L} />
          <Col title="1/8决赛" ms={r16L} />
          <Col title="1/4决赛" ms={qfL} />
          <Col title="半决赛" ms={sfL} />
          <div className="flex flex-col">
            <div className="mb-2 text-center text-[11px] font-medium tracking-wider text-amber-300/80">决赛</div>
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="text-3xl">🏆</div>
              {final.map((m) => (
                <Mini key={m.id} m={m} highlight />
              ))}
              {bronze.length > 0 && (
                <div>
                  <div className="mb-1 text-center text-[10px] text-white/35">季军赛</div>
                  {bronze.map((m) => (
                    <Mini key={m.id} m={m} />
                  ))}
                </div>
              )}
            </div>
          </div>
          <Col title="半决赛" ms={sfR} />
          <Col title="1/4决赛" ms={qfR} />
          <Col title="1/8决赛" ms={r16R} />
          <Col title="1/16决赛" ms={r32R} />
        </div>
      </div>
    </section>
  )
}
