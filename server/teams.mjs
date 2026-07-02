// 国家队注册表：ESPN 英文名 → 中文名 + ISO 代码（旗帜 emoji 用）
const T = [
  ['United States', '美国', 'us', ['USA', 'United States of America']],
  ['Mexico', '墨西哥', 'mx'],
  ['Canada', '加拿大', 'ca'],
  ['Argentina', '阿根廷', 'ar'],
  ['Brazil', '巴西', 'br'],
  ['Ecuador', '厄瓜多尔', 'ec'],
  ['Colombia', '哥伦比亚', 'co'],
  ['Uruguay', '乌拉圭', 'uy'],
  ['Paraguay', '巴拉圭', 'py'],
  ['Bolivia', '玻利维亚', 'bo'],
  ['Venezuela', '委内瑞拉', 've'],
  ['Chile', '智利', 'cl'],
  ['Peru', '秘鲁', 'pe'],
  ['England', '英格兰', 'gb-eng'],
  ['Scotland', '苏格兰', 'gb-sct'],
  ['Wales', '威尔士', 'gb-wls'],
  ['France', '法国', 'fr'],
  ['Spain', '西班牙', 'es'],
  ['Portugal', '葡萄牙', 'pt'],
  ['Netherlands', '荷兰', 'nl', ['Holland']],
  ['Germany', '德国', 'de'],
  ['Belgium', '比利时', 'be'],
  ['Croatia', '克罗地亚', 'hr'],
  ['Switzerland', '瑞士', 'ch'],
  ['Austria', '奥地利', 'at'],
  ['Norway', '挪威', 'no'],
  ['Italy', '意大利', 'it'],
  ['Türkiye', '土耳其', 'tr', ['Turkey', 'Turkiye']],
  ['Ukraine', '乌克兰', 'ua'],
  ['Poland', '波兰', 'pl'],
  ['Denmark', '丹麦', 'dk'],
  ['Czechia', '捷克', 'cz', ['Czech Republic']],
  ['Sweden', '瑞典', 'se'],
  ['Republic of Ireland', '爱尔兰', 'ie', ['Ireland']],
  ['Slovakia', '斯洛伐克', 'sk'],
  ['Slovenia', '斯洛文尼亚', 'si'],
  ['Romania', '罗马尼亚', 'ro'],
  ['Hungary', '匈牙利', 'hu'],
  ['Greece', '希腊', 'gr'],
  ['Serbia', '塞尔维亚', 'rs'],
  ['Bosnia and Herzegovina', '波黑', 'ba', ['Bosnia-Herzegovina', 'Bosnia']],
  ['Albania', '阿尔巴尼亚', 'al'],
  ['North Macedonia', '北马其顿', 'mk'],
  ['Kosovo', '科索沃', 'xk'],
  ['Finland', '芬兰', 'fi'],
  ['Iceland', '冰岛', 'is'],
  ['Morocco', '摩洛哥', 'ma'],
  ['Senegal', '塞内加尔', 'sn'],
  ['Egypt', '埃及', 'eg'],
  ['Algeria', '阿尔及利亚', 'dz'],
  ['Tunisia', '突尼斯', 'tn'],
  ["Côte d'Ivoire", '科特迪瓦', 'ci', ["Cote d'Ivoire", 'Ivory Coast']],
  ['Ghana', '加纳', 'gh'],
  ['Cape Verde', '佛得角', 'cv', ['Cabo Verde', 'Cape Verde Islands']],
  ['South Africa', '南非', 'za'],
  ['Nigeria', '尼日利亚', 'ng'],
  ['Cameroon', '喀麦隆', 'cm'],
  ['DR Congo', '刚果(金)', 'cd', ['Congo DR', 'Democratic Republic of the Congo']],
  ['Japan', '日本', 'jp'],
  ['South Korea', '韩国', 'kr', ['Korea Republic', 'Korea']],
  ['Iran', '伊朗', 'ir', ['IR Iran']],
  ['Australia', '澳大利亚', 'au'],
  ['Saudi Arabia', '沙特阿拉伯', 'sa'],
  ['Qatar', '卡塔尔', 'qa'],
  ['Uzbekistan', '乌兹别克斯坦', 'uz'],
  ['Jordan', '约旦', 'jo'],
  ['Iraq', '伊拉克', 'iq'],
  ['United Arab Emirates', '阿联酋', 'ae', ['UAE']],
  ['Panama', '巴拿马', 'pa'],
  ['Curaçao', '库拉索', 'cw', ['Curacao']],
  ['Haiti', '海地', 'ht'],
  ['Jamaica', '牙买加', 'jm'],
  ['Honduras', '洪都拉斯', 'hn'],
  ['Costa Rica', '哥斯达黎加', 'cr'],
  ['Suriname', '苏里南', 'sr'],
  ['New Zealand', '新西兰', 'nz'],
  ['New Caledonia', '新喀里多尼亚', 'nc'],
]

const SPECIAL_FLAGS = {
  'gb-eng': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'gb-sct': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'gb-wls': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  xk: '🏳️',
}

export function flagEmoji(iso) {
  if (!iso) return '⚽'
  if (SPECIAL_FLAGS[iso]) return SPECIAL_FLAGS[iso]
  if (!/^[a-z]{2}$/.test(iso)) return '⚽'
  return String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))
}

const INDEX = new Map()
for (const [en, cn, iso, aliases = []] of T) {
  const rec = { en, cn, iso, flag: flagEmoji(iso) }
  for (const key of [en, ...aliases]) INDEX.set(key.toLowerCase(), rec)
}

// ESPN 未定对阵占位名，如 "Round of 32 11 Winner" / "Semifinal 1 Loser"
const PLACEHOLDER = /^(Round of 32|Round of 16|Quarterfinal|Semifinal|Final) (\d+) (Winner|Loser)$/
const ROUND_CN = {
  'Round of 32': '1/16决赛',
  'Round of 16': '1/8决赛',
  Quarterfinal: '1/4决赛',
  Semifinal: '半决赛',
  Final: '决赛',
}

export function teamInfo(name) {
  if (!name || /^tbd$/i.test(name)) return { en: 'TBD', cn: '待定', iso: null, flag: '❔', tbd: true }
  const ph = PLACEHOLDER.exec(name)
  if (ph) {
    const cn = `${ROUND_CN[ph[1]]}第${ph[2]}场${ph[3] === 'Winner' ? '胜者' : '负者'}`
    return { en: name, cn, iso: null, flag: '❔', tbd: true }
  }
  const rec = INDEX.get(String(name).toLowerCase())
  return rec || { en: name, cn: name, iso: null, flag: '⚽' }
}
