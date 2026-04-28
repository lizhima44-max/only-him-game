// ══════════════════════════════════════════════════════
//  T2: 商场 / 超市 / 宠物系统
//  lib/shopAndPet.js
// ══════════════════════════════════════════════════════

// ── Supabase SQL ──
/*
ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 500;
ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS pet JSONB DEFAULT NULL;
ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS cart JSONB DEFAULT '[]';
*/


// ══════════════════ 商场 ══════════════════
// 商场 = 卖衣物(他的+她的) + 床头柜道具 + 礼物
// 用 wardrobeItems.js 里的 ALL_OUTFITS + ALL_BEDSIDE_ITEMS 作为商品源

// 额外的"她的"衣物（给女主穿的）
export const HER_OUTFITS = [
  { id: 'her_sundress',  name: '碎花裙',      owner: 'her', category: 'daily',    desc: '清新的碎花吊带裙',                price: 100, unlockAt: 0 },
  { id: 'her_sweater',   name: '奶茶色毛衣',   owner: 'her', category: 'daily',   desc: '软糯的oversize毛衣，袖子太长',    price: 120, unlockAt: 0 },
  { id: 'her_shirt',     name: '白衬衫(偷他的)', owner: 'her', category: 'home',  desc: '偷了他的白衬衫穿，大了好几号',    price: 0,   unlockAt: 30 },
  { id: 'her_qipao',     name: '旗袍',         owner: 'her', category: 'formal',  desc: '复古深红旗袍，侧开叉',           price: 380, unlockAt: 45 },
  { id: 'her_silk',      name: '丝质睡裙',     owner: 'her', category: 'intimate', desc: '黑色吊带丝质睡裙，很短',         price: 250, unlockAt: 55 },
  { id: 'her_lace',      name: '蕾丝内衣套装', owner: 'her', category: 'intimate', desc: '酒红色蕾丝，若隐若现',           price: 300, unlockAt: 65 },
]

// 礼物
export const GIFTS = [
  { id: 'gift_ring',     name: '戒指',      desc: '简约银戒指',               price: 500, intimacyBoost: 8,  unlockAt: 50 },
  { id: 'gift_watch',    name: '手表',      desc: '给他的复古机械表',          price: 400, intimacyBoost: 6,  unlockAt: 30 },
  { id: 'gift_perfume',  name: '对香',      desc: '一对香水，他一瓶你一瓶',    price: 300, intimacyBoost: 5,  unlockAt: 20 },
  { id: 'gift_photo',    name: '拍立得相册', desc: '装满两个人合影的相册',      price: 150, intimacyBoost: 4,  unlockAt: 10 },
  { id: 'gift_letter',   name: '手写信',    desc: '你写给他的信，他会珍藏',    price: 0,   intimacyBoost: 3,  unlockAt: 0 },
]

// 获取商场可购买的所有商品（分类返回）
export function getShopItems(ownedWardrobe, ownedBedside, intimacy) {
  const { ALL_OUTFITS, ALL_BEDSIDE_ITEMS } = require('./wardrobeItems')

  const hisClothes = ALL_OUTFITS
    .filter(o => !ownedWardrobe.includes(o.id) && o.price > 0 && intimacy >= o.unlockAt)
    .map(o => ({ ...o, owner: 'his', shopType: 'wardrobe' }))

  const herClothes = HER_OUTFITS
    .filter(o => !ownedWardrobe.includes(o.id) && intimacy >= o.unlockAt)
    .map(o => ({ ...o, shopType: 'wardrobe' }))

  const toys = ALL_BEDSIDE_ITEMS
    .filter(i => !ownedBedside.includes(i.id) && i.price > 0 && intimacy >= (i.unlockAt || 0) && !i.isPremium)
    .map(i => ({ ...i, shopType: 'bedside' }))

  const gifts = GIFTS
    .filter(g => intimacy >= g.unlockAt)
    .map(g => ({ ...g, shopType: 'gift' }))

  return { hisClothes, herClothes, toys, gifts }
}

// 分类标签
export const SHOP_CATEGORIES = [
  { id: 'his',   label: '他的衣物', icon: '👔' },
  { id: 'her',   label: '我的衣物', icon: '👗' },
  { id: 'toys',  label: '情趣道具', icon: '🎀' },
  { id: 'gifts', label: '礼物',    icon: '🎁' },
]


// ══════════════════ 超市 ══════════════════

export const SUPERMARKET_ITEMS = [
  // ── 基础食材 ──
  { id: 'rice',     name: '大米',   emoji: '🍚', price: 15, category: 'staple' },
  { id: 'noodle',   name: '面条',   emoji: '🍜', price: 12, category: 'staple' },
  { id: 'egg',      name: '鸡蛋',   emoji: '🥚', price: 8,  category: 'staple' },
  { id: 'milk',     name: '牛奶',   emoji: '🥛', price: 10, category: 'drink' },
  // ── 肉类 ──
  { id: 'chicken',  name: '鸡肉',   emoji: '🍗', price: 25, category: 'meat' },
  { id: 'pork',     name: '猪肉',   emoji: '🥩', price: 30, category: 'meat' },
  { id: 'fish',     name: '鱼',     emoji: '🐟', price: 28, category: 'meat' },
  { id: 'shrimp',   name: '虾',     emoji: '🦐', price: 35, category: 'meat' },
  // ── 蔬菜 ──
  { id: 'tomato',   name: '番茄',   emoji: '🍅', price: 6,  category: 'veggie' },
  { id: 'lettuce',  name: '生菜',   emoji: '🥬', price: 5,  category: 'veggie' },
  { id: 'potato',   name: '土豆',   emoji: '🥔', price: 5,  category: 'veggie' },
  { id: 'mushroom', name: '蘑菇',   emoji: '🍄', price: 8,  category: 'veggie' },
  // ── 调料/其他 ──
  { id: 'soy',      name: '酱油',   emoji: '🫗', price: 10, category: 'sauce' },
  { id: 'butter',   name: '黄油',   emoji: '🧈', price: 15, category: 'sauce' },
  // ── 零食 ──
  { id: 'choco',    name: '巧克力', emoji: '🍫', price: 20, category: 'snack' },
  { id: 'cake',     name: '蛋糕',   emoji: '🍰', price: 30, category: 'snack' },
  // ── 宠物食品 ──
  { id: 'catfood',  name: '猫粮',   emoji: '🐱', price: 20, category: 'pet' },
  { id: 'dogfood',  name: '狗粮',   emoji: '🐶', price: 20, category: 'pet' },
  // ── 生活 ──
  { id: 'pads',     name: '卫生巾', emoji: '🩹', price: 15, category: 'life' },
  { id: 'condom',   name: '安全措施', emoji: '💊', price: 12, category: 'life' },
]


// ══════════════════ 宠物 ══════════════════

export const PETS = [
  {
    id: 'cat',
    name: '猫咪',
    emoji: '🐱',
    food: 'catfood',
    foodName: '猫粮',
    location: 'living_room',  // 默认在客厅
    acts: [
      '蜷在沙发上打呼噜',
      '跳到他肩膀上蹭蹭',
      '追着毛线球跑',
      '窝在你腿上不动了',
      '对着窗外的鸟叫',
      '把杯子推到桌子边缘',
      '突然发疯跑酷',
    ],
    specialEvents: [
      { trigger: 'morning', text: '猫咪叼着拖鞋来找你了' },
      { trigger: 'intimate', text: '猫咪跳上床盯着你们看' },
      { trigger: 'cooking', text: '猫咪闻到香味溜进厨房了' },
    ],
  },
  {
    id: 'dog',
    name: '小狗',
    emoji: '🐶',
    food: 'dogfood',
    foodName: '狗粮',
    location: 'living_room',
    acts: [
      '摇着尾巴扑过来',
      '叼着球要你扔',
      '趴在门口等人回来',
      '把头枕在他脚边',
      '听到门铃声开始叫',
      '翻肚皮让你摸',
      '在阳台晒太阳打哈欠',
    ],
    specialEvents: [
      { trigger: 'morning', text: '小狗舔你脸把你叫醒了' },
      { trigger: 'intimate', text: '小狗在门外挠门嗯嗯叫' },
      { trigger: 'walk', text: '小狗想出去遛弯了' },
    ],
  },
]

// 宠物状态初始化
export function createPet(petId, name) {
  return {
    typeId: petId,
    name: name || PETS.find(p => p.id === petId)?.name || '宠物',
    hunger: 80,
    clean: 80,
    mood: 80,
    sick: false,
    age: 0,  // 天数
  }
}

// 每日更新宠物状态
export function updatePetDaily(pet) {
  if (!pet) return null
  const updated = { ...pet }
  updated.age += 1
  updated.hunger = Math.max(0, updated.hunger - 20)
  updated.clean = Math.max(0, updated.clean - 15)

  // 心情受饥饿和清洁影响
  if (updated.hunger < 30 || updated.clean < 30) {
    updated.mood = Math.max(0, updated.mood - 12)
  } else if (updated.hunger > 70 && updated.clean > 70) {
    updated.mood = Math.min(100, updated.mood + 5)
  }

  // 生病
  if (!updated.sick && (updated.hunger < 15 || updated.clean < 15)) {
    updated.sick = true
  }
  // 康复
  if (updated.sick && updated.hunger > 50 && updated.clean > 50) {
    updated.sick = false
  }

  return updated
}

// 宠物动作
export function feedPet(pet) {
  if (!pet) return pet
  return { ...pet, hunger: Math.min(100, pet.hunger + 35), mood: Math.min(100, pet.mood + 8) }
}
export function bathePet(pet) {
  if (!pet) return pet
  return { ...pet, clean: Math.min(100, pet.clean + 45), mood: Math.min(100, pet.mood + 12) }
}
export function strokePet(pet) {
  if (!pet) return pet
  return { ...pet, mood: Math.min(100, pet.mood + 20) }
}

// 获取宠物随机行为（用于AI prompt注入）
export function getPetRandomAct(pet) {
  if (!pet) return ''
  const petDef = PETS.find(p => p.id === pet.typeId)
  if (!petDef) return ''
  const act = petDef.acts[Math.floor(Math.random() * petDef.acts.length)]
  return `家里的${pet.name}${act}。`
}

// 获取宠物状态描述（注入AI prompt）
export function getPetContextPrompt(pet) {
  if (!pet) return ''
  const petDef = PETS.find(p => p.id === pet.typeId)
  if (!petDef) return ''
  let ctx = `【宠物】家里养了一只${petDef.emoji}叫${pet.name}，`
  if (pet.sick) ctx += '它生病了需要照顾。'
  else if (pet.mood > 70) ctx += '它心情很好。'
  else if (pet.mood < 30) ctx += '它有点不开心。'
  else ctx += '它在家里随意活动。'
  return ctx
}


// ══════════════════════════════════════════════════════
//  game.js 补丁说明
// ══════════════════════════════════════════════════════

// ── 修改 1: import ──
// import { SUPERMARKET_ITEMS, SHOP_CATEGORIES, HER_OUTFITS, GIFTS, getShopItems,
//          PETS, createPet, updatePetDaily, feedPet, bathePet, strokePet,
//          getPetContextPrompt, getPetRandomAct } from '../lib/shopAndPet'


// ── 修改 2: state ──
/*
  const [coins, setCoins] = useState(500)
  const [pet, setPet] = useState(null)
  const [showShop, setShowShop] = useState(false)
  const [showSupermarket, setShowSupermarket] = useState(false)
  const [showPetPanel, setShowPetPanel] = useState(false)
  const [showAdopt, setShowAdopt] = useState(false)
  const [shopTab, setShopTab] = useState('his')
  const [petNameInput, setPetNameInput] = useState('')
  const [adoptingType, setAdoptingType] = useState(null)
  const [cart, setCart] = useState([])  // 超市购物车 [{id, qty}]
*/


// ── 修改 3: 加载/存档 ──
// 读取: setCoins(data.coins ?? 500); setPet(data.pet || null)
// 存档: coins, pet


// ── 修改 4: 外出地点触发商场/超市 ──
// 在 outsideActions 的 mall 里改成：
/*
  mall: [
    { label: '逛逛', prompt: '她在商场橱窗前停下来，你说一句' },
    { label: '🛍️ 逛商场', special: 'shop' },
    { label: '帮我提包', prompt: '她把袋子塞给你，你接过来，说一句' },
  ],
  supermarket: [
    { label: '推车', prompt: '你接过了超市的购物车，说一句' },
    { label: '🛒 采购', special: 'supermarket' },
    { label: '挑东西', prompt: '她拿起什么东西在研究，你凑过去，说一句' },
  ],
*/
// 然后在special判断里加：
//   if (a.special === 'shop') return <button onClick={() => setShowShop(true)} ...>🛍️ 逛商场</button>
//   if (a.special === 'supermarket') return <button onClick={() => setShowSupermarket(true)} ...>🛒 采购</button>


// ── 修改 5: handleNewDay 里更新宠物 ──
/*
  if (pet) {
    const updatedPet = updatePetDaily(pet)
    setPet(updatedPet)
    if (updatedPet.sick) events.push(`🤒 ${updatedPet.name}生病了！`)
    // 30%概率宠物触发AI反应
    if (Math.random() < 0.3) {
      const act = getPetRandomAct(updatedPet)
      setTimeout(() => sendToAI(act + '你自然提一句', ...), 800)
    }
  }
  // 每天给零花钱
  setCoins(prev => prev + 50)
*/


// ── 修改 6: getSystemPrompt 注入宠物 ──
// const petCtx = getPetContextPrompt(pet)
// prompt里加 ${petCtx}


// ── 修改 7: 金币显示 ──
// 在顶栏天气旁边加：
//   <span style={{ fontSize: '10px', color: 'rgba(255,200,60,0.5)' }}>💰{coins}</span>


// ── 商场/超市/宠物的弹窗UI太长了，单独用注释写思路 ──

// 【商场弹窗】showShop
// - 顶部tab: 他的衣物 | 我的衣物 | 情趣道具 | 礼物
// - 每个商品卡片: 名称 + 描述 + 价格 + 标签(常服/情趣/etc)
// - 点击购买: coins减少，wardrobe/bedsideItems加入，toast提示
// - 买衣物: 标签显示 owner=his → "👔 他的" owner=her → "👗 我的"
//   category显示: daily→常服 formal→正装 home→居家 intimate→情趣
// - 买礼物: 直接触发AI反应 "她送了他xxx，他的反应" + 加好感度

// 【超市弹窗】showSupermarket
// - 分类tab: 主食 | 肉类 | 蔬菜 | 零食 | 宠物 | 生活
// - 购物车模式: 点+加入cart，点-减少，底部显示总价+结算按钮
// - 结算: coins减少，fridge对应食材增加

// 【宠物面板】showPetPanel (客厅按钮触发)
// - 有宠物: 显示饥饿/清洁/心情三个条 + 喂食/洗澡/撸它/送走 按钮
//   喂食消耗冰箱里的猫粮/狗粮
//   可以"叫他喂"/"叫他洗"触发AI反应
// - 没宠物: 显示领养面板，选猫/狗，起名字

// 【领养逻辑】
// - 选猫或狗 → 输入名字 → 确认 → createPet → 触发AI反应"她带回了一只xxx"

// 客厅按钮区加：
//   living_room: [
//     ...现有按钮,
//     { label: pet ? (pet.name + ' ' + PETS.find(p=>p.id===pet.typeId)?.emoji) : '🐾 领养宠物', special: 'pet' },
//   ]
