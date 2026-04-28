// ══════════════════════════════════════════════════════
//  游戏系统 v2 — 真实日历 / 真实天气 / 阳台植物
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

export function getWeatherInfo(weatherId) {
  return WEATHERS[weatherId] || WEATHERS.sunny
}

// 根据季节随机天气（fallback，无定位时用）
export function genWeather(month) {
  const season = getSeason(month)
  const weights = {
    spring: { sunny: 35, cloudy: 25, rainy: 25, foggy: 10, windy: 5 },
    summer: { sunny: 40, cloudy: 15, rainy: 20, storm: 15, foggy: 5, windy: 5 },
    autumn: { sunny: 30, cloudy: 30, rainy: 15, windy: 15, foggy: 10 },
    winter: { sunny: 20, cloudy: 30, rainy: 10, snowy: 20, windy: 10, foggy: 10 },
  }
  const w = weights[season] || weights.spring
  const total = Object.values(w).reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (const [k, v] of Object.entries(w)) { r -= v; if (r <= 0) return k }
  return 'sunny'
}

export function genTemp(seasonId) {
  const s = SEASONS[seasonId] || SEASONS.spring
  const [min, max] = s.tempRange
  return Math.round(min + Math.random() * (max - min))
}

// ── 真实天气查询（wttr.in 免费API，无需key）──
// 返回 { weather, temp, city } 或 null
export async function fetchRealWeather() {
  try {
    // 先尝试定位
    const pos = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject('no geo'); return }
      navigator.geolocation.getCurrentPosition(
        p => resolve(p.coords),
        () => reject('denied'),
        { timeout: 5000 }
      )
    })

    const res = await fetch(`https://wttr.in/${pos.latitude},${pos.longitude}?format=j1`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    const cur = data.current_condition?.[0]
    if (!cur) return null

    const code = parseInt(cur.weatherCode)
    const temp = parseInt(cur.temp_C)
    const city = data.nearest_area?.[0]?.areaName?.[0]?.value || ''

    // weatherCode → 我们的天气ID
    let weather = 'sunny'
    if ([113].includes(code)) weather = 'sunny'
    else if ([116, 119].includes(code)) weather = 'cloudy'
    else if ([122, 143, 248, 260].includes(code)) weather = 'foggy'
    else if ([176, 263, 266, 293, 296, 299, 302, 353, 356].includes(code)) weather = 'rainy'
    else if ([200, 386, 389, 305, 308, 359].includes(code)) weather = 'storm'
    else if ([179, 182, 185, 227, 230, 323, 326, 329, 332, 335, 338, 368, 371, 392, 395].includes(code)) weather = 'snowy'
    else if ([code >= 200 && code < 300].includes(true)) weather = 'storm'

    return { weather, temp, city }
  } catch {
    return null
  }
}


// ══════════════════ 真实日期 ══════════════════

export function realDate() {
  const d = new Date()
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), weekday: d.getDay(), h: d.getHours() }
}

export function realDateStr() {
  const d = realDate()
  const weekNames = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.m}月${d.d}日 周${weekNames[d.weekday]}`
}

// 是否是新的一天（跟上次存档的日期比）
export function isNewRealDay(lastDateStr) {
  const today = new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'
  return today !== lastDateStr
}

export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

// 时段
export function getTimeOfDay() {
  const h = new Date().getHours()
  if (h >= 5 && h < 9) return { id: 'morning', name: '早晨', emoji: '🌅' }
  if (h >= 9 && h < 12) return { id: 'forenoon', name: '上午', emoji: '☀️' }
  if (h >= 12 && h < 14) return { id: 'noon', name: '中午', emoji: '🌞' }
  if (h >= 14 && h < 17) return { id: 'afternoon', name: '下午', emoji: '🌤️' }
  if (h >= 17 && h < 19) return { id: 'evening', name: '傍晚', emoji: '🌇' }
  if (h >= 19 && h < 22) return { id: 'night', name: '晚上', emoji: '🌙' }
  return { id: 'latenight', name: '深夜', emoji: '🌑' }
}


// ── 新的一天（改用真实日期）──
export function processNewDay(dayState, realWeather) {
  const newDay = (dayState.day || 0) + 1
  const rd = realDate()
  const season = getSeason(rd.m)

  // 天气：优先用真实天气，没有就随机
  const weather = realWeather?.weather || genWeather(rd.m)
  const temp = realWeather?.temp ?? genTemp(season)
  const city = realWeather?.city || ''

  // 生病随机
  let sickWho = null
  const rnd = Math.random()
  if (rnd < 0.08) sickWho = 'player'
  else if (rnd < 0.14) sickWho = 'lu'

  // 浪漫值衰减
  const romantic = Math.max(0, Math.round((dayState.romantic || 0) * 0.3))
  const candleLit = false

  // 经期检查（用真实日期）
  const isPeriod = checkIsPeriod(dayState.periodDays || [], rd)

  // 系统消息 — 用真实日期
  const seasonInfo = getSeasonInfo(season)
  const weatherInfo = getWeatherInfo(weather)
  const timeInfo = getTimeOfDay()
  const sysMsg = `🌅 ${realDateStr()} · ${seasonInfo.name} · ${weatherInfo.emoji} ${temp}°${city ? ' · ' + city : ''}`

  const events = [sysMsg]
  if (isPeriod) events.push('🩸 生理期中，他会更体贴')
  if (sickWho === 'player') events.push('🤒 你今天不太舒服')
  if (sickWho === 'lu') events.push('🤒 他今天不太舒服')
  if (weather === 'storm') events.push('⛈️ 外面雷雨交加')
  if (weather === 'snowy') events.push('❄️ 外面下雪了')

  return {
    day: newDay,
    lastDate: todayStr(),
    season, weather, temp, city,
    sickWho, romantic, candleLit, isPeriod,
    events,
    realDate: rd,
  }
}

// ── AI上下文 ──
export function getContextPrompt(dayState) {
  if (!dayState?.day) return ''
  const rd = realDate()
  const seasonInfo = getSeasonInfo(dayState.season || getSeason(rd.m))
  const weatherInfo = getWeatherInfo(dayState.weather || 'sunny')
  const timeInfo = getTimeOfDay()

  let ctx = `【当前】${realDateStr()} ${timeInfo.name}，${seasonInfo.name}天${weatherInfo.desc}，${dayState.temp || '??'}°C。`

  if (dayState.isPeriod) {
    ctx += '\n她正在生理期，可能身体不适或情绪敏感，请格外温柔体贴，不要主动提起亲密。'
  }
  if (dayState.sickWho === 'lu') {
    ctx += '\n你今天身体不太舒服（感冒），会稍微虚弱一点，但还是想陪着她。'
  }
  if (dayState.sickWho === 'player') {
    ctx += '\n她今天身体不舒服，请主动关心照顾她。'
  }

  return ctx
}


// ══════════════════ 大姨妈 ══════════════════
// periodDays用真实日期 ['2025-04-15', '2025-04-16', ...]

export function togglePeriodDay(periodDays, year, month, day) {
  const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const idx = periodDays.indexOf(key)
  if (idx >= 0) return periodDays.filter((_, i) => i !== idx)
  return [...periodDays, key].sort()
}

export function checkIsPeriod(periodDays, dateObj) {
  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(dateObj.y, dateObj.m - 1, dateObj.d - offset)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (periodDays.includes(key)) return true
  }
  return false
}

export function predictNextPeriod(periodDays) {
  if (periodDays.length === 0) return null
  const sorted = [...periodDays].sort().reverse()
  const d = new Date(sorted[0])
  d.setDate(d.getDate() + 28)
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }
}

export function getSensitiveDays(periodDays) {
  if (periodDays.length === 0) return []
  const sorted = [...periodDays].sort().reverse()
  const d = new Date(sorted[0])
  const result = []
  for (let i = 25; i <= 28; i++) {
    const dd = new Date(d); dd.setDate(dd.getDate() + i)
    result.push(`${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`)
  }
  return result
}

export function getCalendarData(year, month, periodDays, currentDate) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const predicted = predictNextPeriod(periodDays)
  const sensitive = getSensitiveDays(periodDays)
  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isToday = currentDate && year === currentDate.y && month === currentDate.m && d === currentDate.d
    const isMarked = periodDays.includes(key)
    const isPredicted = predicted && year === predicted.y && month === predicted.m && d >= predicted.d && d < predicted.d + 5
    const isSensitive = sensitive.includes(key)
    days.push({ day: d, isToday, isMarked, isPredicted, isSensitive })
  }
  return { year, month, firstDay, daysInMonth, days }
}


// ══════════════════ 阳台植物 ══════════════════

export const PLANTS = [
  { id: 'strawberry', name: '草莓',  emoji: '🍓', type: 'fruit',  season: ['spring', 'summer'],           growDays: 8,  harvestQty: 2, price: 30 },
  { id: 'tomato',     name: '番茄',  emoji: '🍅', type: 'fruit',  season: ['summer', 'autumn'],           growDays: 9,  harvestQty: 2, price: 20 },
  { id: 'tulip',      name: '郁金香', emoji: '🌷', type: 'flower', season: ['spring'],                     growDays: 6,  harvestQty: 0, price: 25 },
  { id: 'rose',       name: '玫瑰',  emoji: '🌹', type: 'flower', season: ['spring', 'summer', 'autumn'], growDays: 8,  harvestQty: 0, price: 35 },
  { id: 'lotus',      name: '碗莲',  emoji: '🪷', type: 'flower', season: ['summer'],                     growDays: 7,  harvestQty: 0, price: 30 },
  { id: 'lettuce',    name: '生菜',  emoji: '🥬', type: 'veggie', season: ['spring', 'autumn'],           growDays: 4,  harvestQty: 2, price: 10 },
  { id: 'mint',       name: '薄荷',  emoji: '🌿', type: 'herb',   season: ['spring', 'summer', 'autumn'], growDays: 4,  harvestQty: 1, price: 15 },
  { id: 'basil',      name: '罗勒',  emoji: '🌱', type: 'herb',   season: ['spring', 'summer'],           growDays: 5,  harvestQty: 1, price: 15 },
  { id: 'sunflower',  name: '向日葵', emoji: '🌻', type: 'flower', season: ['summer'],                     growDays: 10, harvestQty: 0, price: 20 },
  { id: 'lavender',   name: '薰衣草', emoji: '💜', type: 'flower', season: ['spring', 'summer'],           growDays: 7,  harvestQty: 0, price: 30 },
]

// 最多4个花盆
export const MAX_POTS = 4

// 花盆状态: { plantId, plantedDay, watered, stage }
// stage: 0=种子 1=发芽 2=成长 3=成熟/开花

export function plantSeed(garden, plantId, gameDay) {
  if (garden.length >= MAX_POTS) return { garden, msg: '花盆满了，最多种4棵' }
  const plant = PLANTS.find(p => p.id === plantId)
  if (!plant) return { garden, msg: '找不到这个植物' }
  const newGarden = [...garden, { plantId, plantedDay: gameDay, watered: true, stage: 0 }]
  return { garden: newGarden, msg: `种下了${plant.emoji}${plant.name}！` }
}

export function waterPlant(garden, index) {
  if (!garden[index]) return garden
  const newGarden = [...garden]
  newGarden[index] = { ...newGarden[index], watered: true }
  return newGarden
}

export function removePlant(garden, index) {
  return garden.filter((_, i) => i !== index)
}

// 每日更新植物
export function updateGardenDaily(garden, gameDay, currentSeason) {
  const events = []
  const newGarden = garden.map(pot => {
    const plant = PLANTS.find(p => p.id === pot.plantId)
    if (!plant) return pot
    const updated = { ...pot }

    // 不在季节不生长
    if (!plant.season.includes(currentSeason)) {
      return updated
    }

    const daysPlanted = gameDay - pot.plantedDay
    // 没浇水不生长，扣一个stage？不，简单点：不浇水就不长
    if (!pot.watered) return { ...updated, watered: false }

    // 计算阶段
    const progress = daysPlanted / plant.growDays
    let stage = 0
    if (progress >= 1) stage = 3       // 成熟
    else if (progress >= 0.6) stage = 2 // 成长
    else if (progress >= 0.25) stage = 1 // 发芽
    updated.stage = stage
    updated.watered = false // 每天重置，需要再浇

    if (stage === 3 && pot.stage < 3) {
      events.push(`${plant.emoji} ${plant.name}${plant.type === 'flower' ? '开花了！' : '成熟了！'}`)
    }

    return updated
  })

  return { garden: newGarden, events }
}

// 收获
export function harvestPlant(garden, index, fridge) {
  const pot = garden[index]
  if (!pot || pot.stage < 3) return { garden, fridge, msg: '还没成熟' }
  const plant = PLANTS.find(p => p.id === pot.plantId)
  if (!plant) return { garden, fridge, msg: '？？' }

  if (plant.type === 'flower') {
    // 花不能吃，但可以加浪漫值
    const newGarden = removePlant(garden, index)
    return { garden: newGarden, fridge, msg: `摘了${plant.emoji}${plant.name}！`, romanticBoost: 15, isFlower: true }
  }

  // 蔬果放冰箱
  const newFridge = { ...fridge }
  const fridgeKey = pot.plantId  // 用植物id作为冰箱key
  newFridge[fridgeKey] = (newFridge[fridgeKey] || 0) + plant.harvestQty
  const newGarden = removePlant(garden, index)
  return { garden: newGarden, fridge: newFridge, msg: `收获了${plant.harvestQty}个${plant.emoji}${plant.name}！` }
}

// 植物阶段显示
export function getPlantDisplay(pot) {
  if (!pot) return { emoji: '🪴', label: '空花盆' }
  const plant = PLANTS.find(p => p.id === pot.plantId)
  if (!plant) return { emoji: '❓', label: '???' }
  const stageLabels = ['🌱种子', '🌿发芽', '🪴成长中', plant.type === 'flower' ? `${plant.emoji}开花了` : `${plant.emoji}成熟了`]
  return {
    emoji: pot.stage === 3 ? plant.emoji : ['🌱', '🌿', '🪴', plant.emoji][pot.stage],
    label: stageLabels[pot.stage] || '种子',
    name: plant.name,
    needsWater: !pot.watered && pot.stage < 3,
    canHarvest: pot.stage >= 3,
  }
}

// 给AI的植物上下文
export function getGardenContextPrompt(garden) {
  if (!garden || garden.length === 0) return ''
  const descs = garden.map(pot => {
    const d = getPlantDisplay(pot)
    return `${d.emoji}${d.name}(${d.label})`
  }).join('、')
  return `【阳台花园】种了：${descs}`
}
