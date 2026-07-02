import { useState } from 'react'

export function Card({ className = '', children }) {
  return <div className={`glass ${className}`}>{children}</div>
}

export function SectionTitle({ icon, title, sub, right }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-base leading-none">{icon}</span>}
        <h2 className="text-[15px] font-semibold tracking-wide text-white">{title}</h2>
        {sub && <span className="pb-px text-xs text-white/40">{sub}</span>}
      </div>
      {right}
    </div>
  )
}

// 旗帜：ESPN 提供 logo 时用图，失败/缺失回退 emoji
export function TeamFlag({ team, size = 20, className = '' }) {
  const [err, setErr] = useState(false)
  if (team?.logo && !err) {
    return (
      <img
        src={team.logo}
        onError={() => setErr(true)}
        width={size}
        height={size}
        loading="lazy"
        alt=""
        className={`shrink-0 rounded-full object-cover ring-1 ring-white/15 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span className={`shrink-0 leading-none ${className}`} style={{ fontSize: size * 0.85 }}>
      {team?.flag || '⚽'}
    </span>
  )
}

export function RoundChip({ round }) {
  const gold = round.key === 'final' || round.key === 'sf'
  return (
    <span
      className={`chip ${
        gold
          ? 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20'
          : 'bg-white/[0.06] text-white/60 ring-1 ring-white/10'
      }`}
    >
      {round.name}
      {round.group ? ` · ${round.group}组` : ''}
    </span>
  )
}

export function LiveBadge({ text = 'LIVE' }) {
  return (
    <span className="chip bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30">
      <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
      {text}
    </span>
  )
}

export function FormDots({ form }) {
  const color = { W: 'bg-emerald-400', D: 'bg-slate-400', L: 'bg-rose-400' }
  return (
    <span className="inline-flex items-center gap-[3px]">
      {form.map((f, i) => (
        <span key={i} title={f} className={`h-1.5 w-1.5 rounded-full ${color[f]}`} />
      ))}
    </span>
  )
}
