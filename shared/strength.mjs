// 赛前实力先验（Elo 型，主观标定 + 常识校准），按 ISO 码索引以免别名漂移。
// 用途：① 演示模式模拟比分 ② 预测模型的贝叶斯先验（防止 4-5 场小样本把弱旅摆大巴刷的数据当真实力）
import { teamInfo } from './teams.mjs'

export const STRENGTH_BY_ISO = {
  es: 2110, ar: 2095, fr: 2075, 'gb-eng': 2050, br: 2030, pt: 2010, nl: 1985,
  de: 1975, it: 1950, be: 1935, hr: 1925, uy: 1915, co: 1905, ma: 1900,
  jp: 1880, us: 1860, no: 1855, ch: 1850, mx: 1845, dk: 1840, at: 1832,
  tr: 1828, ua: 1820, se: 1815, sn: 1810, pl: 1810, kr: 1800, ec: 1795,
  cz: 1795, ca: 1790, rs: 1790, ng: 1790, ir: 1782, cm: 1780, py: 1778,
  ci: 1775, ba: 1770, au: 1768, dz: 1765, 'gb-sct': 1758, eg: 1755, ro: 1755,
  'gb-wls': 1750, hu: 1750, tn: 1748, sk: 1745, si: 1740, gh: 1740, ie: 1730,
  cl: 1720, fi: 1710, pe: 1710, sa: 1700, is: 1700, ve: 1700, cr: 1700,
  za: 1695, cd: 1698, mk: 1690, il: 1690, pa: 1688, uz: 1685, xk: 1680,
  ae: 1680, qa: 1678, hn: 1660, jo: 1660, iq: 1650, jm: 1650, bo: 1640,
  nz: 1640, cv: 1620, sr: 1620, cw: 1600, ht: 1590, nc: 1500,
}

const DEFAULT_STRENGTH = 1750
const SBAR = 1800 // 参赛队平均水位锚点

export function priorStrength(name) {
  const iso = teamInfo(name).iso
  return (iso && STRENGTH_BY_ISO[iso]) || DEFAULT_STRENGTH
}

// 攻防先验倍率：两队对阵时 E[进球比率] = 10^(实力差/750)
export function priorAtt(name) {
  return Math.pow(10, (priorStrength(name) - SBAR) / 750)
}
export function priorDef(name) {
  return Math.pow(10, (SBAR - priorStrength(name)) / 750)
}
