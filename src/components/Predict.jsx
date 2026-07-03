import { Card, SectionTitle, TeamFlag, RoundChip } from './ui.jsx'
import { fmtDateTime } from '../lib/format.js'

const pct = (v) => `${Math.round(v * 100)}%`

function ProbBar({ p }) {
  const seg = (v, cls, label) => (
    <div
      className={`flex h-full items-center justify-center overflow-hidden ${cls}`}
      style={{ width: `${Math.max(2, v * 100)}%` }}
      title={`${label} ${pct(v)}`}
    >
      {v >= 0.14 && <span className="num px-1 text-[10px] font-semibold text-black/70">{pct(v)}</span>}
    </div>
  )
  return (
    <div className="flex h-5 w-full overflow-hidden rounded-full ring-1 ring-white/10">
      {seg(p.pH, 'bg-emerald-400/90', '主胜')}
      {seg(p.pD, 'bg-slate-400/80', '平局')}
      {seg(p.pA, 'bg-sky-400/90', '客胜')}
    </div>
  )
}

function Row({ p }) {
  const { m } = p
  return (
    <div className="border-t border-white/[0.06] py-3.5 first:border-0 first:pt-1 last:pb-1">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-white">
          <TeamFlag team={m.home} size={18} />
          <span className="truncate">{m.home.cn}</span>
          <span className="px-0.5 text-xs text-white/30">vs</span>
          <TeamFlag team={m.away} size={18} />
          <span className="truncate">{m.away.cn}</span>
        </div>
        <div className="flex items-center gap-2">
          <RoundChip round={m.round} />
          <span className="num text-[11px] text-white/40">{fmtDateTime(m.date)}</span>
        </div>
      </div>
      <ProbBar p={p} />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-white/40">比分概率</span>
        {p.top.map((c, i) => (
          <span
            key={i}
            className={`chip num ring-1 ${
              i === 0
                ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/25'
                : 'bg-white/[0.05] text-white/60 ring-white/10'
            }`}
          >
            {c.h}-{c.a}
            <span className="opacity-60">{pct(c.p)}</span>
          </span>
        ))}
        {(() => {
          const blow = p.blowH >= p.blowA
            ? { cn: p.m.home.cn, v: p.blowH }
            : { cn: p.m.away.cn, v: p.blowA }
          return blow.v >= 0.12 ? (
            <span className="chip num bg-amber-400/10 text-amber-300/90 ring-1 ring-amber-400/20">
              {blow.cn}净胜2+ {pct(blow.v)}
            </span>
          ) : null
        })()}
        <span className="num ml-auto hidden text-[11px] text-white/30 sm:block">
          xG {p.lh.toFixed(2)} : {p.la.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

export default function Predict({ predictions }) {
  if (!predictions.length) return null
  return (
    <section>
      <SectionTitle
        icon="🎯"
        title="胜负 · 比分预测"
        sub="泊松模型 · 赛前实力先验 × 本届攻防校准 · 娱乐参考"
      />
      <Card className="px-4 py-2.5">
        <div className="mb-1 mt-1.5 flex items-center gap-3 text-[11px] text-white/45">
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-400/90" />左队胜</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-slate-400/80" />90分钟平</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-sky-400/90" />右队胜</span>
        </div>
        {predictions.map((p) => (
          <Row key={p.m.id} p={p} />
        ))}
      </Card>
    </section>
  )
}
