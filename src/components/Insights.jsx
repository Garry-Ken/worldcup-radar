import { useState } from 'react'
import { Card, SectionTitle, TeamFlag, FormDots } from './ui.jsx'

function Tiles({ tiles }) {
  const items = [
    { label: '已赛场次', value: tiles.played, sub: `共 ${tiles.total} 场` },
    { label: '总进球', value: tiles.goals, sub: `场均 ${tiles.avg.toFixed(2)} 球` },
    { label: '零封', value: tiles.cleanSheets, sub: `平局 ${tiles.draws} 场` },
    { label: '加时/点球', value: tiles.extra, sub: '淘汰赛鏖战' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((it) => (
        <Card key={it.label} className="px-4 py-3">
          <div className="text-[11px] text-white/45">{it.label}</div>
          <div className="num mt-0.5 text-2xl font-bold text-white">{it.value}</div>
          <div className="num mt-0.5 text-[11px] text-white/35">{it.sub}</div>
        </Card>
      ))}
    </div>
  )
}

const RANK_CLS = [
  'bg-amber-400/90 text-black',
  'bg-slate-300/90 text-black',
  'bg-orange-600/80 text-white',
]

function PowerTable({ table }) {
  const [all, setAll] = useState(false)
  const rows = all ? table : table.slice(0, 10)
  return (
    <section>
      <SectionTitle icon="⚡" title="球队战力榜" sub="按场均积分" />
      <Card className="px-3 py-2">
        <div className="grid grid-cols-[26px_minmax(0,1fr)_54px_44px_auto] items-center gap-2 px-1 py-1.5 text-[10px] uppercase tracking-wider text-white/30">
          <span>#</span><span>球队</span><span className="text-center">胜平负</span><span className="text-center">进·失</span><span className="text-right">近5场</span>
        </div>
        {rows.map((t, i) => (
          <div
            key={t.name}
            className="grid grid-cols-[26px_minmax(0,1fr)_54px_44px_auto] items-center gap-2 border-t border-white/[0.05] px-1 py-2"
          >
            <span
              className={`num flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                RANK_CLS[i] || 'bg-white/[0.07] text-white/50'
              }`}
            >
              {i + 1}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <TeamFlag team={t} size={17} />
              <span className="truncate text-[13px] text-white/85">{t.cn}</span>
            </span>
            <span className="num text-center text-xs text-white/60">
              {t.w}-{t.d}-{t.l}
            </span>
            <span className="num text-center text-xs">
              <span className="text-emerald-300/90">{t.gf}</span>
              <span className="text-white/25">·</span>
              <span className="text-rose-300/80">{t.ga}</span>
            </span>
            <span className="flex justify-end"><FormDots form={t.form} /></span>
          </div>
        ))}
        <button
          onClick={() => setAll(!all)}
          className="mt-1 w-full rounded-lg py-2 text-xs text-white/40 transition hover:bg-white/[0.05] hover:text-white/70"
        >
          {all ? '收起 ↑' : `展开全部 ${table.length} 队 ↓`}
        </button>
      </Card>
    </section>
  )
}

function ScoreDist({ scorelines }) {
  const top = scorelines.slice(0, 8)
  const max = top[0]?.count || 1
  return (
    <section>
      <SectionTitle icon="📊" title="常见比分" sub="不分主客" />
      <Card className="space-y-2 px-4 py-3">
        {top.map((s) => (
          <div key={s.score} className="flex items-center gap-3">
            <span className="num w-8 text-right text-xs font-semibold text-white/75">{s.score}</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400/80 to-emerald-300/50"
                style={{ width: `${(s.count / max) * 100}%` }}
              />
            </div>
            <span className="num w-8 text-xs text-white/45">{s.count}场</span>
          </div>
        ))}
      </Card>
    </section>
  )
}

const DONUT_COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#fb7185']

function GoalDonut({ buckets, avg }) {
  const total = buckets.reduce((s, b) => s + b.count, 0) || 1
  const R = 40
  const C = 2 * Math.PI * R
  let acc = 0
  return (
    <section>
      <SectionTitle icon="🥅" title="单场进球分布" />
      <Card className="flex items-center gap-5 px-4 py-4">
        <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90">
          {buckets.map((b, i) => {
            const frac = b.count / total
            const el = (
              <circle
                key={b.label}
                cx="50" cy="50" r={R} fill="none"
                stroke={DONUT_COLORS[i]} strokeWidth="13"
                strokeDasharray={`${frac * C} ${C}`}
                strokeDashoffset={-acc * C}
                opacity="0.9"
              />
            )
            acc += frac
            return el
          })}
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="13" />
        </svg>
        <div className="relative -ml-[104px] flex h-28 w-28 shrink-0 flex-col items-center justify-center">
          <span className="num text-lg font-bold text-white">{avg.toFixed(2)}</span>
          <span className="text-[10px] text-white/40">场均进球</span>
        </div>
        <div className="ml-auto space-y-1.5">
          {buckets.map((b, i) => (
            <div key={b.label} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: DONUT_COLORS[i] }} />
              <span className="w-10 text-white/60">{b.label}</span>
              <span className="num text-white/40">
                {b.count}场 · {Math.round((b.count / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}

function TrendBars({ byDay }) {
  const max = Math.max(...byDay.map((d) => d.goals), 1)
  return (
    <section>
      <SectionTitle icon="📈" title="每日进球趋势" sub="绿=小组赛 蓝=淘汰赛" />
      <Card className="px-4 pb-2 pt-4">
        <div className="flex h-24 items-end gap-[3px]">
          {byDay.map((d) => (
            <div
              key={d.day}
              title={`${d.day} · ${d.goals}球 / ${d.matches}场`}
              className={`flex-1 rounded-t-sm transition hover:opacity-100 ${
                d.day >= '06-28' ? 'bg-sky-400/75' : 'bg-emerald-400/65'
              }`}
              style={{ height: `${Math.max(4, (d.goals / max) * 100)}%` }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-white/30">
          <span className="num">{byDay[0]?.day}</span>
          <span className="num">{byDay[Math.floor(byDay.length / 2)]?.day}</span>
          <span className="num">{byDay[byDay.length - 1]?.day}</span>
        </div>
      </Card>
    </section>
  )
}

export default function Insights({ a }) {
  const big = a.tiles.biggest
  return (
    <div className="space-y-6">
      <Tiles tiles={a.tiles} />
      <PowerTable table={a.table} />
      <ScoreDist scorelines={a.scorelines} />
      <GoalDonut buckets={a.buckets} avg={a.tiles.avg} />
      <TrendBars byDay={a.byDay} />
      {big && big.diff >= 3 && (
        <Card className="px-4 py-3 text-xs text-white/55">
          🔥 最大分差：{big.m.home.cn} {big.m.home.score} - {big.m.away.score} {big.m.away.cn}
          <span className="text-white/35">（{big.m.round.name}）</span>
        </Card>
      )}
    </div>
  )
}
