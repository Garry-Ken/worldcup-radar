import { useMemo } from 'react'
import { useDashboard } from './lib/useDashboard.js'
import { analyze, predictUpcoming } from './lib/analysis.js'
import TopBar from './components/TopBar.jsx'
import LiveStrip from './components/LiveStrip.jsx'
import Predict from './components/Predict.jsx'
import ModelRecord from './components/ModelRecord.jsx'
import Bracket from './components/Bracket.jsx'
import Schedule from './components/Schedule.jsx'
import Insights from './components/Insights.jsx'

function Skeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="glass h-36" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="glass h-64" />
          <div className="glass h-80" />
        </div>
        <div className="space-y-5">
          <div className="glass h-24" />
          <div className="glass h-72" />
        </div>
      </div>
      <p className="text-center text-sm text-white/40">正在连接数据源…</p>
    </div>
  )
}

export default function App() {
  const { data, error, loading, left, interval, reload } = useDashboard()
  const a = useMemo(() => (data ? analyze(data.matches) : null), [data])
  const predictions = useMemo(() => (a ? predictUpcoming(a, 6) : []), [a])

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-14 md:px-6">
      <TopBar data={data} left={left} interval={interval} loading={loading} reload={reload} />

      {!a && <Skeleton />}

      {a && (
        <main className="space-y-7">
          {error && (
            <div className="glass border-rose-400/20 bg-rose-500/[0.07] px-4 py-2.5 text-xs text-rose-200">
              ⚠️ 数据刷新失败（{error}），正在显示上一次数据，将自动重试
            </div>
          )}
          {data.source === 'demo' && (
            <div className="glass border-orange-400/20 bg-orange-500/[0.07] px-4 py-2.5 text-xs text-orange-200">
              🔌 离线演示模式：无法连接 ESPN 数据源，以下比分与对阵均为虚构模拟数据，仅用于展示看板效果
            </div>
          )}

          <LiveStrip live={a.live} upcoming={a.upcoming} />

          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]">
            <div className="min-w-0 space-y-7">
              <Predict predictions={predictions} />
              <ModelRecord matches={data.matches} />
              <Bracket matches={data.matches} />
              <Schedule matches={data.matches} />
            </div>
            <div className="min-w-0">
              <Insights a={a} />
            </div>
          </div>

          <footer className="border-t border-white/[0.06] pt-4 text-center text-[11px] leading-5 text-white/30">
            数据来源：ESPN 公开接口 · 每 {interval} 秒自动刷新 · 时间为本地时区
            <br />
            比分预测为泊松模型推算，仅供娱乐参考，不构成任何投注建议
          </footer>
        </main>
      )}
    </div>
  )
}
