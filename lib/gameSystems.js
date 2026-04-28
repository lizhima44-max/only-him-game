// ══════════════════════════════════════════════════════
//  游戏系统 — 天气 / 季节 / 新一天 / 大姨妈 / 生病
//  纯逻辑层，不含UI渲染
// ══════════════════════════════════════════════════════

// ── 季节 ──
const SEASONS = {
  spring: { name: '春', months: [3,4,5], tempRange: [12, 24] },
  summer: { name: '夏', months: [6,7,8], tempRange: [26, 38] },
  autumn: { name: '秋', months: [9,10,11], tempRange: [10, 22] },
  winter: { name: '冬', months: [12,1,2], tempRange: [-2, 10] },
}

export function getSeason(month) {
  for (const [id, s] of Object.entries(SEASONS)) {
    if (s.months.includes(month)) return id
  }
  return 'spring'
}

export function getSeasonInfo(seasonId) {
  return SEASONS[seasonId] || SEASONS.spring
}

// ── 天气 ──
const WEATHERS = {
  sunny:   { name: '晴', emoji: '☀️', desc: '阳光正好' },
  cloudy:  { name: '多云', emoji: '⛅', desc: '天阴沉沉的' },
  rainy:   { name: '下雨', emoji: '🌧️', desc: '外面在下雨' },
  storm:   { name: '暴雨', emoji: '⛈️', desc: '外面雷雨交加' },
  snowy:   { name: '下雪', emoji: '❄️', desc: '外面飘着雪' },
  windy:   { name: '大风', emoji: '💨', desc: '风很大' },
  foggy:   { name: '雾', emoji: '🌫️', desc: '雾蒙蒙的' },
}

// 根据季节随机天气
export function genWeather(month) {
  const season = getSeason(month)
  const weights = {
    spring: { sunny: 35, cloudy: 25, rainy: 25, foggy: 10, windy: 5 },
    summer: { sunny: 40, cloudy: 15, rainy: 20, storm: 15, foggy: 5, windy: 5 },
    autumn: { sunny: 30, cloudy: 30, rainy: 15, windy: 15, foggy: 10 },
    winter: { sunny: 20, cloudy: 30, rainy: 10, snowy: 20, windy: 10, foggy: 10 },
  }
  const w = weights[season] || weights.spring
  const total = Object.values(w).reduce((a,b) => a+b, 0)
  let r = Math.random() * total
  for (const [k, v] of Object.entries(w)) {
    r -= v
    if (r <= 0) return k
  }
  return 'sunny'
}

export function getWeatherInfo(weatherId) {
  return WEATHERS[weatherId] || WEATHERS.sunny
}

// 温度
export function genTemp(seasonId) {
  const s = SEASONS[seasonId] || SEASONS.spring
  const [min, max] = s.tempRange
  return Math.round(min + Math.random() * (max - min))
}

// ── 游戏日期 ──
// day=1 从 2024-09-01 开始算
const BASE_DATE = new Date(2024, 8, 1) // 9月1日

export function gameDate(day) {
  const d = new Date(BASE_DATE)
  d.setDate(d.getDate() + day - 1)
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), weekday: d.getDay() }
}

export function gameDateStr(day) {
  const gd = gameDate(day)
  const weekNames = ['日','一','二','三','四','五','六']
  return `${gd.m}月${gd.d}日 周${weekNames[gd.weekday]}`
}

// ── 新的一天 ──
export function processNewDay(dayState) {
  const newDay = (dayState.day || 0) + 1
  const gd = gameDate(newDay)
  const season = getSeason(gd.m)
  const weather = genWeather(gd.m)
  const temp = genTemp(season)

  // 生病随机
  let sickWho = null
  const rnd = Math.random()
  if (rnd < 0.08) sickWho = 'player'      // 8%概率女主生病
  else if (rnd < 0.14) sickWho = 'lu'      // 6%概率他生病

  // 浪漫值衰减到30%
  const romantic = Math.max(0, Math.round((dayState.romantic || 0) * 0.3))

  // 蜡烛熄灭
  const candleLit = false

  // 检查是否经期
  const isPeriod = checkIsPeriod(dayState.periodDays || [], gd)

  // 系统消息
  const seasonInfo = getSeasonInfo(season)
  const weatherInfo = getWeatherInfo(weather)
  const sysMsg = `🌅 第${newDay}天 · ${gameDateStr(newDay)} · ${seasonInfo.name} ${weatherInfo.emoji} ${temp}°`

  const events = [sysMsg]
  if (isPeriod) events.push('🩸 生理期中，他会更体贴')
  if (sickWho === 'player') events.push('🤒 你今天不太舒服')
  if (sickWho === 'lu') events.push(`🤒 他今天不太舒服`)
  if (weather === 'storm') events.push('⛈️ 外面雷雨交加')
  if (weather === 'snowy') events.push('❄️ 外面下雪了')

  return {
    day: newDay,
    season,
    weather,
    temp,
    sickWho,
    romantic,
    candleLit,
    isPeriod,
    events,
    gameDate: gd,
  }
}

// ── 给 AI 的天气/状态 prompt 片段 ──
export function getContextPrompt(dayState) {
  if (!dayState?.day) return ''
  const gd = gameDate(dayState.day)
  const seasonInfo = getSeasonInfo(dayState.season)
  const weatherInfo = getWeatherInfo(dayState.weather)

  let ctx = `【当前状态】第${dayState.day}天，${gameDateStr(dayState.day)}，${seasonInfo.name}天${weatherInfo.desc}，${dayState.temp}°C。`

  if (dayState.isPeriod) {
    ctx += '\n她正在生理期，可能身体不适或情绪敏感，请格外温柔体贴，不要主动提起亲密。'
  }
  if (dayState.sickWho === 'lu') {
    ctx += '\n你今天身体不太舒服（感冒），会稍微虚弱一点，但还是想陪着她。'
  }
  if (dayState.sickWho === 'player') {
    ctx += '\n她今天身体不舒服，请主动关心照顾她。'
  }
  if (dayState.weather === 'storm') {
    ctx += '\n外面雷雨交加，适合待在家里。'
  }

  return ctx
}


// ══════════════════════════════════════════════════════
//  大姨妈系统
// ══════════════════════════════════════════════════════

// periodDays: ['2024-10-15', '2024-10-16', ...] 用户标记的经期日期

export function togglePeriodDay(periodDays, year, month, day) {
  const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  const idx = periodDays.indexOf(key)
  if (idx >= 0) {
    return periodDays.filter((_, i) => i !== idx)
  } else {
    return [...periodDays, key].sort()
  }
}

export function checkIsPeriod(periodDays, gd) {
  // 检查今天或前后2天有没有标记（经期一般持续5天）
  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(gd.y, gd.m - 1, gd.d - offset)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    if (periodDays.includes(key)) return true
  }
  return false
}

// 推算下次经期（根据已标记的日期推算28天周期）
export function predictNextPeriod(periodDays) {
  if (periodDays.length === 0) return null
  // 找最近一组连续日期的起始日
  const sorted = [...periodDays].sort().reverse()
  const lastStart = sorted[0] // 最近标记日
  const d = new Date(lastStart)
  d.setDate(d.getDate() + 28) // 28天周期
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }
}

// 推算敏感期（排卵期前后，约第14天前后3天）
export function getSensitiveDays(periodDays) {
  if (periodDays.length === 0) return []
  const sorted = [...periodDays].sort().reverse()
  const lastStart = sorted[0]
  const d = new Date(lastStart)
  const result = []
  // 经期前3天（PMS）
  for (let i = 25; i <= 28; i++) {
    const dd = new Date(d)
    dd.setDate(dd.getDate() + i)
    result.push(`${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`)
  }
  return result
}

// ── 日历渲染数据 ──
export function getCalendarData(year, month, periodDays, currentGameDate) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const predicted = predictNextPeriod(periodDays)
  const sensitive = getSensitiveDays(periodDays)

  const days = []
  // 前面的空白
  for (let i = 0; i < firstDay; i++) days.push(null)
  // 每天
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    const isToday = currentGameDate && year === currentGameDate.y && month === currentGameDate.m && d === currentGameDate.d
    const isMarked = periodDays.includes(key)
    const isPredicted = predicted && year === predicted.y && month === predicted.m && d >= predicted.d && d < predicted.d + 5
    const isSensitive = sensitive.includes(key)
    days.push({ day: d, isToday, isMarked, isPredicted, isSensitive })
  }
  return { year, month, firstDay, daysInMonth, days }
}
