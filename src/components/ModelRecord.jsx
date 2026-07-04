import { useMemo } from 'react'
import { Card, SectionTitle, TeamFlag } from './ui.jsx'
import { modelRecord } from '../lib/analysis.js'

const DIR_CN = { H: '主胜', D: '平', A: '客胜' }
const pct = (v) => `${Math.round(v * 100)}%`

function Stat({ label, value, sub }) {
  return (
    <div>
      <div className="text-[11px] text-white/45">{label}</div>
      <div className="num mt-0.5 text-xl font-bold text-white">{value}</div>
      {sub && <div className="num mt-0.5 text-[10px] text-white/35">{sub}</div>}
    </div>
  )
}

export default function ModelRecord({ matches }) {
  const r = useMemo(() => modelRecord(matches), [matches])
  if (!r || r.n < 5) return null
  return (
    <section>
      <SectionTitle icon="📋" title="模型战绩" sub="滚动复盘 · 每场只用其开赛前的数据预测" />
      <Card className="px-4 py-3.5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Stat label="胜平负方向命中" value={`${r.dir}/${r.n}`} sub={pct(r.dir / r.n)} />
          <Stat label="实际结果平均概率" value={r.avgP.toFixed(3)} sub="三向瞎猜 = 0.333" />
          <Stat label="比分落在前3预测" value={`${r.top3}/${r.scoreN}`} sub={r.scoreN ? pct(r.top3 / r.scoreN) : '—'} />
          <Stat label="比分落在前5预测" value={`${r.top5}/${r.scoreN}`} sub={r.scoreN ? pct(r.top5 / r.scoreN) : '—'} />
        </div>
        <div className="mt-3 rounded-lg bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/45">
          平局校准：模型平均 <span className="num text-white/70">{pct(r.drawPred)}</span> vs 实际发生{' '}
          <span className="num text-white/70">{pct(r.drawReal)}</span>
          <span className="text-white/30">（加时/点球按竞彩口径计为 90 分钟平局）</span>
        </div>
        <div className="mt-2 space-y-1">
          {r.rows.map(({ m, predDir, actual, hit, pActual }) => (
            <div key={m.id} className="flex items-center gap-2 border-t border-white/[0.05] py-1.5 text-xs">
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <TeamFlag team={m.home} size={14} />
                <span className="truncate text-white/70">{m.home.cn}</span>
                <span className="num text-white/85">{m.home.score}-{m.away.score}</span>
                <span className="truncate text-white/70">{m.away.cn}</span>
                {m.status.aet && <span className="text-[9px] text-amber-300/70">加时</span>}
              </span>
              <span className="num text-white/40">
                判{DIR_CN[predDir]} · 实{DIR_CN[actual]}
                <span className="ml-1 text-white/30">({pct(pActual)})</span>
              </span>
              <span className={hit ? 'text-emerald-300' : 'text-rose-300'}>{hit ? '✓' : '✗'}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-4 text-white/30">
          复盘范围：训练样本满 36 场后的全部已完赛比赛；比分命中统计不含加时场次（90 分钟比分不可知）。
          括号内为模型赛前给实际结果的概率。
        </p>
      </Card>
    </section>
  )
}
