const SOURCE_META = {
  espn: { dot: 'bg-emerald-400', text: '实时数据 · ESPN', cls: 'text-emerald-300 ring-emerald-400/25 bg-emerald-400/10' },
  stale: { dot: 'bg-amber-400', text: '实时数据 · 缓存', cls: 'text-amber-300 ring-amber-400/25 bg-amber-400/10' },
  demo: { dot: 'bg-orange-400', text: '演示数据 · 离线模拟', cls: 'text-orange-300 ring-orange-400/25 bg-orange-400/10' },
}

export default function TopBar({ data, left, interval, loading, reload }) {
  const key = !data ? 'espn' : data.source === 'demo' ? 'demo' : data.stale ? 'stale' : 'espn'
  const meta = SOURCE_META[key]
  const C = 2 * Math.PI * 10

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 py-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/25 to-sky-500/20 text-2xl ring-1 ring-white/15">
          ⚽
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-wide text-white">
            绿茵雷达
            <span className="ml-2 bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-sm font-semibold text-transparent">
              World Cup 2026
            </span>
          </h1>
          <p className="mt-0.5 text-xs text-white/45">
            {data?.tournament || 'FIFA 世界杯 2026'} · 实时胜负与比分分析看板
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className={`chip ring-1 ${meta.cls}`}>
          <span className={`live-dot h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.text}
        </span>
        {data && (
          <span className="num hidden text-xs text-white/40 sm:block">
            更新于 {new Date(data.fetchedAt).toLocaleTimeString('zh-CN', { hour12: false })}
          </span>
        )}
        <button
          onClick={reload}
          title="立即刷新"
          className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] transition hover:bg-white/[0.1]"
        >
          <svg viewBox="0 0 24 24" className="absolute inset-0 h-9 w-9 -rotate-90">
            <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            <circle
              cx="12" cy="12" r="10" fill="none"
              stroke="rgba(52,211,153,0.8)" strokeWidth="1.5" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - left / interval)}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <span className={`text-sm text-white/70 group-hover:text-white ${loading ? 'animate-spin' : ''}`}>↻</span>
        </button>
      </div>
    </header>
  )
}
