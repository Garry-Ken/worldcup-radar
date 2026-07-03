import { useState } from 'react'
import { Card, SectionTitle, TeamFlag, RoundChip } from './ui.jsx'
import { fmtDateTime } from '../lib/format.js'

const pct = (v) => `${Math.round(v * 100)}%`
const pct1 = (v) => (v * 100 < 9.5 ? `${(v * 100).toFixed(1)}%` : `${Math.round(v * 100)}%`)

// 公平赔率 = 1/概率（体彩实际赔率含销售抽成，普遍低于公平赔率）
function fmtOdds(p) {
  if (!p || p < 1 / 500) return '500+'
  const o = 1 / p
  if (o >= 100) return o.toFixed(0)
  if (o >= 10) return o.toFixed(1)
  return o.toFixed(2)
}

const TABS = [
  ['wdl', '胜平负'],
  ['rq', '让球'],
  ['bf', '比分'],
  ['jq', '总进球'],
  ['bqc', '半全场'],
]

function ProbBar({ h, d, a, labels }) {
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
      {seg(h, 'bg-emerald-400/90', labels[0])}
      {seg(d, 'bg-slate-400/80', labels[1])}
      {seg(a, 'bg-sky-400/90', labels[2])}
    </div>
  )
}

function OddsTrio({ h, d, a, labels }) {
  const item = (label, v, cls) => (
    <span className="num text-[11px] text-white/50">
      <i className={`mr-1 inline-block h-2 w-2 rounded-full align-[-1px] ${cls}`} />
      {label} {pct(v)}
      <span className="ml-1 text-white/35">赔 {fmtOdds(v)}</span>
    </span>
  )
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
      {item(labels[0], h, 'bg-emerald-400/90')}
      {item(labels[1], d, 'bg-slate-400/80')}
      {item(labels[2], a, 'bg-sky-400/90')}
    </div>
  )
}

const RES_CLS = {
  H: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/25',
  D: 'bg-slate-400/10 text-slate-300 ring-slate-400/25',
  A: 'bg-sky-400/10 text-sky-300 ring-sky-400/25',
}

function OptionChip({ label, p, cls = 'bg-white/[0.05] text-white/65 ring-white/10', hot = false }) {
  return (
    <span className={`chip num ring-1 ${hot ? 'bg-amber-400/10 text-amber-300 ring-amber-400/25' : cls}`}>
      {label}
      <span className="opacity-70">{pct1(p)}</span>
      <span className="opacity-45">赔{fmtOdds(p)}</span>
    </span>
  )
}

function Row({ p, tab }) {
  const { m, jc } = p
  const rq = jc.handicap
  const rqLabel = rq.line > 0 ? `主让${rq.line}球 (-${rq.line})` : `主受让${-rq.line}球 (+${-rq.line})`
  const maxJq = Math.max(...jc.totals.map((t) => t.p))
  return (
    <div className="border-t border-white/[0.06] py-3.5 first:border-0 first:pt-2 last:pb-1">
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
          <span className="num hidden text-[11px] text-white/30 sm:block">xG {p.lh.toFixed(2)}:{p.la.toFixed(2)}</span>
        </div>
      </div>

      {tab === 'wdl' && (
        <>
          <ProbBar h={p.pH} d={p.pD} a={p.pA} labels={['主胜', '平', '客胜']} />
          <OddsTrio h={p.pH} d={p.pD} a={p.pA} labels={['主胜', '平', '客胜']} />
        </>
      )}

      {tab === 'rq' && (
        <>
          <div className="mb-1.5">
            <span className="chip bg-violet-400/10 text-violet-300 ring-1 ring-violet-400/25">{rqLabel}</span>
            <span className="ml-2 text-[11px] text-white/35">按 xG 差自动定让球线，实际以体彩开出的为准</span>
          </div>
          <ProbBar h={rq.h} d={rq.d} a={rq.a} labels={['让球胜', '让球平', '让球负']} />
          <OddsTrio h={rq.h} d={rq.d} a={rq.a} labels={['让球胜', '让球平', '让球负']} />
        </>
      )}

      {tab === 'bf' && (
        <div className="flex flex-wrap items-center gap-1.5">
          {[...jc.scores]
            .sort((x, y) => y.p - x.p)
            .slice(0, 8)
            .map((s) => (
              <OptionChip key={s.key} label={s.key} p={s.p} cls={RES_CLS[s.res]} />
            ))}
          <span className="text-[10px] text-white/30">（竞彩共 31 项，此处列概率前 8）</span>
        </div>
      )}

      {tab === 'jq' && (
        <div className="flex flex-wrap items-center gap-1.5">
          {jc.totals.map((t) => (
            <OptionChip key={t.key} label={`${t.key}球`} p={t.p} hot={t.p === maxJq} />
          ))}
        </div>
      )}

      {tab === 'bqc' && (
        <div className="flex flex-wrap items-center gap-1.5">
          {jc.halfFull.map((x) => (
            <OptionChip key={x.key} label={x.key} p={x.p} />
          ))}
          <span className="text-[10px] text-white/30">半场/全场（主队视角）</span>
        </div>
      )}
    </div>
  )
}

export default function Predict({ predictions }) {
  const [tab, setTab] = useState('wdl')
  if (!predictions.length) return null
  return (
    <section>
      <SectionTitle
        icon="🎯"
        title="胜负 · 比分预测"
        sub="竞彩五玩法口径 · 泊松模型 · 娱乐参考"
        right={
          <div className="flex flex-wrap gap-1">
            {TABS.map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  tab === k
                    ? 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30'
                    : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />
      <Card className="px-4 py-2.5">
        {predictions.map((p) => (
          <Row key={p.m.id} p={p} tab={tab} />
        ))}
        <div className="mt-2 space-y-1 border-t border-white/[0.08] py-3 text-[10.5px] leading-4 text-white/35">
          <p>· 竞彩口径：各玩法均按 90 分钟（含伤停补时）结果结算，淘汰赛的加时与点球不计入。</p>
          <p>
            · 兑奖机制：竞彩为固定赔率，2 元/注，奖金 = 2 元 × 购票时锁定的体彩实际赔率 × 倍数。
            本面板显示的是<span className="text-white/55">模型公平赔率（= 1 ÷ 概率）</span>，仅供对照——
            竞彩理论返奖率约 73%，<span className="text-white/55">实际赔率普遍低于公平赔率</span>，长期买必然面对抽成损耗。
          </p>
          <p>· 奖金额度：单票中奖上限 50 万元；兑奖期为开奖后 60 个自然日；单注奖金超 1 万元按全额缴纳 20% 偶然所得税。</p>
          <p>· 理性购彩、量力而行，未满 18 周岁禁止购彩。本工具仅为概率演示，不构成任何投注建议。</p>
        </div>
      </Card>
    </section>
  )
}
