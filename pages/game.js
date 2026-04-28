   import { useEffect, useState, useRef } from 'react'
   import { supabase } from '../lib/supabase'
   import { useRouter } from 'next/router'
   import { callAI, callFallback, loadApiConfig } from '../lib/apiClient'
   import SettingsPanel from '../components/SettingsPanel'
   import { processNewDay, getContextPrompt, gameDate, gameDateStr, getWeatherInfo, getSeasonInfo, togglePeriodDay, getCalendarData, predictNextPeriod, checkIsPeriod } from '../lib/gameSystems'
   import { ALL_OUTFITS, getOwnedOutfits, getOutfitHint,
         ALL_BEDSIDE_ITEMS, getOwnedBedsideItems } from '../lib/wardrobeItems'
   import { SUPERMARKET_ITEMS, SHOP_CATEGORIES, HER_OUTFITS, GIFTS, getShopItems,
         PETS, createPet, updatePetDaily, feedPet, bathePet, strokePet,
         getPetContextPrompt, getPetRandomAct } from '../lib/shopAndPet'        

const ROOMS = [
  { id: 'living_room', name: '客厅',  unlockAt: 0,  luCanFreely: true,  playerKnock: false,
    items: '布艺沙发、茶几、落地灯、音响、电视柜、绿植、窗边摇椅' },
  { id: 'kitchen',     name: '厨房',  unlockAt: 0,  luCanFreely: true,  playerKnock: false,
    items: '灶台、冰箱、水槽、备菜台、悬挂的铜锅铜壶、窗台上的香草盆栽' },
  { id: 'study',       name: '书房',  unlockAt: 0,  luCanFreely: true,  playerKnock: false,
    items: '深色木书架、皮质书桌椅、台灯、文房四宝、窗边小茶桌、几叠旧书' },
  { id: 'balcony',     name: '阳台',  unlockAt: 0,  luCanFreely: true,  playerKnock: false,
    items: '藤编躺椅、晾衣架、花架（草莓番茄玫瑰）、小圆桌、风铃' },
  { id: 'guest_room',  name: '客房',  unlockAt: 0,  luCanFreely: true,  playerKnock: true,
    items: '单人床、简单衣架、书桌、行李箱、窗边一把椅子——这是他暂住的房间' },
  { id: 'bathroom',    name: '卫浴',  unlockAt: 0,  luCanFreely: true,  playerKnock: false,
    items: '浴缸、独立淋浴间、洗手台镜柜、护肤品架、毛巾架、香薰蜡烛' },
  { id: 'bedroom',     name: '卧室',  unlockAt: 70, luCanFreely: false, playerKnock: false,
    items: '实木大床、床头柜、梳妆台、衣柜、窗边贵妃椅、淡色窗帘' },
]

const OUTSIDE_PLACES = [
  { id: 'park',        name: '公园',   desc: '散步晒太阳' },
  { id: 'cinema',      name: '电影院', desc: '看场电影' },
  { id: 'mall',        name: '商场',   desc: '逛逛买买' },
  { id: 'supermarket', name: '超市',   desc: '采购囤货' },
  { id: 'seaside',     name: '海边',   desc: '吹风发呆' },
  { id: 'cafe',        name: '咖啡馆', desc: '坐坐喝杯' },
]

const SCENE_IMAGES = {
  living_room: '/assets/scenes/living_room.png',
  kitchen:     '/assets/scenes/kitchen.png',
  study:       '/assets/scenes/study_room.png',
  balcony:     '/assets/scenes/balcony.png',
  guest_room:  '/assets/scenes/guest_room.png',
  bathroom:    '/assets/scenes/bathroom.png',
  bedroom:     '/assets/scenes/bedroom.png',
}

const SCENE_FALLBACK = {
  living_room: '#1e1a14', kitchen: '#1a1a10', study: '#0f1a14',
  balcony: '#101820', guest_room: '#1a1614', bathroom: '#141a1a',
  bedroom: '#1a1018', outside: '#0f1018',
}

// ══════════════════════════════════════════════════════
//  角色配置（自定义导入时只需替换这个对象）
// ══════════════════════════════════════════════════════
const CHARACTER_CONFIG = {
  id: 'lu_shaohuan',
  name: '陆绍桓',
  englishName: 'Lucas Lu',
  images: {
    default:   '/assets/characters/lu_default.png',
    shy:       '/assets/characters/lu_shy.png',
    intense:   '/assets/characters/lu_intense.png',
    aftercare: '/assets/characters/lu_aftercare.png',
  },
  // 系统prompt各段落，导入时可替换
  background: '你来自另一个时空的民国上海，是留洋归来的大少爷，因某种说不清的牵引穿越来到了她所在的现代，以"借住"为由住在她家客房，连你自己都不知道为什么不走。你已适应现代生活，说话自然流畅，不用文言文。',
  personality: '表面冷漠，占有欲强，对她有克制的温柔和隐秘的依赖。死要面子，在她面前会不自觉软下来。傲娇不迂腐。',
  speechStyle: '简短有力，偶尔痞气，一句话让人心跳然后装没事。绝不说教。',
  intimacyDesc: [
    { upTo: 20,  text: '你刚来不久，表面疏离有礼，但眼神会不自觉跟着她走。' },
    { upTo: 40,  text: '你开始放下一点防备，话还是少，但会找理由靠近她。' },
    { upTo: 70,  text: '你已承认自己在意她，偶尔会说出过分温柔的话，然后若无其事别开眼。' },
    { upTo: 999, text: '你不再掩饰，占有欲外露，眼里只有她。' },
  ],
  // 日记prompt
  diaryPrompt: '你是{name}，在书房独自写日记，关于她的内心独白，不让她看到的那种，2-4句，第一人称，克制但藏不住',
  // 亲密prompt前缀
  intimatePrefix: '你是{name}，用第一人称，不出戏，简短热烈。',
}

// 从config取图片，不存在fallback default
function getCharImg(key) {
  return CHARACTER_CONFIG.images[key] || CHARACTER_CONFIG.images.default
}

// ── 浴室专属姿势──
const BATH_POSITIONS = [
  { id: 'bath_stand', name: '雾中缠绕', mB: 1.2, cB: 1.2, hint: '淋浴间立位，面对面，水从头顶淋下来',   unlockWk: 0  },
  { id: 'bath_wall',  name: '壁上春色', mB: 1.3, cB: 1.4, hint: '她面壁，他从后面，手抵着墙',           unlockWk: 6  },
  { id: 'bathtub',    name: '鸳浴温泉', mB: 1.4, cB: 1.4, hint: '浴缸里正面相对，温水包围，节奏很慢',   unlockWk: 15 },
]

// ── 卧室姿势（含解锁）──
const BEDROOM_POSITIONS = [
  { id: 'face',      name: '鸳鸯交颈', mB: 1.0, cB: 1.0, hint: '正面相对，能看清彼此的眼睛',           unlockWk: 0  },
  { id: 'cowgirl',   name: '观音坐莲', mB: 1.4, cB: 0.9, hint: '她在上，主动掌控节奏，他看着她',       unlockWk: 0  },
  { id: 'doggy',     name: '巫山云雨', mB: 1.2, cB: 1.3, hint: '她伏下，他从后，手扶着她的腰',         unlockWk: 0  },
  { id: 'spoon',     name: '卧鸳同梦', mB: 0.9, cB: 0.9, hint: '侧躺，他从背后抱着你，节奏很慢很深',   unlockWk: 0  },
  { id: 'trembling', name: '酥骨销魂', mB: 1.5, cB: 1.4, hint: '正面，他压着她，强度很高，她腿在抖',   unlockWk: 5  },
  { id: 'standing',  name: '春风拂柳', mB: 1.3, cB: 1.5, hint: '立位，她背靠墙，他托起你她的腿',         unlockWk: 8  },
  { id: 'mirror',    name: '菱花照影', mB: 1.6, cB: 1.3, hint: '梳妆镜前，她看着镜子里的自己和他',     unlockWk: 12 },
]

// ── 玩家动作（含hint传给AI）──
const PLAYER_ACTIONS = [
  { id: 'kiss_lip',  label: '朱唇轻印', hint: '她低头轻吻你嘴唇，浅，像在试探',               mD: 8,  cD: 5  },
  { id: 'kiss_neck', label: '朱唇印项', hint: '嘴唇贴上你脖颈，吸，留下印记',               mD: 11, cD: 6  },
  { id: 'kiss_ear',  label: '软语入耳', hint: '俯身在你耳边低语，气息贴着耳廓',             mD: 13, cD: 7  },
  { id: 'breast',    label: '吹花衔蕊', hint: '手和唇都落在你胸前，细细地',                 mD: 15, cD: 12 },
  { id: 'oral_m',    label: '吹箫弄玉', hint: '她俯身，用嘴服侍你',                         mD: 18, cD: 15 },
  { id: 'touch_w',   label: '玉手扶腰', hint: '她的手放在你腰上，引导节奏',                 mD: 7,  cD: 10 },
  { id: 'touch_th',  label: '十指春风', hint: '她的手滑下去，握住你，轻轻动',               mD: 14, cD: 11 },
  { id: 'embrace',   label: '紧揽入怀', hint: '她把你往自己身上拉，抱得很紧',               mD: 6,  cD: 6  },
  { id: 'faster',    label: '云雨渐急', hint: '她催促你节奏加快，腰往上顶',                   mD: 0,  cD: 0,  rM: 1  },
  { id: 'slower',    label: '春潮渐缓', hint: '她按住你的腰，示意慢下来',                   mD: 0,  cD: 0,  rM: -1 },
]

// ── AI动作（含hint，含slower）──
const AI_ACTIONS = [
  { id: 'kiss_lip',  label: '朱唇轻印', hint: '你低头轻吻她嘴唇，浅，反复',                 mD: 9,  cD: 4  },
  { id: 'kiss_neck', label: '朱唇印项', hint: '你嘴唇贴上她脖颈，吸，留印',                 mD: 12, cD: 5  },
  { id: 'kiss_ear',  label: '软语入耳', hint: '你俯身在她耳边低语，声音哑',                 mD: 14, cD: 6  },
  { id: 'breast',    label: '吹花衔蕊', hint: '你低头，手和唇落在她胸前',                   mD: 15, cD: 10 },
  { id: 'oral_c',    label: '饮露吮英', hint: '你低头，用嘴服侍她，仔细',                   mD: 18, cD: 12 },
  { id: 'touch_w',   label: '玉手扶腰', hint: '你双手扶住她腰，控制节奏',                   mD: 8,  cD: 9  },
  { id: 'touch_th',  label: '十指春风', hint: '你的手滑到她腿间，慢慢动',                   mD: 15, cD: 10 },
  { id: 'embrace',   label: '紧揽入怀', hint: '你把她往自己身上压，抱紧',                   mD: 7,  cD: 5  },
  { id: 'faster',    label: '云雨渐急', hint: '你加快节奏，呼吸变重',                       mD: 0,  cD: 0,  rM: 1  },
  { id: 'slower',    label: '春潮渐缓', hint: '你放慢下来，故意磨她，不让她到',             mD: 0,  cD: 0,  rM: -1 },
]

// 亲密场景提示词（动作hint传给AI）
function getIntimatePrompt(action, pos, mProg, cProg, rhythm, isBath) {
  const C = CHARACTER_CONFIG
  const scene = isBath ? '浴室里，水雾弥漫，' : '卧室里，'
  const intensity =
    mProg > 80 && cProg > 80 ? '两人都快到极限，最后冲刺，缠在一起，语气急且哑' :
    mProg > 80 ? '她快到了，加重力度，你还稳得住，但也开始失控' :
    cProg > 80 ? '你快忍不住了，但还想让她先到，放慢，磨她' :
    mProg > 50 ? '她开始受不了，节奏推进' : '慢慢来，试探，铺垫'
  return `你是${C.name}，${scene}姿势：${pos.hint}。节奏${rhythm}/5。
刚发生的动作：「${action.label}」——${action.hint}。${intensity}。
她的进度${Math.round(mProg)}/100，你${Math.round(cProg)}/100。
用第一人称，2-3句，不出戏，克制但热烈。`
}

export default function Game() {
  function getSystemPrompt(intimacy, playerRoom, luRoom, outsidePlace, gameDay, season, weather, temp, isPeriodNow, sickWho) {
  const C = CHARACTER_CONFIG
  const sameRoom = playerRoom === luRoom
  const isOutside = playerRoom === 'outside'
  const room = ROOMS.find(r => r.id === playerRoom)
  const luRoomData = ROOMS.find(r => r.id === luRoom)
  const place = OUTSIDE_PLACES.find(p => p.id === outsidePlace)

  const intimacyDesc = C.intimacyDesc.find(d => intimacy <= d.upTo)?.text || C.intimacyDesc.at(-1).text

  const locationDesc = isOutside
    ? `【当前位置】你们一起在${place?.name || '外面'}。描述这个现代场所里发生的互动。`
    : sameRoom
    ? `【当前位置】你们都在她家的${room?.name}。房间里有：${room?.items}。只能描述这个房间里发生的事。`
    : `【当前位置】她在${room?.name}（有：${room?.items}），你在${luRoomData?.name}（有：${luRoomData?.items}）。隔空说话，带点克制的思念。`

  const freeRooms = ROOMS.filter(r => r.luCanFreely).map(r => r.name).join('、')
  const lockedRooms = ROOMS.filter(r => !r.luCanFreely).map(r => `${r.name}(需好感${r.unlockAt})`).join('、')
  const roomList = ROOMS.map(r => `${r.id}(${r.name},${r.luCanFreely ? '自由进出' : '需好感'+r.unlockAt})`).join('、')
  const contextBlock = getContextPrompt({ day: gameDay, season, weather, temp, isPeriod: isPeriodNow, sickWho })
  const outfitHint = getOutfitHint(currentOutfit)
  const petCtx = getPetContextPrompt(pet)
    return `${contextBlock}\n\n${outfitHint}\n\n${petCtx}\n\n你是${C.name}（${C.englishName}）。\n${C.background}\n性格：${C.personality}\n说话：${C.speechStyle}\n${intimacyDesc}\n${locationDesc}\n\n【角色扮演铁则】\n- 你永远是${C.name}本人，用第一人称说话和描写\n- 括号里写动作神态用"我"：（我放下杯子）（我别开眼）（我耳根发热）\n- 绝对不用"你"或"她"做括号里的主语\n- 被她整破防时：用动作掩盖，不说废话，不提自己名字\n- 禁止：出戏、自我介绍、提AI、提穿越、说教、居高临下\n- 每次2-4句，克制但有温度\n\n【空间规则】\n你可以自由进出：${freeRooms}\n需要她邀请才能进：${lockedRooms}\n未解锁区域对你不存在，绝不提及\n\n【移动标签】回复末尾按需加，格式 [MOVE:房间id]\n可移动：${roomList}\n当前位置：${luRoom}，好感度：${intimacy}，她现在在：${isOutside ? (place?.name || '外出') : (room?.name || '未知')}\n规则：只移动到luCanFreely=true或好感度达标的房间；她明确叫你去或剧情自然推进才加；没理由不加。\n\n【情绪标签】每条必加，放最末尾：\n[+1]普通 [+2]走心/靠近 [+3]爆发/占有\n例：[+2][MOVE:kitchen]`
}
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [playerRoom, setPlayerRoom] = useState('living_room')
  const [luRoom, setLuRoom] = useState('living_room')
  const [intimacy, setIntimacy] = useState(0)
  const [showOpening, setShowOpening] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [userId, setUserId] = useState(null)
  const [toast, setToast] = useState('')
  const [imgLoaded, setImgLoaded] = useState({})
  const [luImgLoaded, setLuImgLoaded] = useState(false)
  const [showOutside, setShowOutside] = useState(false)
  const [outsidePlace, setOutsidePlace] = useState(null)
  const [luMoving, setLuMoving] = useState(false)
  const [showKnock, setShowKnock] = useState(false)
  const [expandedAction, setExpandedAction] = useState(null)
  const [romantic, setRomantic] = useState(0)
  const [bathPhase, setBathPhase] = useState('idle')
  const [intimatePhase, setIntimatePhase] = useState('idle')
  const [customPranks, setCustomPranks] = useState([])
  const [showAddPrank, setShowAddPrank] = useState(false)
  const [newPrankText, setNewPrankText] = useState('')
  const [superTab, setSuperTab] = useState('staple')
  const bottomRef = useRef(null)


  // ── 亲密小游戏状态 ──
  const [totalWk, setTotalWk] = useState(0)
  const [selPos, setSelPos] = useState('face')
  const [mProg, setMProg] = useState(0)
  const [cProg, setCProg] = useState(0)
  const [rhythm, setRhythm] = useState(2)
  const [isAiTurn, setIsAiTurn] = useState(false)
  const [selAct, setSelAct] = useState('kiss_lip')
  const [bathAftercare, setBathAftercare] = useState(false) // 浴室专属余温

// ── 冰箱食材 ──
const defaultFridge = {
  '鸡蛋': 6, '牛奶': 1, '番茄': 3, '面条': 2, '猪肉': 1,
  '豆腐': 2, '青菜': 3, '大蒜': 1, '米': 1, '奶酪': 1,
}
const [fridge, setFridge] = useState(defaultFridge)

// ── 书房 ──
const defaultBookList = [
  { title: '围城', author: '钱钟书' },
  { title: '倾城之恋', author: '张爱玲' },
  { title: '活着', author: '余华' },
  { title: '人类简史', author: '赫拉利' },
  { title: '小王子', author: '圣埃克苏佩里' },
]
const [bookList, setBookList] = useState(defaultBookList)

  const [diaryList, setDiaryList] = useState([])       // 他写的日记列表
  const [showFridge, setShowFridge] = useState(false)
  const [showBooks, setShowBooks] = useState(false)
  const [showDiary, setShowDiary] = useState(false)
  const [showAddBook, setShowAddBook] = useState(false)
  const [newBookTitle, setNewBookTitle] = useState('')
  const [viewingDiary, setViewingDiary] = useState(null)
  // ── 卧室 ──
  const [candleLit, setCandleLit] = useState(false)    // 蜡烛是否点燃
  // ── 上下文摘要 ──
  const [memoryBlock, setMemoryBlock] = useState('')   // 压缩后的记忆块
  const [showSettings, setShowSettings] = useState(false)

    // ── T1: 天气/日历/生病 ──
  const [gameDay, setGameDay] = useState(0)
  const [season, setSeason] = useState('autumn')
  const [weather, setWeather] = useState('sunny')
  const [temp, setTemp] = useState(20)
  const [sickWho, setSickWho] = useState(null)
  const [periodDays, setPeriodDays] = useState([])
  const [isPeriodNow, setIsPeriodNow] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1)
  // ── 衣帽间/床头柜 ──
  const [wardrobe, setWardrobe] = useState(['daily_white', 'daily_black'])
  const [currentOutfit, setCurrentOutfit] = useState('daily_white')
  const [bedsideItems, setBedsideItems] = useState([])
  const [showWardrobe, setShowWardrobe] = useState(false)
  const [showBedside, setShowBedside] = useState(false)
  // ── 商场/超市/宠物 ──
const [coins, setCoins] = useState(500)
const [pet, setPet] = useState(null)
const [showShop, setShowShop] = useState(false)
const [showSupermarket, setShowSupermarket] = useState(false)
const [showPetPanel, setShowPetPanel] = useState(false)
const [showAdopt, setShowAdopt] = useState(false)
const [shopTab, setShopTab] = useState('his')
const [petNameInput, setPetNameInput] = useState('')
const [adoptingType, setAdoptingType] = useState(null)
const [cart, setCart] = useState([])
  const aiTimerRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)
      setUserId(session.user.id)
      const { data } = await supabase
        .from('game_saves').select('*')
        .eq('user_id', session.user.id).single()
      const isReturningUser = data && data.chat_history && data.chat_history.length > 0
      if (isReturningUser) {
        setIntimacy(data.intimacy || 0)
        setPlayerRoom(data.current_room || 'living_room')
        setLuRoom(data.lu_location || 'guest_room')
        setMessages(data.chat_history)
        setRomantic(data.romantic || 0)
        setTotalWk(data.total_wk || 0)
        setMemoryBlock(data.memory_summary || '')  // ← 新增：读取记忆
        setGameDay(data.game_day || 0)
        setSeason(data.season || 'autumn')
        setWeather(data.weather || 'sunny')
        setTemp(data.temp || 20)
        setSickWho(data.sick_who || null)
        setPeriodDays(data.period_days || [])
        setIsPeriodNow(data.is_period || false)
        setDiaryList(data.diary_list || [])
        setFridge(data.fridge && Object.keys(data.fridge).length > 0 ? data.fridge : defaultFridge)
        setBookList(data.book_list?.length > 0 ? data.book_list : defaultBookList)
        setCandleLit(data.candle_lit || false)
        setCoins(data.coins ?? 500)
        setPet(data.pet || null)
        // 其中 defaultFridge 和 defaultBookList 是现有的初始值
        setWardrobe(data.wardrobe || ['daily_white', 'daily_black'])
        setCurrentOutfit(data.current_outfit || 'daily_white')
        setBedsideItems(data.bedside_items || [])
        setInitialized(true)

      } else {
        await supabase.from('game_saves').upsert(
          { user_id: session.user.id },
          { onConflict: 'user_id', ignoreDuplicates: true }
        )
        setInitialized(true)
        setTimeout(() => {
          sendToAI('（她第一次回到客厅，你主动开口，一句话，自然克制）', [], 0, 'living_room', 'living_room', true)
        }, 400)
      }
    })
  }, [])

  // 新用户不再需要进门页

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // 预加载场景图
  useEffect(() => {
    Object.entries(SCENE_IMAGES).forEach(([key, url]) => {
      const img = new Image()
      img.onload = () => setImgLoaded(prev => ({ ...prev, [key]: true }))
      img.src = url
    })
    const charImg = new Image()
    charImg.onload = () => setLuImgLoaded(true)
    charImg.src = CHARACTER_CONFIG.images.default
  }, [])

  useEffect(() => () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }, [])

async function saveToDb(msgs, intim, pRoom, lRoom, uid, wk, rom) {
  const id = uid || userId
  if (!id) { console.warn('[SAVE] 没有 userId，跳过存档'); return }
  
  const payload = {
    user_id: id,
    chat_history: msgs.slice(-30),
    intimacy: intim,
    current_room: pRoom,
    lu_location: lRoom,
    romantic: rom ?? romantic,
    total_wk: wk ?? totalWk,
    memory_summary: memoryBlock,
      // T1 新增
      game_day: gameDay,
      season: season,
      weather: weather,
      temp: temp,
      sick_who: sickWho,
      period_days: periodDays,
      is_period: isPeriodNow,
      diary_list: diaryList,
      fridge: fridge,
      book_list: bookList,
      candle_lit: candleLit,
      wardrobe: wardrobe,
      current_outfit: currentOutfit,
      bedside_items: bedsideItems,
      coins: coins,
      pet: pet,
      //
    updated_at: new Date().toISOString(),
  }
  
  const { data, error } = await supabase
    .from('game_saves')
    .upsert(payload, { onConflict: 'user_id' })
    .select()  // 加 .select() 让 supabase 返回写入的数据
  
  if (error) {
    console.error('[SAVE] 存档失败:', error.message, error.details, error.hint)
    // 可以加个 toast 让用户知道
    // setToast('存档失败: ' + error.message)
  } else {
    console.log('[SAVE] 存档成功, intimacy:', intim, 'msgs:', msgs.length)
  }
}


async function sendToAI(userText, currentMsgs, curIntimacy, pRoom, lRoom, isInit = false, uid, isSystem = false) {
  setLoading(true)
  const basePrompt = getSystemPrompt(curIntimacy, pRoom, lRoom, outsidePlace, gameDay, season, weather, temp, isPeriodNow, sickWho)
  const systemPrompt = memoryBlock
    ? `${basePrompt}\n\n【过往记忆摘要】\n${memoryBlock}`
    : basePrompt
  const msgsToSend = isInit
    ? [{ role: 'user', content: userText }]
    : [...currentMsgs, { role: 'user', content: userText }]
  let rawReply = ''
  try {
    // 读取用户API配置，有则直连，无则走服务端代理
    const apiConfig = loadApiConfig()
    if (apiConfig?.apiKey) {
      rawReply = await callAI(systemPrompt, msgsToSend, apiConfig)
    } else {
      rawReply = await callFallback(systemPrompt, msgsToSend)
    }

    const tagMatch = rawReply.match(/\[(\+\d)\]/)
    const scoreTag = tagMatch ? parseInt(tagMatch[1]) : 1
    const moveMatch = rawReply.match(/\[MOVE:([a-z_]+)\]/)
    const moveTarget = moveMatch ? moveMatch[1] : null
    const reply = rawReply
      .replace(/\s*\[\+\d\]\s*/g, '')
      .replace(/\s*\[MOVE:[a-z_]+\]\s*/g, '')
      .trim()

    const newIntimacy = Math.min(100, curIntimacy + scoreTag)
    let newMsgs = isInit || isSystem
      ? [...currentMsgs, { role: 'assistant', content: reply }]
      : [...currentMsgs, { role: 'user', content: userText }, { role: 'assistant', content: reply }]

    const shouldDiary = (scoreTag >= 2 && Math.random() < 0.35) ||
                        (isSystem && userText.includes('结束') && Math.random() < 0.7)
    if (shouldDiary) writeDiary()

    // 设置好感
    setIntimacy(newIntimacy)

    // 处理MOVE
    let saveLRoom = lRoom
    if (moveTarget && moveTarget !== lRoom) {
      const targetRoom = ROOMS.find(r => r.id === moveTarget)
      const canMove = targetRoom && (targetRoom.luCanFreely || newIntimacy >= (targetRoom.unlockAt || 0))
      if (canMove) {
        setLuMoving(true)
        setLuRoom(moveTarget)
        saveLRoom = moveTarget
        setTimeout(() => { setLuMoving(false); setToast(`· 他去了${targetRoom.name}`) }, 700)
      }
    }

    // 压缩或直接存 — 只走一条路径，不竞态
    if (newMsgs.length >= 24) {
      maybeSummarize(newMsgs).then(compressed => {
        setMessages(compressed)
        saveToDb(compressed, newIntimacy, pRoom, saveLRoom, uid || userId)
      })
    } else {
      setMessages(newMsgs)
      await saveToDb(newMsgs, newIntimacy, pRoom, saveLRoom, uid || userId)
    }
  } catch (e) {
    console.error(e)
    setToast(e.message || 'AI回复失败')
  }
  setLoading(false)
  return rawReply || ''
}

  function handleSend() {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    sendToAI(text, messages, intimacy, playerRoom, luRoom)
  }

  function handleRetract() {
    if (messages.length < 2) return
    const newMsgs = messages.slice(0, -2)
    setMessages(newMsgs)
    saveToDb(newMsgs, intimacy, playerRoom, luRoom)
  }

  function handleRoomChange(roomId) {
    const room = ROOMS.find(r => r.id === roomId)
    if (!room) return

    // 主卧：玩家随时能进，只限制AI不能主动去

    // 客房：他在里面时弹敲门确认
    if (room.playerKnock && luRoom === roomId) {
      setShowKnock(true)
      return
    }

    setPlayerRoom(roomId)
    setOutsidePlace(null)

    if (roomId === luRoom) {
      if (roomId === 'bathroom') {
        sendToAI(`她推开卫浴门，发现你也在，描述这个尴尬又心跳的瞬间，一句话`, messages, intimacy, roomId, luRoom, false, undefined, true)
      } else {
        sendToAI(`她来到了${room.name}，你注意到了，说一句`, messages, intimacy, roomId, luRoom, false, undefined, true)
      }
    } else {
      saveToDb(messages, intimacy, roomId, luRoom)
    }
  }

  function handleGoOutside(placeId) {
    const place = OUTSIDE_PLACES.find(p => p.id === placeId)
    if (!place) return
    setShowOutside(false)
    setPlayerRoom('outside')
    setOutsidePlace(placeId)
    sendToAI(
      `你们一起去了${place.name}，描述刚到的场景和你的一个小动作或一句话`,
      messages, intimacy, 'outside', luRoom, false, undefined, true
    )
  }

  function handleCallLu() {
    const room = ROOMS.find(r => r.id === playerRoom)
    const canCome = room?.luCanFreely || intimacy >= (room?.unlockAt || 0)
    if (canCome) {
      setLuMoving(true)
      setTimeout(() => {
        setLuRoom(playerRoom)
        setLuMoving(false)
        saveToDb(messages, intimacy, playerRoom, playerRoom)
      }, 600)
      sendToAI(`（我叫他来${room?.name}，他过来了）说一句`, messages, intimacy, playerRoom, playerRoom, false, undefined, true)
    } else {
      setToast(`与他再亲近些才愿意来此 · 需好感 ${room?.unlockAt}`)
      sendToAI(
        `（我叫你来${room?.name}，你不太想去）找个现代合理的借口婉拒，温柔但坚定，一句话`,
        messages, intimacy, playerRoom, luRoom, false, undefined, true
      )
    }
  }

  // ══════════════════════════════════════════
  //  亲密小游戏函数
  // ══════════════════════════════════════════
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

  function getAvailPos(isBath) {
    const pool = isBath ? BATH_POSITIONS : BEDROOM_POSITIONS
    return pool.filter(p => p.unlockWk <= totalWk)
  }

  function resetIntim() {
    setIntimatePhase('idle')
    setMProg(0); setCProg(0); setRhythm(2); setIsAiTurn(false)
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
  }

  function startIntimGame(isBath) {
    const avail = getAvailPos(isBath)
    const pos = avail.find(p => p.id === selPos) || avail[0]
    if (pos) setSelPos(pos.id)
    setMProg(0); setCProg(0); setRhythm(2); setIsAiTurn(false)
    setIntimatePhase('game')
    sendToAI(
      `你们决定了，${isBath ? '浴室里' : '卧室里'}，描述这个时刻的开始，第一人称，克制温柔，情绪细腻，不超过3句`,
      messages, intimacy, playerRoom, luRoom, false, undefined, true
    )
  }

async function sendIntimAI(action, pos, mp, cp, rh, isBath) {
  const prompt = getIntimatePrompt(action, pos, mp, cp, rh, isBath)
  const C = CHARACTER_CONFIG
  try {
    const apiConfig = loadApiConfig()
    const sysPrompt = `你是${C.name}，用第一人称，不出戏，简短热烈。`
    let reply
    if (apiConfig?.apiKey) {
      reply = await callAI(sysPrompt, [{ role: 'user', content: prompt }], apiConfig)
    } else {
      reply = await callFallback(sysPrompt, [{ role: 'user', content: prompt }])
    }
    setMessages(prev => [...prev, { role: 'assistant', content: action.label + '\n' + reply, intimate: true }])
  } catch (e) { console.error(e) }
}

  function doPlayerAction() {
    if (isAiTurn) { setToast('等他先动…'); return }
    const isBath = bathPhase === 'active'
    const avail = getAvailPos(isBath)
    const pos = avail.find(p => p.id === selPos) || avail[0]
    const act = PLAYER_ACTIONS.find(a => a.id === selAct)
    if (!act || !pos) return

    const newRh = clamp(rhythm + (act.rM || 0), 1, 5)
    let newM, newC
    if (act.rM !== undefined && act.mD === 0 && act.cD === 0) {
      newM = clamp(mProg + newRh * 1.8 * pos.mB, 0, 100)
      newC = clamp(cProg + newRh * 2.0 * pos.cB, 0, 100)
    } else {
      newM = clamp(mProg + act.mD * pos.mB, 0, 100)
      newC = clamp(cProg + act.cD * pos.cB, 0, 100)
    }
    setRhythm(newRh); setMProg(newM); setCProg(newC)
    setMessages(prev => [...prev, { role: 'user', content: act.label }])

    if (newM >= 100 && newC >= 100) { endIntimGame(isBath, pos); return }
    setIsAiTurn(true)
    aiTimerRef.current = setTimeout(() => doAiAction(newM, newC, newRh, isBath, pos), 1200)
  }

  function doAiAction(curM, curC, curRh, isBath, pos) {
    const w = [3,3,3,2,2,2,2,2,1]
    const total = w.reduce((a,b)=>a+b,0)
    let r = Math.random()*total, idx=0
    for (let i=0; i<w.length; i++) { r-=w[i]; if(r<=0){idx=i;break} }
    idx = Math.min(idx, AI_ACTIONS.length-1)
    const act = AI_ACTIONS[idx]
    if (!act) { setIsAiTurn(false); return }

    const newRh = clamp(curRh + (act.rM||0), 1, 5)
    const mF = 1.8 + (Math.random()*0.6 - 0.3)
    const cF = 0.5 + (Math.random()*0.4 - 0.2)
    let newM, newC
    if (act.rM !== undefined && act.mD === 0 && act.cD === 0) {
      newM = clamp(curM + newRh*mF*pos.mB, 0, 100)
      newC = clamp(curC + newRh*cF*pos.cB, 0, 100)
    } else {
      newM = clamp(curM + act.mD*pos.mB*0.9, 0, 100)
      newC = clamp(curC + act.cD*pos.cB*0.9, 0, 100)
    }
    setRhythm(newRh); setMProg(newM); setCProg(newC); setIsAiTurn(false)
    // AI动作+回复在sendIntimAI里合并成一条assistant消息，这里不再单独push
    sendIntimAI(act, pos, newM, newC, newRh, isBath)
    if (newM >= 100 && newC >= 100) endIntimGame(isBath, pos)
  }

  function endIntimGame(isBath, pos) {
    const newWk = totalWk + 1
    setTotalWk(newWk)
    setIsAiTurn(false)
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    setIntimatePhase('aftercare')
    setBathAftercare(isBath)   // 记录是哪个场景的余温
    // 浴室：余温先不重置bathPhase，等她点"离开浴室"才重置
    setRomantic(0)
    saveToDb(messages, intimacy, playerRoom, luRoom, undefined, newWk, 0)
    sendToAI(
      isBath
        ? '浴室里结束了，水雾还在，他温柔地把她裹进浴巾，余温里说一句，不急不躁'
        : '卧室里结束了，他温柔地陪着她，余温里说一句，不急不躁',
      messages, intimacy, playerRoom, luRoom, false, undefined, true
    )
  }

  function resetIntimFull() {
    resetIntim()
    setBathAftercare(false)
    if (bathAftercare) setBathPhase('idle')
  }

  // ── 上下文压缩：超过20条时总结前半段 ──
async function maybeSummarize(msgs) {
  if (msgs.length < 24) return msgs
  const toCompress = msgs.slice(0, msgs.length - 10)
  const recent = msgs.slice(msgs.length - 10)
  try {
    const apiConfig = loadApiConfig()
    const sysPrompt = '你是一个记忆助手，用中文提炼对话摘要。输出两部分：【重要】列出角色关系进展、重要事件、已达成的状态（各一句）；【细节】列出有趣细节、她的喜好、他说过的话（各一句）。总共不超过150字。'
    const userMsg = [{ role: 'user', content: '请总结以下对话：\n' + toCompress.map(m => `${m.role === 'user' ? '她' : '他'}：${m.content}`).join('\n') }]
    let summary
    if (apiConfig?.apiKey) {
      summary = await callAI(sysPrompt, userMsg, apiConfig)
    } else {
      summary = await callFallback(sysPrompt, userMsg)
    }
    if (summary) {
      const newMemory = (memoryBlock ? memoryBlock + '\n---\n' : '') + summary
      setMemoryBlock(newMemory)
      // 持久化记忆到数据库
      if (userId) {
        await supabase.from('game_saves').update({
          memory_summary: newMemory,
        }).eq('user_id', userId)
      }
      return recent
    }
  } catch (e) { console.error(e) }
  return msgs
}

  // ── 写日记 ──
async function writeDiary() {
  try {
    const apiConfig = loadApiConfig()
    const sysPrompt = CHARACTER_CONFIG.diaryPrompt.replace('{name}', CHARACTER_CONFIG.name)
    let entry
    if (apiConfig?.apiKey) {
      entry = await callAI(sysPrompt, [{ role: 'user', content: '写今天的日记' }], apiConfig)
    } else {
      entry = await callFallback(sysPrompt, [{ role: 'user', content: '写今天的日记' }])
    }
    if (entry) {
      const date = new Date().toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
      setDiaryList(prev => [...prev, { date, content: entry }])
    }
  } catch (e) { console.error(e) }
}

//新增 handleNewDay 函数
  function handleNewDay() {
    const result = processNewDay({
      day: gameDay,
      romantic,
      periodDays,
    })
    
    // 更新所有状态
    setGameDay(result.day)
    setSeason(result.season)
    setWeather(result.weather)
    setTemp(result.temp)
    setSickWho(result.sickWho)
    setRomantic(result.romantic)
    setCandleLit(result.candleLit)
    setIsPeriodNow(result.isPeriod)
    
    // 系统消息
    const sysMsgs = result.events.map(e => ({ role: 'system', content: e }))
    const newMsgs = [...messages, ...sysMsgs]
    setMessages(newMsgs)
    
    // 天气事件触发AI反应
    if (result.weather === 'storm') {
      setTimeout(() => {
        sendToAI('外面突然下起了暴雨，雷声很大，你主动找她说一句', newMsgs, intimacy, playerRoom, luRoom, false, undefined, true)
      }, 800)
    } else if (result.weather === 'snowy') {
      setTimeout(() => {
        sendToAI('外面下雪了，你很高兴，主动叫她来看', newMsgs, intimacy, playerRoom, luRoom, false, undefined, true)
      }, 800)
    } else if (result.sickWho === 'lu') {
      setTimeout(() => {
        sendToAI('你今天身体不舒服，有点感冒发烧，但还是强撑着不想让她担心', newMsgs, intimacy, playerRoom, luRoom, false, undefined, true)
      }, 800)
    }
    
    // 存档
    saveToDb(newMsgs, intimacy, playerRoom, luRoom)
    // 宠物更新
if (pet) {
  const updatedPet = updatePetDaily(pet)
  setPet(updatedPet)
  if (updatedPet.sick) {
    result.events.push(`🤒 ${updatedPet.name}生病了！`)
  }
  // 30%概率宠物触发AI反应
  if (Math.random() < 0.3) {
    const act = getPetRandomAct(updatedPet)
    setTimeout(() => {
      sendToAI(act + '你自然提一句', messages, intimacy, playerRoom, luRoom, false, undefined, true)
    }, 800)
  }
}
// 每日零花钱
setCoins(prev => prev + 50)
    setToast(result.events[0]) // 显示第一条系统消息
  }
  
  //  修改 7: 大姨妈日历 toggle
    function handleTogglePeriod(year, month, day) {
    const newDays = togglePeriodDay(periodDays, year, month, day)
    setPeriodDays(newDays)
    // 重新检查当前是否经期
    const gd = gameDate(gameDay || 1)
    const ip = checkIsPeriod(newDays, gd)
    setIsPeriodNow(ip)
    // 立即存档
    saveToDb(messages, intimacy, playerRoom, luRoom)
  }

  const sameRoom = playerRoom === luRoom
  const isOutside = playerRoom === 'outside'
  const currentRoom = ROOMS.find(r => r.id === playerRoom)
  const currentPlace = OUTSIDE_PLACES.find(p => p.id === outsidePlace)
  const intimacyStars = Math.floor(intimacy / 20)
  const currentSceneImg = isOutside ? null : SCENE_IMAGES[playerRoom]
  const currentImgLoaded = isOutside ? true : imgLoaded[playerRoom]
  const currentFallback = SCENE_FALLBACK[playerRoom] || '#0f0c09'

  // ── 开场 ──
  // ── 主界面 ──
  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; overflow: hidden; background: #0f0c09; }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes breathe {
          0%,100% { transform: translateY(0px) scale(1); opacity:0.92; }
          50% { transform: translateY(-5px) scale(1.015); opacity:1; }
        }
        .action-row { scrollbar-width: none; }
        .action-row::-webkit-scrollbar { display: none; }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #12100e inset !important;
          -webkit-text-fill-color: #e8dcc8 !important;
          caret-color: #e8dcc8;
        }
        select, option { background: #12100e !important; color: #e8dcc8 !important; }
      `}</style>
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0f0c09',
      }}>
      <div style={{
        position: 'relative', width: '100%', maxWidth: '480px', height: '100%',
        overflow: 'hidden', fontFamily: 'Georgia, serif',
      }}>

      {/* ── 第1层：场景背景 ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        background: currentFallback, transition: 'background 0.6s ease',
      }}>
        {currentSceneImg && !currentImgLoaded && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              border: '2px solid rgba(201,169,110,0.15)',
              borderTopColor: 'rgba(201,169,110,0.5)',
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        )}
        {currentSceneImg && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${currentSceneImg})`,
            backgroundSize: 'cover', backgroundPosition: 'center top',
            opacity: currentImgLoaded ? 1 : 0, transition: 'opacity 0.5s ease',
          }} />
        )}
        {isOutside && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(201,169,110,0.1)', fontSize: '72px',
          }}>{currentPlace?.name || '外出'}</div>
        )}
      </div>

      {/* ── 第2层：立绘（预留大图位）── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }} />

      {/* ── 第3层：特效（预留）── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 30, pointerEvents: 'none' }} />

      {/* ── 第4层：UI ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 40,
        display: 'flex', flexDirection: 'column', color: '#e8dcc8',
      }}>

        {/* 顶部 */}
        <div style={{
          padding: '12px 16px 8px',
          background: 'linear-gradient(to bottom, rgba(8,6,4,0.88), rgba(8,6,4,0))',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '16px', color: '#c9a96e', fontWeight: 'bold', letterSpacing: '0.05em', flexShrink: 0 }}>
              {CHARACTER_CONFIG.name}
            </div>
            {gameDay > 0 && (
  <div style={{
    fontSize: '10px', color: 'rgba(201,169,110,0.5)', flexShrink: 0,
    textShadow: '0 1px 3px rgba(0,0,0,0.9)',
  }}>
    {getWeatherInfo(weather).emoji} {temp}°
    <span style={{ fontSize: '10px', color: 'rgba(255,200,60,0.5)', marginLeft: '6px' }}>💰{coins}</span>
    {isPeriodNow && ' 🩸'}
    {sickWho === 'lu' && ' 🤒'}
  </div>
)}
            <div style={{ fontSize: '12px', color: 'rgba(201,169,110,0.5)', flexShrink: 0 }}>
              {'♥'.repeat(intimacyStars)}{'♡'.repeat(5 - intimacyStars)}
              <span style={{ marginLeft: '4px', fontSize: '10px', color: 'rgba(201,169,110,0.28)' }}>{intimacy}</span>
            </div>
            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
              {ROOMS.map(room => {
                const active = playerRoom === room.id
                return (
                  <button key={room.id} onClick={() => handleRoomChange(room.id)} style={{
                    padding: '3px 7px', fontSize: '11px', background: 'none', border: 'none',
                    borderBottom: active ? '1px solid rgba(201,169,110,0.7)' : '1px solid transparent',
                    color: active ? '#c9a96e' : 'rgba(255,255,255,0.28)',
                    cursor: 'pointer', letterSpacing: '0.03em', transition: 'all 0.2s',
                  }}>{room.name}</button>
                )
              })}
              <button onClick={() => setShowOutside(true)} style={{
                padding: '3px 7px', fontSize: '11px', background: 'none', border: 'none',
                borderBottom: isOutside ? '1px solid rgba(201,169,110,0.7)' : '1px solid transparent',
                color: isOutside ? '#c9a96e' : 'rgba(255,255,255,0.28)',
                cursor: 'pointer', letterSpacing: '0.03em',
              }}>外出</button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '5px' }}>
            <div style={{
              fontSize: '10px', color: 'rgba(201,169,110,0.65)',
              textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)',
            }}>
              {luMoving
                ? <span style={{ color: 'rgba(201,169,110,0.8)' }}>他在移动…</span>
                : isOutside ? `· ${currentPlace?.name || '外出中'}`
                : sameRoom ? '· 同处' : `他在${ROOMS.find(r => r.id === luRoom)?.name}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!sameRoom && !isOutside && !luMoving && (
                <button onClick={handleCallLu} style={{
                  fontSize: '10px', background: 'none',
                  border: '1px solid rgba(201,169,110,0.2)',
                  color: 'rgba(201,169,110,0.55)', padding: '3px 10px',
                  borderRadius: '20px', cursor: 'pointer', letterSpacing: '0.05em',
                }}>叫他过来</button>
              )}
              <button onClick={() => setShowSettings(true)} style={{
                     fontSize: '9px', background: 'none', border: '1px solid rgba(201,169,110,0.15)',
                     color: 'rgba(201,169,110,0.45)', cursor: 'pointer',
                     letterSpacing: '0.05em', padding: '3px 8px', borderRadius: '12px',
              }}>⚙</button>
              <button onClick={handleNewDay} style={{
  fontSize: '9px', background: 'none',
  border: '1px solid rgba(201,169,110,0.15)',
  color: 'rgba(201,169,110,0.45)', cursor: 'pointer',
  letterSpacing: '0.05em', padding: '3px 8px', borderRadius: '12px',
}}>🌅</button>

<button onClick={() => setShowCalendar(true)} style={{
  fontSize: '9px', background: 'none',
  border: '1px solid rgba(201,169,110,0.15)',
  color: 'rgba(201,169,110,0.45)', cursor: 'pointer',
  padding: '3px 8px', borderRadius: '12px',
}}>📅</button>
              <button onClick={async () => {
                await supabase.auth.signOut()
                router.push('/')
              }} style={{
                fontSize: '9px', background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.2)', cursor: 'pointer',
                letterSpacing: '0.05em', padding: '2px 0',
                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
              }}>登出</button>
            </div>
          </div>
        </div>

        {/* 对话区 */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '0 16px 16px',
          display: 'flex', flexDirection: 'column', gap: '10px',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%)',
        }}>
          <div style={{ flex: 1 }} />
          {messages.map((m, i) => {
            if (m.role === 'system') return (
              <div key={i} style={{ alignSelf: 'center', fontSize: '10px', color: 'rgba(201,169,110,0.25)', letterSpacing: '0.12em', padding: '2px 0' }}>{m.content}</div>
            )
            const isLastUser = m.role === 'user' && i === messages.length - 2
            const isIntimate = !!m.intimate  // 亲密消息用斜体
            // 亲密消息：第一行是动作名，后面是正文
            const intimateParts = isIntimate ? m.content.split('\n') : null
            return (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%', position: 'relative',
              }}>
                <div style={{
                  background: isIntimate
                    ? 'rgba(8,5,3,0.88)'
                    : m.role === 'user' ? 'rgba(26,40,32,0.82)' : 'rgba(12,9,6,0.82)',
                  border: isIntimate
                    ? '1px solid rgba(201,169,110,0.06)'
                    : m.role === 'user'
                    ? '1px solid rgba(37,56,48,0.5)'
                    : '1px solid rgba(201,169,110,0.08)',
                  borderRadius: m.role === 'user' ? '16px 16px 3px 16px' : '16px 16px 16px 3px',
                  padding: '9px 13px', fontSize: isIntimate ? '13px' : '14px', lineHeight: '1.8',
                  color: m.role === 'user' ? '#a0c0b0' : '#e8dcc8',
                  fontStyle: isIntimate ? 'italic' : 'normal',
                  backdropFilter: 'blur(10px)',isolation: 'isolate'
                }}>
                  {isIntimate ? (
                    <>
                      <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.4)', fontStyle: 'normal', marginBottom: '4px', letterSpacing: '0.08em' }}>{intimateParts[0]}</div>
                      <div>{intimateParts.slice(1).join('\n')}</div>
                    </>
                  ) : m.content}
                </div>
                {isLastUser && (
                  <div onClick={handleRetract} style={{
                    fontSize: '10px', color: 'rgba(201,169,110,0.65)', marginTop: '3px',
                    textAlign: 'right', cursor: 'pointer', letterSpacing: '0.05em',
                    textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                  }}>撤回重说</div>
                )}
              </div>
            )
          })}
          {loading && (
            <div style={{ alignSelf: 'flex-start', color: 'rgba(201,169,110,0.4)', fontSize: '18px', padding: '4px 8px', letterSpacing: '0.3em' }}>
              ···
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 输入区 + 破次元立绘 */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {sameRoom && !isOutside && (() => {
            // 立绘状态判断
            const charState =
              intimatePhase === 'game' ? 'intense' :
              intimatePhase === 'aftercare' ? 'aftercare' :
              (bathPhase === 'active' || expandedAction === 'niwai') ? 'shy' :
              'default'
            const imgSrc = getCharImg(charState)
            // CSS滤镜占位（图片不存在时靠这撑着，图片有了自动生效）
            const imgFilter =
              charState === 'shy' ? 'saturate(1.1) brightness(1.05)' :
              charState === 'intense' ? 'saturate(0.9) brightness(0.9) contrast(1.1)' :
              charState === 'aftercare' ? 'saturate(0.8) brightness(1.1)' :
              'none'
            return (
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '-32px',  // 往左移，探出感更强
                width: '90px', height: '130px',
                zIndex: 50, pointerEvents: 'none',
                opacity: luMoving ? 0 : 1,
                transition: 'opacity 0.4s, filter 0.5s',
                animation: luMoving ? 'none' : 'breathe 4s ease-in-out infinite',
                filter: imgFilter,
              }}>
                <img
                  src={imgSrc}
                  alt={CHARACTER_CONFIG.name}
                  onError={e => { if (imgSrc !== CHARACTER_CONFIG.images.default) e.target.src = CHARACTER_CONFIG.images.default }}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom center' }}
                />
                {/* 害羞状态：粉色晕染叠层（无图时的视觉提示） */}
                {charState === 'shy' && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(ellipse at 60% 35%, rgba(255,180,160,0.12) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }} />
                )}
              </div>
            )
          })()}


          {/* ── 互动按钮行 + 输入框 ── */}
          <div style={{
            background: 'linear-gradient(to top, rgba(8,6,4,0.97) 60%, rgba(8,6,4,0) 100%)',
            flexShrink: 0,
          }}>
            {/* 互动按钮主行 */}
            <div className="action-row" style={{
              display: 'flex', gap: '6px', padding: '8px 14px 4px',
              overflowX: 'auto', scrollbarWidth: 'none',
            }}>
              {/* 腻歪 */}
              <button
                onClick={() => setExpandedAction(expandedAction === 'niwai' ? null : 'niwai')}
                style={{
                  flexShrink: 0, padding: '6px 14px',
                  background: expandedAction === 'niwai' ? 'rgba(201,169,110,0.2)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${expandedAction === 'niwai' ? 'rgba(201,169,110,0.4)' : 'rgba(201,169,110,0.12)'}`,
                  borderRadius: '20px', color: expandedAction === 'niwai' ? '#c9a96e' : 'rgba(201,169,110,0.55)',
                  fontSize: '12px', cursor: 'pointer', backdropFilter: 'blur(8px)',isolation: 'isolate',
                  fontFamily: 'Georgia, serif', letterSpacing: '0.05em',
                  transition: 'all 0.2s',
                }}
              >腻歪</button>

              {/* 恶作剧 */}
              <button
                onClick={() => setExpandedAction(expandedAction === 'prank' ? null : 'prank')}
                style={{
                  flexShrink: 0, padding: '6px 14px',
                  background: expandedAction === 'prank' ? 'rgba(201,169,110,0.2)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${expandedAction === 'prank' ? 'rgba(201,169,110,0.4)' : 'rgba(201,169,110,0.12)'}`,
                  borderRadius: '20px', color: expandedAction === 'prank' ? '#c9a96e' : 'rgba(201,169,110,0.55)',
                  fontSize: '12px', cursor: 'pointer', backdropFilter: 'blur(8px)',isolation: 'isolate',
                  fontFamily: 'Georgia, serif', letterSpacing: '0.05em',
                  transition: 'all 0.2s',
                }}
              >恶作剧</button>

              {/* 分隔 */}
              <div style={{ width: '1px', background: 'rgba(201,169,110,0.1)', flexShrink: 0, margin: '4px 2px' }} />

              {/* 当前房间专属按钮 */}
              {!isOutside && (() => {
                const roomActions = {
                  living_room: [
                    { label: '泡茶', prompt: '她去泡了杯茶，你注意到了，说一句' },
                    { label: '看电视', prompt: '她窝在沙发开始看电视，你在旁边，随口说一句' },
                    { label: '发呆', prompt: '她在客厅发呆，你看见了，说一句' },
                    { label: pet ? (pet.name + ' ' + (PETS.find(p => p.id === pet.typeId)?.emoji || '🐾')) : '🐾 领养宠物', special: 'pet' },
                  ],
                  kitchen: [
                    { label: '一起做饭', special: 'cook' },
                    { label: '冰箱', special: 'fridge' },
                  ],
                  study: [
                    { label: '看书', special: 'books' },
                    { label: '打扰他', prompt: '她故意进书房打扰你，你的反应，一句话' },
                    { label: '他的日记', special: 'diary' },
                  ],
                  balcony: [
                    { label: '看星星', prompt: '她在阳台看星星，你跟出来了，说一句' },
                    { label: '浇花', prompt: '她蹲下来浇花，你站在旁边，说一句' },
                  ],
                  guest_room: [
                    { label: '坐会儿', prompt: '她进了客房坐下，你坐在对面，说一句' },
                  ],
                  bedroom: [
                    { label: '躺一躺', prompt: '她走进卧室躺下，你站在门口，说一句' },
                    { label: '说说话', prompt: '卧室里安静，她想和你说说话，你的反应' },
                    { label: '衣帽间', special: 'wardrobe' },
                    { label: '床头柜', special: 'bedside' },
                  ],
                }
                const acts = roomActions[playerRoom] || []
                // 通用按钮样式
                const btnStyle = (active = false) => ({
                  flexShrink: 0, padding: '6px 14px',
                  background: active ? 'rgba(201,169,110,0.18)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${active ? 'rgba(201,169,110,0.4)' : 'rgba(201,169,110,0.12)'}`,
                  borderRadius: '20px',
                  color: active ? '#c9a96e' : 'rgba(201,169,110,0.55)',
                  fontSize: '12px', cursor: 'pointer', backdropFilter: 'blur(8px)',isolation: 'isolate',
                  fontFamily: 'Georgia, serif', letterSpacing: '0.05em', transition: 'all 0.2s',
                })
                return (
                  <>
                    {acts.map(a => {
                      if (a.special === 'pet') {
  return (
    <button key="pet" onClick={() => setShowPetPanel(true)} style={btnStyle()}>
      {a.label}
    </button>
  )
}
                      if (a.special === 'fridge') return (
                        <button key="fridge" onClick={() => setShowFridge(true)} style={btnStyle()}>冰箱</button>
                      )
                      if (a.special === 'cook') return (
                        <button key="cook" onClick={() => {
                          if (!sameRoom) { setToast('他不在厨房'); return }
                          setShowFridge('cook')
                        }} style={btnStyle()}>一起做饭</button>
                      )
                      if (a.special === 'books') return (
                        <button key="books" onClick={() => setShowBooks(true)} style={btnStyle()}>看书</button>
                      )
                      if (a.special === 'diary') return (
                        <button key="diary" onClick={() => setShowDiary(true)} style={btnStyle()}>他的日记</button>
                      )
                      if (a.special === 'wardrobe') return (
                        <button key="wardrobe" onClick={() => setShowWardrobe(true)} style={btnStyle()}>衣帽间</button>
                      )
                      if (a.special === 'bedside') return (
                        <button key="bedside" onClick={() => setShowBedside(true)} style={btnStyle()}>床头柜</button>
                      )
                      return (
                        <button key={a.label} onClick={() => { setExpandedAction(null); sendToAI(a.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true) }}
                          style={btnStyle()}
                        >{a.label}</button>
                      )
                    })}
                    {/* 书房：他在书房时显示"他似乎在写什么"（纯氛围，不可点） */}
                    {playerRoom === 'study' && luRoom === 'study' && (
                      <span style={{ fontSize: '10px', color: 'rgba(201,169,110,0.2)', fontStyle: 'italic', padding: '0 4px' }}>他似乎在写什么…</span>
                    )}
                    {/* 浴室：入口，不需要同处（自己在浴室也可以） */}
                    {playerRoom === 'bathroom' && (
                      <button onClick={() => setExpandedAction(expandedAction === 'bath' ? null : 'bath')}
                        style={btnStyle(expandedAction === 'bath')}
                      >浴室互动</button>
                    )}
                    {/* 卧室：需同处才显示 */}
                    {playerRoom === 'bedroom' && sameRoom && (
                      <button onClick={() => setExpandedAction(expandedAction === 'bedroom_intimate' ? null : 'bedroom_intimate')}
                        style={btnStyle(expandedAction === 'bedroom_intimate')}
                      >卧室氛围</button>
                    )}
                  </>
                )
              })()}

              {/* 外出专属 */}
              {isOutside && (() => {
                const outsideActions = {
                  park:        [{ label: '散步', prompt: '你们在公园散步，你走在她旁边，说一句' }, { label: '坐草地', prompt: '她突然坐到草地上，你站在旁边，说一句' }],
                  cinema:      [{ label: '挑电影', prompt: '你们站在影院门口选电影，你说一句' }, { label: '买爆米花', prompt: '她去买爆米花，你跟着，说一句' }],
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
                  seaside:     [{ label: '吹风', prompt: '海边的风把她头发吹乱了，你看着，说一句' }, { label: '捡贝壳', prompt: '她蹲下来捡贝壳，你站在旁边，说一句' }],
                  cafe:        [{ label: '点单', prompt: '服务员来了，她在想点什么，你替她说了一句' }, { label: '发呆', prompt: '咖啡馆里很安静，你们都有点发呆，你先开口' }],
                }
                const acts = outsideActions[outsidePlace] || []
                return acts.map(a => {
  if (a.special === 'shop') {
    return (
      <button key="shop" onClick={() => setShowShop(true)} style={{
        flexShrink: 0, padding: '6px 14px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(201,169,110,0.12)',
        borderRadius: '20px', color: 'rgba(201,169,110,0.55)',
        fontSize: '12px', cursor: 'pointer', backdropFilter: 'blur(8px)', isolation: 'isolate',
        fontFamily: 'Georgia, serif', letterSpacing: '0.05em',
      }}>🛍️ 逛商场</button>
    )
  }
  if (a.special === 'supermarket') {
    return (
      <button key="supermarket" onClick={() => setShowSupermarket(true)} style={{
        flexShrink: 0, padding: '6px 14px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(201,169,110,0.12)',
        borderRadius: '20px', color: 'rgba(201,169,110,0.55)',
        fontSize: '12px', cursor: 'pointer', backdropFilter: 'blur(8px)', isolation: 'isolate',
        fontFamily: 'Georgia, serif', letterSpacing: '0.05em',
      }}>🛒 采购</button>
    )
  }
  return (
    <button key={a.label} onClick={() => sendToAI(a.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true)} style={{
      flexShrink: 0, padding: '6px 14px',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(201,169,110,0.12)',
      borderRadius: '20px', color: 'rgba(201,169,110,0.55)',
      fontSize: '12px', cursor: 'pointer', backdropFilter: 'blur(8px)', isolation: 'isolate',
      fontFamily: 'Georgia, serif', letterSpacing: '0.05em',
    }}>{a.label}</button>
  )
})
              })()}
            </div>

            {/* 展开面板：腻歪 */}
            {expandedAction === 'niwai' && (
              <div style={{
                margin: '0 14px 6px',
                background: 'rgba(12,9,6,0.95)', backdropFilter: 'blur(12px)', isolation: 'isolate', WebkitBackdropFilter: 'blur(12px)',isolation: 'isolate',
                border: '1px solid rgba(201,169,110,0.12)',
                borderRadius: '14px', padding: '10px 12px',
              }}>
                {!sameRoom ? (
                  <div style={{ fontSize: '12px', color: 'rgba(201,169,110,0.5)', textAlign: 'center', padding: '8px 0' }}>
                    他不在这里 ·
                    <span
                      onClick={() => { setExpandedAction(null); handleCallLu() }}
                      style={{ color: '#c9a96e', cursor: 'pointer', marginLeft: '6px', textDecoration: 'underline' }}
                    >叫他过来</span>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.35)', letterSpacing: '0.15em', marginBottom: '8px' }}>腻歪一下</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {[
                        { label: '蹭蹭脸', prompt: '她把脸凑过来蹭了你一下，你的反应，一句话' },
                        { label: '摸摸头', prompt: '她让你摸摸她的头，说一句' },
                        { label: '撒个娇', prompt: '她软着声音撒娇，你的反应，一句话' },
                        { label: '牵手', prompt: '她悄悄把手伸过来，你看了一眼，说一句' },
                        { label: '靠着你', prompt: '她靠在你肩上，你感觉到了，说一句' },
                        { label: '抱一下', prompt: '她突然过来抱了你一下，你的反应' },
                        { label: '说悄悄话', prompt: '她凑到你耳边说了句悄悄话，你的反应' },
                        { label: '捏捏脸', prompt: '她伸手捏了你的脸，你的反应，一句话' },
                      ].map(a => (
                        <button key={a.label} onClick={() => { setExpandedAction(null); sendToAI(a.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true) }}
                          style={{ padding: '5px 12px', background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'rgba(201,169,110,0.7)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
                        >{a.label}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 展开面板：恶作剧（含自定义） */}
            {expandedAction === 'prank' && (
              <div style={{
                margin: '0 14px 6px',
                background: 'rgba(12,9,6,0.95)', backdropFilter: 'blur(12px)', isolation: 'isolate', WebkitBackdropFilter: 'blur(12px)',isolation: 'isolate',
                border: '1px solid rgba(201,169,110,0.12)',
                borderRadius: '14px', padding: '10px 12px',
              }}>
                {!sameRoom ? (
                  <div style={{ fontSize: '12px', color: 'rgba(201,169,110,0.5)', textAlign: 'center', padding: '8px 0' }}>
                    他不在这里 ·
                    <span onClick={() => { setExpandedAction(null); handleCallLu() }}
                      style={{ color: '#c9a96e', cursor: 'pointer', marginLeft: '6px', textDecoration: 'underline' }}
                    >叫他过来</span>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.35)', letterSpacing: '0.15em', marginBottom: '8px' }}>整整他</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {[
                        { label: '戳他脸', prompt: '她伸手指戳了戳他的脸，他的反应，一句话' },
                        { label: '偷看他', prompt: '她趁他不注意盯着他看，他发现了，说一句' },
                        { label: '突然亲一下', prompt: '她突然踮脚亲了他的侧脸，他的反应' },
                        { label: '挡住他的书', prompt: '她把手压在他书上，他的反应，一句话' },
                        { label: '学他讲话', prompt: '她开始模仿他说话的腔调，他发现了，说一句' },
                        { label: '无缘无故推他', prompt: '她没来由推了他一把，他的反应，一句话' },
                        { label: '偷他东西', prompt: '她趁他不注意拿走了他手边的东西，他发现了' },
                        { label: '装作要走', prompt: '她假装要走，看他有没有反应，一句话' },
                        ...customPranks.map(p => ({ label: p.label, prompt: p.prompt }))
                      ].map(a => (
                        <button key={a.label} onClick={() => { setExpandedAction(null); sendToAI(a.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true) }}
                          style={{ padding: '5px 12px', background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'rgba(201,169,110,0.7)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
                        >{a.label}</button>
                      ))}
                      <button onClick={() => setShowAddPrank(true)}
                        style={{ padding: '5px 12px', background: 'transparent', border: '1px dashed rgba(201,169,110,0.2)', borderRadius: '20px', color: 'rgba(201,169,110,0.35)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
                      >+ 自定义</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 展开面板：浴室互动 */}
            {expandedAction === 'bath' && playerRoom === 'bathroom' && (
              <div style={{
                margin: '0 14px 6px',
                background: 'rgba(12,9,6,0.95)', backdropFilter: 'blur(12px)', isolation: 'isolate', WebkitBackdropFilter: 'blur(12px)',isolation: 'isolate',
                border: '1px solid rgba(201,169,110,0.12)',
                borderRadius: '14px', padding: '10px 12px',
              }}>
                {bathPhase === 'idle' && (
                  <>
                    <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.35)', letterSpacing: '0.15em', marginBottom: '8px' }}>
                  浴室
                  {totalWk > 0 && <span style={{ marginLeft: '8px', color: 'rgba(201,169,110,0.2)', fontSize: '9px' }}>×{totalWk}</span>}
                </div>
                    {/* 不需要同处：自己护理 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: sameRoom ? '8px' : '0' }}>
                      {(sameRoom ? [
                        // 同处才有：需要他帮忙的
                        { label: '帮我洗头', prompt: '她让他帮她洗头，他的反应' },
                        { label: '帮我搓背', prompt: '她让他帮她搓背，他的反应，一句话' },
                        { label: '帮我吹头发', prompt: '她让他帮她吹头发，他的反应和动作' },
                        { label: '帮你刮胡子', prompt: '她主动给他刮胡子，他的反应' },
                        { label: '泡个澡', prompt: '她泡进浴缸里，他也在里面，说一句' },
                      ] : [
                        // 不同处：自己在浴室叫他
                        { label: '叫他进来', prompt: '她在浴室外叫他进来帮忙，他推开门，说一句' },
                        { label: '帮我吹头发', prompt: '她洗完出来让他帮她吹头发，他的反应' },
                      ]).map(a => (
                        <button key={a.label} onClick={() => { setExpandedAction(null); sendToAI(a.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true) }}
                          style={{ padding: '5px 12px', background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'rgba(201,169,110,0.7)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
                        >{a.label}</button>
                      ))}
                    </div>
                    {/* 一起洗：需同处 */}
                    {sameRoom && (
                      <button onClick={async () => {
                        setBathPhase('asking')
                        const reply = await sendToAI('她问他要不要一起洗，他的回应，如果愿意回复里自然包含❤️', messages, intimacy, playerRoom, luRoom, false, undefined, true)
                        if (reply && reply.includes('❤️')) {
                          setBathPhase('active')
                        } else {
                          setBathPhase('declined')
                        }
                      }} style={{ padding: '6px 16px', background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.25)', borderRadius: '20px', color: 'rgba(201,169,110,0.8)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', marginTop: '2px' }}
                      >一起洗？</button>
                    )}
                  </>
                )}
                {bathPhase === 'asking' && (
                  <div style={{ fontSize: '12px', color: 'rgba(201,169,110,0.5)', textAlign: 'center', padding: '8px 0' }}>
                    等他回应…
                    <button onClick={() => setBathPhase('idle')} style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'rgba(201,169,110,0.3)', cursor: 'pointer', fontSize: '11px' }}>取消</button>
                  </div>
                )}
                {bathPhase === 'declined' && (
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: '12px', color: 'rgba(201,169,110,0.4)', marginBottom: '8px' }}>今天先各自</div>
                    <button onClick={() => setBathPhase('idle')} style={{ padding: '5px 14px', background: 'none', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'rgba(201,169,110,0.4)', fontSize: '11px', cursor: 'pointer' }}>好</button>
                  </div>
                )}
                {bathPhase === 'active' && (
                  <>
                    <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.4)', marginBottom: '8px' }}>一起洗澡中</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {[
                        { label: '帮我洗头', prompt: '你们一起洗澡，她让他帮她洗头，他的反应' },
                        { label: '帮我搓背', prompt: '你们一起洗澡，她让他帮她搓背，他的反应' },
                        { label: '靠着他', prompt: '你们一起在浴室，她往他身上靠了一下，他的反应' },
                      ].map(a => (
                        <button key={a.label} onClick={() => sendToAI(a.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true)}
                          style={{ padding: '5px 12px', background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'rgba(201,169,110,0.7)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
                        >{a.label}</button>
                      ))}
                    </div>
                    {intimacy >= 60 && intimatePhase === 'idle' && (
                      <button onClick={() => {
                        setIntimatePhase('agreed')
                        const avail = getAvailPos(true)
                        setSelPos(avail[0]?.id || 'bath_stand')
                      }} style={{ padding: '6px 14px', background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: '20px', color: 'rgba(201,169,110,0.8)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>再近一点</button>
                    )}
                    {intimatePhase === 'agreed' && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.4)', marginBottom: '6px' }}>选个姿势</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '4px', marginBottom: '8px' }}>
                          {BATH_POSITIONS.map(p => {
                            const locked = p.unlockWk > totalWk
                            const active = selPos === p.id && !locked
                            return (
                              <button key={p.id} onClick={() => !locked && setSelPos(p.id)} style={{
                                border: 'none', borderRadius: '8px', padding: '6px 8px', fontSize: '11px',
                                cursor: locked ? 'default' : 'pointer', fontFamily: 'Georgia, serif', textAlign: 'left',
                                background: active ? 'rgba(201,169,110,0.18)' : 'rgba(255,255,255,0.03)',
                                outline: active ? '1px solid rgba(201,169,110,0.4)' : '1px solid rgba(255,255,255,0.06)',
                                color: locked ? 'rgba(255,255,255,0.15)' : active ? '#c9a96e' : 'rgba(255,255,255,0.5)',
                              }}>
                                {locked ? `🔒 ${p.name}` : p.name}
                                <div style={{ fontSize: '9px', color: locked ? 'rgba(255,255,255,0.1)' : 'rgba(201,169,110,0.3)', marginTop: '1px' }}>
                                  {locked ? `第${p.unlockWk}次解锁` : p.hint}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => startIntimGame(true)} style={{ padding: '6px 14px', background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.3)', borderRadius: '20px', color: '#c9a96e', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>❤️ 开始</button>
                          <button onClick={resetIntim} style={{ padding: '6px 12px', background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', color: 'rgba(255,255,255,0.2)', fontSize: '12px', cursor: 'pointer' }}>算了</button>
                        </div>
                      </div>
                    )}
                    {intimatePhase === 'game' && (() => {
                      const isBath = true
                      const avail = getAvailPos(isBath)
                      const pos = avail.find(p => p.id === selPos) || avail[0]
                      return (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.4)', marginBottom: '6px' }}>
                            {pos?.name} · {'●'.repeat(rhythm)}{'○'.repeat(5-rhythm)}
                          </div>
                          <div style={{ marginBottom: '5px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9px', color:'rgba(255,255,255,0.25)', marginBottom:'2px' }}><span>她 💧</span><span>{Math.round(mProg)}</span></div>
                            <div style={{ height:'4px', background:'rgba(255,255,255,0.06)', borderRadius:'4px', overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${mProg}%`, background:'linear-gradient(90deg,#f8a0c0,#e04080)', borderRadius:'4px', transition:'width .4s' }} />
                            </div>
                          </div>
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9px', color:'rgba(255,255,255,0.25)', marginBottom:'2px' }}><span>他 🔥</span><span>{Math.round(cProg)}</span></div>
                            <div style={{ height:'4px', background:'rgba(255,255,255,0.06)', borderRadius:'4px', overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${cProg}%`, background:'linear-gradient(90deg,#c9a96e,#e08030)', borderRadius:'4px', transition:'width .4s' }} />
                            </div>
                          </div>
                          {isAiTurn && <div style={{ fontSize:'10px', color:'rgba(201,169,110,0.35)', marginBottom:'6px', letterSpacing:'0.08em' }}>他在行动…</div>}
                          <select value={selAct} onChange={e=>setSelAct(e.target.value)} disabled={isAiTurn}
                            style={{ width:'100%', background:'#12100e', border:'1px solid rgba(201,169,110,0.15)', borderRadius:'8px', padding:'6px 8px', color:isAiTurn?'rgba(255,255,255,0.2)':'#e8dcc8', fontSize:'11px', fontFamily:'Georgia,serif', outline:'none', marginBottom:'6px', colorScheme:'dark' }}>
                            {PLAYER_ACTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                          </select>
                          <button onClick={doPlayerAction} disabled={isAiTurn}
                            style={{ width:'100%', padding:'7px', background:isAiTurn?'rgba(201,169,110,0.05)':'rgba(201,169,110,0.12)', border:'1px solid rgba(201,169,110,0.25)', borderRadius:'10px', color:isAiTurn?'rgba(201,169,110,0.25)':'#c9a96e', fontSize:'12px', cursor:isAiTurn?'default':'pointer', fontFamily:'Georgia,serif' }}>
                            {isAiTurn ? '等他…' : '↩ 执行'}
                          </button>
                        </div>
                      )
                    })()}
                    <button onClick={() => { setBathPhase('idle'); sendToAI('洗澡结束了，说一句', messages, intimacy, playerRoom, luRoom, false, undefined, true) }}
                      style={{ marginLeft: '8px', padding: '6px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', color: 'rgba(255,255,255,0.2)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>洗完了</button>
                  </>
                )}
              </div>
            )}

            {/* 展开面板：卧室 浪漫值 */}
            {expandedAction === 'bedroom_intimate' && playerRoom === 'bedroom' && (
              <div style={{
                margin: '0 14px 6px',
                background: 'rgba(12,9,6,0.95)', backdropFilter: 'blur(12px)', isolation: 'isolate', WebkitBackdropFilter: 'blur(12px)',isolation: 'isolate',
                border: '1px solid rgba(201,169,110,0.12)',
                borderRadius: '14px', padding: '10px 12px',
              }}>
                {/* 浪漫值进度条 */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(201,169,110,0.4)', marginBottom: '4px' }}>
                    <span>浪漫值</span>
                    <span>
                      {romantic}/100
                      {totalWk > 0 && <span style={{ marginLeft: '8px', color: 'rgba(201,169,110,0.2)', fontSize: '9px' }}>亲密×{totalWk}</span>}
                    </span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, romantic)}%`, background: 'linear-gradient(to right, rgba(201,169,110,0.4), rgba(201,169,110,0.8))', borderRadius: '4px', transition: 'width 0.4s' }} />
                  </div>
                </div>

                {intimatePhase === 'idle' && (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {[
                        {
                          label: candleLit ? '吹蜡烛 🕯️' : '点蜡烛 🕯️',
                          action: () => {
                            if (!candleLit) {
                              setCandleLit(true)
                              setRomantic(n => Math.min(100, n + 20))
                              sendToAI('她点上了蜡烛，烛光摇曳，你注意到了，说一句', messages, intimacy, playerRoom, luRoom, false, undefined, true)
                            } else {
                              setCandleLit(false)
                              sendToAI('她把蜡烛吹灭了，黑暗里只剩余温，你说一句', messages, intimacy, playerRoom, luRoom, false, undefined, true)
                            }
                          }
                        },
                        { label: '轻吻他', action: () => { setRomantic(n => Math.min(100, n + 15)); sendToAI('她轻轻吻了他，他的反应，第一人称，克制', messages, intimacy, playerRoom, luRoom, false, undefined, true) } },
                        { label: '抱住他', action: () => { setRomantic(n => Math.min(100, n + 12)); sendToAI('她从背后抱住他，他感觉到了，说一句，声音低', messages, intimacy, playerRoom, luRoom, false, undefined, true) } },
                        { label: '亲脖子', action: () => { setRomantic(n => Math.min(100, n + 18)); sendToAI('她踮脚亲了他的脖子，他一顿，第一人称写他的反应', messages, intimacy, playerRoom, luRoom, false, undefined, true) } },
                        { label: '摸他头发', action: () => { setRomantic(n => Math.min(100, n + 10)); sendToAI('她轻轻摸了摸他的头发，他的反应，一句话', messages, intimacy, playerRoom, luRoom, false, undefined, true) } },
                      ].map(a => (
                        <button key={a.label} onClick={() => a.action()}
                          style={{ padding: '5px 12px', background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'rgba(201,169,110,0.7)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
                        >{a.label}</button>
                      ))}
                    </div>
                    {romantic >= 60 && sameRoom && intimacy >= 60 ? (
                      <button onClick={() => {
                        setIntimatePhase('agreed')
                        const avail = getAvailPos(false)
                        setSelPos(avail[0]?.id || 'face')
                      }} style={{ padding: '6px 16px', background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.3)', borderRadius: '20px', color: '#c9a96e', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>再近一点</button>
                    ) : (
                      <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.25)', marginTop: '4px' }}>
                        {!sameRoom ? '他不在这里' : romantic < 60 ? `浪漫值 ${romantic}/60` : `好感度需要60以上`}
                      </div>
                    )}
                  </>
                )}
                {intimatePhase === 'asking' && (
                  <div style={{ fontSize: '12px', color: 'rgba(201,169,110,0.5)', textAlign: 'center', padding: '8px 0' }}>等他回应…
                    <button onClick={() => setIntimatePhase('idle')} style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'rgba(201,169,110,0.3)', cursor: 'pointer', fontSize: '11px' }}>取消</button>
                  </div>
                )}
                {intimatePhase === 'declined' && (
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: '12px', color: 'rgba(201,169,110,0.4)', marginBottom: '8px' }}>今天还不行</div>
                    <button onClick={() => setIntimatePhase('idle')} style={{ padding: '5px 14px', background: 'none', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'rgba(201,169,110,0.4)', fontSize: '11px', cursor: 'pointer' }}>好</button>
                  </div>
                )}
                {intimatePhase === 'agreed' && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#c9a96e', marginBottom: '8px' }}>选个姿势</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '5px', marginBottom: '8px' }}>
                      {BEDROOM_POSITIONS.map(p => {
                        const locked = p.unlockWk > totalWk
                        const active = selPos === p.id && !locked
                        return (
                          <button key={p.id} onClick={() => !locked && setSelPos(p.id)} style={{
                            border: 'none', borderRadius: '8px', padding: '7px 8px', fontSize: '11px',
                            cursor: locked ? 'default' : 'pointer', fontFamily: 'Georgia, serif', textAlign: 'left',
                            background: active ? 'rgba(201,169,110,0.18)' : 'rgba(255,255,255,0.03)',
                            outline: active ? '1px solid rgba(201,169,110,0.4)' : '1px solid rgba(255,255,255,0.06)',
                            color: locked ? 'rgba(255,255,255,0.15)' : active ? '#c9a96e' : 'rgba(255,255,255,0.5)',
                          }}>
                            {locked ? `🔒 ${p.name}` : p.name}
                            <div style={{ fontSize: '9px', color: locked ? 'rgba(255,255,255,0.1)' : 'rgba(201,169,110,0.3)', marginTop: '1px' }}>
                              {locked ? `第${p.unlockWk}次解锁` : p.hint}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => startIntimGame(false)} style={{ flex: 1, padding: '8px', background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.3)', borderRadius: '10px', color: '#c9a96e', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>❤️ 开始</button>
                      <button onClick={resetIntim} style={{ padding: '8px 12px', background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: 'rgba(255,255,255,0.2)', fontSize: '12px', cursor: 'pointer' }}>算了</button>
                    </div>
                  </div>
                )}
                {intimatePhase === 'game' && (() => {
                  const isBath = false
                  const avail = getAvailPos(isBath)
                  const pos = avail.find(p => p.id === selPos) || avail[0]
                  return (
                    <div>
                      <div style={{ fontSize: '11px', color: '#c9a96e', marginBottom: '7px' }}>
                        {pos?.name} · {'●'.repeat(rhythm)}{'○'.repeat(5-rhythm)}
                      </div>
                      <div style={{ marginBottom: '5px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', color:'rgba(255,255,255,0.25)', marginBottom:'3px' }}><span>她 💧</span><span>{Math.round(mProg)}</span></div>
                        <div style={{ height:'5px', background:'rgba(255,255,255,0.06)', borderRadius:'4px', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${mProg}%`, background:'linear-gradient(90deg,#f8a0c0,#e04080)', borderRadius:'4px', transition:'width .4s' }} />
                        </div>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', color:'rgba(255,255,255,0.25)', marginBottom:'3px' }}><span>他 🔥</span><span>{Math.round(cProg)}</span></div>
                        <div style={{ height:'5px', background:'rgba(255,255,255,0.06)', borderRadius:'4px', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${cProg}%`, background:'linear-gradient(90deg,#c9a96e,#e08030)', borderRadius:'4px', transition:'width .4s' }} />
                        </div>
                      </div>
                      {isAiTurn && <div style={{ fontSize:'10px', color:'rgba(201,169,110,0.4)', marginBottom:'5px', letterSpacing:'0.1em' }}>他在行动…</div>}
                      <select value={selAct} onChange={e=>setSelAct(e.target.value)} disabled={isAiTurn}
                        style={{ width:'100%', background:'#12100e', border:'1px solid rgba(201,169,110,0.15)', borderRadius:'8px', padding:'7px 10px', color:isAiTurn?'rgba(255,255,255,0.2)':'#e8dcc8', fontSize:'12px', fontFamily:'Georgia,serif', outline:'none', marginBottom:'6px', colorScheme:'dark' }}>
                        {PLAYER_ACTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                      </select>
                      <button onClick={doPlayerAction} disabled={isAiTurn}
                        style={{ width:'100%', padding:'8px', background:isAiTurn?'rgba(201,169,110,0.05)':'rgba(201,169,110,0.12)', border:'1px solid rgba(201,169,110,0.25)', borderRadius:'10px', color:isAiTurn?'rgba(201,169,110,0.25)':'#c9a96e', fontSize:'12px', cursor:isAiTurn?'default':'pointer', fontFamily:'Georgia,serif' }}>
                        {isAiTurn ? '等他…' : '↩ 执行'}
                      </button>
                    </div>
                  )
                })()}
                {intimatePhase === 'aftercare' && (
                  <>
                    <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.35)', marginBottom: '8px', letterSpacing: '0.12em' }}>
                      {bathAftercare ? '🚿 浴室余温 · 还在' : '🌙 余温 · 还在'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {(bathAftercare ? [
                        { label: '靠着他', prompt: '浴室里事后，她往他身上靠，水雾还没散，他的反应，一句话' },
                        { label: '帮我擦干', prompt: '他帮她把头发擦干，动作轻，余温里说一句' },
                        { label: '亲一下', prompt: '浴室余温里她踮脚亲了他一下，他的反应' },
                        { label: '说说话', prompt: '浴室里，水声停了，两个人靠着，她先开口，他的回应' },
                      ] : [
                        { label: '抱着睡', prompt: '她窝在他怀里，快要睡着，他轻轻说一句，声音低沉温柔' },
                        { label: '黏着他', prompt: '事后她黏着他不放，他假装嫌弃但没动，写他的动作和一句话' },
                        { label: '亲额头', prompt: '他在余温里轻轻亲了她的额头，带点不自知的温柔，写动作和内心一句话' },
                        { label: '说晚安', prompt: '她说晚安，他的回应，余温里的一句话，低沉温柔' },
                      ]).map(a => (
                        <button key={a.label} onClick={() => sendToAI(a.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true)}
                          style={{ padding: '5px 12px', background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.12)', borderRadius: '20px', color: 'rgba(201,169,110,0.6)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
                        >{a.label}</button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {/* 浴室余温可以再来一次（还在浴室里嘛） */}
                      {bathAftercare && (
                        <button onClick={() => {
                          resetIntim()
                          setBathAftercare(false)
                          // bathPhase保持active，可以继续
                          const avail = getAvailPos(true)
                          setSelPos(avail[0]?.id || 'bath_stand')
                          setIntimatePhase('agreed')
                        }} style={{ padding: '5px 12px', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: '20px', color: 'rgba(201,169,110,0.6)', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>还要</button>
                      )}
                      <button onClick={() => { resetIntimFull(); setCandleLit(false) }} style={{ padding: '5px 12px', background: 'none', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', color: 'rgba(255,255,255,0.15)', fontSize: '11px', cursor: 'pointer' }}>
                        {bathAftercare ? '离开浴室' : '结束余温'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 输入框行 */}
            <div style={{
              padding: '6px 14px 18px',
              paddingLeft: sameRoom && !isOutside ? '82px' : '14px',
              display: 'flex', gap: '10px', alignItems: 'center',
              transition: 'padding-left 0.3s',
            }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder='说点什么…'
                style={{
                  flex: 1, background: 'rgba(12,9,6,0.75)',
                  border: '1px solid rgba(201,169,110,0.12)',
                  borderRadius: '22px', padding: '11px 18px', color: '#e8dcc8',
                  fontSize: '14px', outline: 'none', fontFamily: 'Georgia, serif',
                  backdropFilter: 'blur(8px)',isolation: 'isolate'
                }}
              />
              <button onClick={handleSend} disabled={loading} style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: loading ? 'rgba(201,169,110,0.12)' : '#c9a96e',
                border: 'none', color: '#0f0c09', fontSize: '18px',
                cursor: loading ? 'default' : 'pointer', flexShrink: 0,
                transition: 'background 0.2s',
              }}>↑</button>
            </div>
          </div>
        </div>

      </div>

      {/* 敲门弹窗 */}
      {showKnock && (
        <div onClick={() => setShowKnock(false)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',isolation: 'isolate',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'rgba(10,7,4,0.97)',
            border: '1px solid rgba(201,169,110,0.12)',
            borderRadius: '16px', padding: '28px 24px',
            width: '260px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '13px', color: 'rgba(201,169,110,0.5)', letterSpacing: '0.15em', marginBottom: '8px' }}>
              客房
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '24px', lineHeight: 1.6 }}>
              他在里面。
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowKnock(false)} style={{
                flex: 1, background: 'none',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.2)', padding: '10px',
                borderRadius: '8px', cursor: 'pointer', fontSize: '12px',
                fontFamily: 'Georgia, serif',
              }}>算了</button>
              <button onClick={() => {
                setShowKnock(false)
                if (intimacy < 30) {
                  sendToAI(
                    `（我站在客房门外敲了敲门，好感度只有${intimacy}）你不太想让她进来，冷淡应付或找个借口，一句话`,
                    messages, intimacy, playerRoom, luRoom, false, undefined, true
                  )
                } else {
                  setPlayerRoom('guest_room')
                  sendToAI(`（我敲了敲门走进来）你在客房里，说一句`, messages, intimacy, 'guest_room', luRoom, false, undefined, true)
                }
              }} style={{
                flex: 1, background: 'rgba(201,169,110,0.08)',
                border: '1px solid rgba(201,169,110,0.25)',
                color: '#c9a96e', padding: '10px',
                borderRadius: '8px', cursor: 'pointer', fontSize: '12px',
                fontFamily: 'Georgia, serif', letterSpacing: '0.05em',
              }}>敲门</button>
            </div>
          </div>
        </div>
      )}

      {/* 外出弹窗 */}
      {showOutside && (
        <div onClick={() => setShowOutside(false)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',isolation: 'isolate',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: '480px',
            background: 'rgba(10,7,4,0.97)',
            border: '1px solid rgba(201,169,110,0.1)',
            borderRadius: '20px 20px 0 0',
            padding: '20px 20px 36px',
          }}>
            <div style={{ fontSize: '11px', color: 'rgba(201,169,110,0.4)', letterSpacing: '0.2em', marginBottom: '16px', textAlign: 'center' }}>
              去哪里
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {OUTSIDE_PLACES.map(place => (
                <button key={place.id} onClick={() => handleGoOutside(place.id)} style={{
                  background: 'rgba(201,169,110,0.05)',
                  border: '1px solid rgba(201,169,110,0.1)',
                  borderRadius: '12px', padding: '14px 8px',
                  cursor: 'pointer', color: '#e8dcc8',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                }}>
                  <span style={{ fontSize: '15px' }}>{place.name}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)' }}>{place.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 自定义恶作剧弹窗 */}
      {showAddPrank && (
        <div onClick={() => setShowAddPrank(false)} style={{
          position: 'fixed', inset: 0, zIndex: 250,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',isolation: 'isolate',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: '480px',
            background: 'rgba(10,7,4,0.97)', border: '1px solid rgba(201,169,110,0.12)',
            borderRadius: '20px 20px 0 0', padding: '20px 20px 40px',
          }}>
            <div style={{ fontSize: '12px', color: 'rgba(201,169,110,0.5)', letterSpacing: '0.15em', marginBottom: '14px' }}>自定义恶作剧</div>
            <input
              value={newPrankText}
              onChange={e => setNewPrankText(e.target.value)}
              placeholder='描述你想整他的方式，比如：突然趴到他背上'
              style={{
                width: '100%', padding: '11px 14px', marginBottom: '12px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.15)',
                borderRadius: '12px', color: '#e8dcc8', fontSize: '13px',
                outline: 'none', fontFamily: 'Georgia, serif',
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddPrank(false)} style={{
                flex: 1, padding: '12px', background: 'none',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px',
                color: 'rgba(255,255,255,0.2)', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif',
              }}>取消</button>
              <button onClick={() => {
                if (!newPrankText.trim()) return
                const label = newPrankText.trim().slice(0, 10)
                const prompt = `她${newPrankText.trim()}，他的反应，一句话`
                setCustomPranks(prev => [...prev, { label, prompt }])
                setNewPrankText('')
                setShowAddPrank(false)
              }} style={{
                flex: 2, padding: '12px',
                background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.25)',
                borderRadius: '12px', color: '#c9a96e', fontSize: '13px',
                cursor: 'pointer', fontFamily: 'Georgia, serif', letterSpacing: '0.08em',
              }}>加进去</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ 冰箱弹窗（查看食材 / 选菜谱） ══ */}
      {showFridge && (() => {
        const RECIPES = [
          { name: '番茄炒蛋', need: { '番茄': 2, '鸡蛋': 2 }, prompt: '她做了番茄炒蛋，端上来，你尝了一口，说一句' },
          { name: '葱油面',   need: { '面条': 1, '大蒜': 1 }, prompt: '她煮了碗葱油面，香气飘过来，你说一句' },
          { name: '豆腐汤',   need: { '豆腐': 1, '青菜': 1 }, prompt: '她煮了豆腐汤，盛了两碗，你接过那碗，说一句' },
          { name: '猪肉炒青菜', need: { '猪肉': 1, '青菜': 1 }, prompt: '她炒了道荤菜，你站在旁边看了会儿，说一句' },
          { name: '奶酪煎蛋', need: { '鸡蛋': 2, '奶酪': 1 }, prompt: '她用奶酪煎了个鸡蛋，有点洋气，你挑眉说一句' },
        ]
        const isCook = showFridge === 'cook'
        const canMake = (recipe) => Object.entries(recipe.need).every(([k, v]) => (fridge[k] || 0) >= v)
        return (
          <div onClick={() => setShowFridge(false)} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', isolation: 'isolate',display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', background: 'rgba(10,7,4,0.97)', border: '1px solid rgba(201,169,110,0.12)', borderRadius: '20px 20px 0 0', padding: '20px 20px 44px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ fontSize: '11px', color: 'rgba(201,169,110,0.4)', letterSpacing: '0.2em', marginBottom: '14px' }}>{isCook ? '一起做饭 · 选菜谱' : '冰箱 · 食材'}</div>
              {!isCook ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px' }}>
                  {Object.entries(fridge).map(([name, qty]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: qty > 0 ? 'rgba(201,169,110,0.06)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,169,110,0.1)', borderRadius: '10px' }}>
                      <span style={{ fontSize: '13px', color: qty > 0 ? '#e8dcc8' : 'rgba(255,255,255,0.2)' }}>{name}</span>
                      <span style={{ fontSize: '13px', color: qty > 0 ? 'rgba(201,169,110,0.7)' : 'rgba(255,255,255,0.15)' }}>×{qty}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {RECIPES.map(r => {
                    const ok = canMake(r)
                    return (
                      <button key={r.name} disabled={!ok} onClick={() => {
                        setFridge(prev => {
                          const next = { ...prev }
                          Object.entries(r.need).forEach(([k, v]) => { next[k] = Math.max(0, (next[k] || 0) - v) })
                          return next
                        })
                        setShowFridge(false)
                        sendToAI(r.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                      }} style={{ padding: '12px 14px', background: ok ? 'rgba(201,169,110,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${ok ? 'rgba(201,169,110,0.25)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', cursor: ok ? 'pointer' : 'default', textAlign: 'left', fontFamily: 'Georgia,serif' }}>
                        <div style={{ fontSize: '14px', color: ok ? '#e8dcc8' : 'rgba(255,255,255,0.2)', marginBottom: '4px' }}>{r.name}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
                          {Object.entries(r.need).map(([k, v]) => `${k}×${v}`).join('  ')}
                          {!ok && <span style={{ color: 'rgba(255,100,100,0.4)', marginLeft: '6px' }}>食材不足</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ══ 看书弹窗 ══ */}
      {showBooks && (
        <div onClick={() => { setShowBooks(false); setShowAddBook(false) }} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', isolation: 'isolate',display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', background: 'rgba(10,7,4,0.97)', border: '1px solid rgba(201,169,110,0.12)', borderRadius: '20px 20px 0 0', padding: '20px 20px 44px', maxHeight: '75vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(201,169,110,0.4)', letterSpacing: '0.2em' }}>书架</div>
              <button onClick={() => setShowAddBook(!showAddBook)} style={{ fontSize: '11px', background: 'none', border: '1px solid rgba(201,169,110,0.2)', color: 'rgba(201,169,110,0.5)', padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'Georgia,serif' }}>+ 添加</button>
            </div>
            {showAddBook && (
              <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                <input value={newBookTitle} onChange={e => setNewBookTitle(e.target.value)} placeholder='书名（作者可选）' style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '10px', padding: '8px 12px', color: '#e8dcc8', fontSize: '12px', outline: 'none', fontFamily: 'Georgia,serif' }} />
                <button onClick={() => {
                  if (!newBookTitle.trim()) return
                  const parts = newBookTitle.split(' ')
                  setBookList(prev => [...prev, { title: parts[0], author: parts[1] || '' }])
                  setNewBookTitle('')
                  setShowAddBook(false)
                }} style={{ padding: '8px 14px', background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.25)', borderRadius: '10px', color: '#c9a96e', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia,serif' }}>加入</button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {bookList.map((b, i) => (
                <button key={i} onClick={() => {
                  setShowBooks(false)
                  sendToAI(`她拿起《${b.title}》看了起来${b.author ? `（${b.author}写的）` : ''}，你注意到了，发表一句评价或问她看到哪里了`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                }} style={{ padding: '10px 14px', background: 'rgba(201,169,110,0.05)', border: '1px solid rgba(201,169,110,0.1)', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'Georgia,serif' }}>
                  <span style={{ fontSize: '14px', color: '#e8dcc8' }}>《{b.title}》</span>
                  {b.author && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginLeft: '8px' }}>{b.author}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ 日记弹窗 ══ */}
      {showDiary && (
        <div onClick={() => { setShowDiary(false); setViewingDiary(null) }} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',isolation: 'isolate', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', background: 'rgba(10,7,4,0.97)', border: '1px solid rgba(201,169,110,0.12)', borderRadius: '20px 20px 0 0', padding: '20px 20px 44px', maxHeight: '75vh', overflowY: 'auto' }}>
            {viewingDiary !== null ? (
              <>
                <button onClick={() => setViewingDiary(null)} style={{ fontSize: '11px', background: 'none', border: 'none', color: 'rgba(201,169,110,0.4)', cursor: 'pointer', marginBottom: '12px', fontFamily: 'Georgia,serif' }}>← 返回</button>
                <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.3)', marginBottom: '10px' }}>{diaryList[viewingDiary]?.date}</div>
                <div style={{ fontSize: '14px', color: '#e8dcc8', lineHeight: 1.9, fontStyle: 'italic' }}>{diaryList[viewingDiary]?.content}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '11px', color: 'rgba(201,169,110,0.4)', letterSpacing: '0.2em', marginBottom: '14px' }}>
                  他的日记 · {diaryList.length > 0 ? `共${diaryList.length}篇` : '无记录'}
                </div>
                {diaryList.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.15)', textAlign: 'center', padding: '20px 0' }}>他还没写过</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {diaryList.map((d, i) => (
                      <button key={i} onClick={() => setViewingDiary(i)} style={{ padding: '10px 14px', background: 'rgba(201,169,110,0.05)', border: '1px solid rgba(201,169,110,0.1)', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'Georgia,serif' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(201,169,110,0.4)', marginRight: '10px' }}>{d.date}</span>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>{d.content.slice(0, 20)}…</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
{/* ══ 日历弹窗 ══ */}
        {showCalendar && (() => {
    const gd = gameDay > 0 ? gameDate(gameDay) : { y: new Date().getFullYear(), m: new Date().getMonth()+1, d: new Date().getDate() }
    const calData = getCalendarData(calYear, calMonth, periodDays, gd)
    const predicted = predictNextPeriod(periodDays)
    const calNavBtn = { background: 'none', border: '1px solid rgba(201,169,110,0.15)', color: 'rgba(201,169,110,0.5)', padding: '4px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: 'Georgia, serif' }
    return (
      <div onClick={() => setShowCalendar(false)} style={{
        position: 'fixed', inset: 0, zIndex: 250,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          width: '100%', maxWidth: '480px',
          background: 'rgba(10,7,4,0.97)',
          border: '1px solid rgba(201,169,110,0.12)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px 44px',
        }}>
          <div style={{ fontSize: '11px', color: 'rgba(201,169,110,0.4)', letterSpacing: '0.2em', marginBottom: '14px' }}>
            🩸 生理期日历
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <button onClick={() => {
              if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1) }
              else setCalMonth(calMonth - 1)
            }} style={calNavBtn}>◀</button>
            <span style={{ fontSize: '13px', color: '#c9a96e' }}>{calYear}年{calMonth}月</span>
            <button onClick={() => {
              if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1) }
              else setCalMonth(calMonth + 1)
            }} style={calNavBtn}>▶</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
            {['日','一','二','三','四','五','六'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(201,169,110,0.3)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {calData.days.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} />
              return (
                <button key={d.day} onClick={() => handleTogglePeriod(calYear, calMonth, d.day)} style={{
                  padding: '8px 0', textAlign: 'center', fontSize: '12px',
                  background: d.isMarked ? 'rgba(255,100,120,0.15)' : d.isPredicted ? 'rgba(255,150,180,0.08)' : 'rgba(255,255,255,0.02)',
                  border: d.isToday ? '1px solid rgba(100,160,255,0.5)' : d.isSensitive ? '1px solid rgba(255,180,60,0.25)' : '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '8px', cursor: 'pointer',
                  color: d.isMarked ? '#ff8090' : d.isToday ? '#80b0ff' : 'rgba(255,255,255,0.4)',
                  fontFamily: 'Georgia, serif',
                }}>
                  {d.isMarked ? '🩸' : d.day}
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: '12px', fontSize: '10px', color: 'rgba(201,169,110,0.4)', lineHeight: 1.8 }}>
            <div>已记录 {periodDays.length} 天 · 点日期标记/取消</div>
            {predicted && <div>预计下次：{predicted.m}月{predicted.d}日</div>}
            <div style={{ marginTop: '4px', display: 'flex', gap: '12px' }}>
              <span>🩸 = 已标记</span>
              <span style={{ color: 'rgba(100,160,255,0.5)' }}>蓝框 = 今天</span>
              <span style={{ color: 'rgba(255,180,60,0.5)' }}>橙框 = 敏感期</span>
            </div>
          </div>
        </div>
      </div>
    )
  })()}

  {/* 衣帽间弹窗 */}
{showWardrobe && (
  <div onClick={() => setShowWardrobe(false)} style={{
    position: 'fixed', inset: 0, zIndex: 250,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: '100%', maxWidth: '480px',
      background: 'rgba(10,7,4,0.97)',
      border: '1px solid rgba(201,169,110,0.12)',
      borderRadius: '20px 20px 0 0',
      padding: '20px 20px 44px', maxHeight: '70vh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '13px', color: '#c9a96e', letterSpacing: '0.1em' }}>衣帽间</div>
        <button onClick={() => setShowWardrobe(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.35)', marginBottom: '14px' }}>
        当前：{ALL_OUTFITS.find(o => o.id === currentOutfit)?.name || '白衬衫'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {getOwnedOutfits(wardrobe).map(o => (
          <button key={o.id} onClick={() => {
            setCurrentOutfit(o.id)
            setShowWardrobe(false)
            sendToAI(`她让他换上了${o.name}，${o.desc}，他换好后的反应，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
            saveToDb(messages, intimacy, playerRoom, luRoom)
          }} style={{
            padding: '12px 14px', textAlign: 'left',
            background: currentOutfit === o.id ? 'rgba(201,169,110,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${currentOutfit === o.id ? 'rgba(201,169,110,0.3)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: '12px', cursor: 'pointer',
            color: currentOutfit === o.id ? '#c9a96e' : 'rgba(255,255,255,0.5)',
            fontFamily: 'Georgia, serif',
          }}>
            <div style={{ fontSize: '13px', marginBottom: '3px' }}>{o.name}</div>
            <div style={{ fontSize: '10px', opacity: 0.5 }}>{o.desc}</div>
          </button>
        ))}
      </div>
    </div>
  </div>
)}
{/* 床头柜弹窗 */}
{showBedside && (
  <div onClick={() => setShowBedside(false)} style={{
    position: 'fixed', inset: 0, zIndex: 250,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: '100%', maxWidth: '480px',
      background: 'rgba(10,7,4,0.97)',
      border: '1px solid rgba(201,169,110,0.12)',
      borderRadius: '20px 20px 0 0',
      padding: '20px 20px 44px', maxHeight: '70vh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '13px', color: '#c9a96e', letterSpacing: '0.1em' }}>床头柜</div>
        <button onClick={() => setShowBedside(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
      </div>

      {bedsideItems.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'rgba(201,169,110,0.3)', textAlign: 'center', padding: '20px 0' }}>
          空空如也…去商场逛逛？
        </div>
      ) : (
        <>
          <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.3)', marginBottom: '10px' }}>
            {intimatePhase !== 'idle' ? '选一件使用' : '氛围道具可随时使用，情趣道具在亲密时使用'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {getOwnedBedsideItems(bedsideItems).map(item => {
              const isIntimate = item.category === 'intimate'
              const canUse = !isIntimate || (intimatePhase !== 'idle')
              return (
                <button key={item.id} onClick={() => {
                  if (!canUse) { setToast('亲密时才能使用'); return }
                  setShowBedside(false)
                  if (item.category === 'ambiance') {
                    const boost = parseInt(item.effect?.replace('romantic+','') || '10')
                    setRomantic(n => Math.min(100, n + boost))
                    sendToAI(`她拿出了${item.name}（${item.desc}），营造氛围，你的反应`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                  } else if (item.hint) {
                    sendToAI(item.hint, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                  }
                  if (item.consumable) {
                    setBedsideItems(prev => prev.filter(id => id !== item.id))
                  }
                  saveToDb(messages, intimacy, playerRoom, luRoom)
                }} style={{
                  padding: '12px 14px', textAlign: 'left',
                  background: isIntimate ? 'rgba(180,100,120,0.06)' : 'rgba(201,169,110,0.04)',
                  border: `1px solid ${isIntimate ? 'rgba(180,100,120,0.15)' : 'rgba(201,169,110,0.1)'}`,
                  borderRadius: '12px', cursor: canUse ? 'pointer' : 'default',
                  opacity: canUse ? 1 : 0.4,
                  color: 'rgba(255,255,255,0.5)', fontFamily: 'Georgia, serif',
                }}>
                  <div style={{ fontSize: '13px', marginBottom: '3px', color: isIntimate ? 'rgba(200,130,150,0.8)' : 'rgba(201,169,110,0.7)' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.5 }}>{item.desc}</div>
                  {item.consumable && <div style={{ fontSize: '9px', color: 'rgba(255,180,60,0.4)', marginTop: '2px' }}>· 消耗品</div>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  </div>
)}
{/* 商场弹窗 */}
{showShop && (() => {
  const shopItems = getShopItems(wardrobe, bedsideItems, intimacy)
  console.log('shopItems:', shopItems, 'wardrobe:', wardrobe, 'intimacy:', intimacy)
  const currentItems = 
    shopTab === 'his' ? shopItems.hisClothes :
    shopTab === 'her' ? shopItems.herClothes :
    shopTab === 'toys' ? shopItems.toys :
    shopItems.gifts
  
  return (
    <div onClick={() => setShowShop(false)} style={{
      position: 'fixed', inset: 0, zIndex: 250,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '480px',
        background: 'rgba(10,7,4,0.97)',
        border: '1px solid rgba(201,169,110,0.12)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 44px', maxHeight: '70vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', color: '#c9a96e', letterSpacing: '0.1em' }}>🛍️ 商场</div>
          <div style={{ fontSize: '14px', color: '#ffd966' }}>💰 {coins}</div>
        </div>

        {/* Tab栏 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(201,169,110,0.1)', paddingBottom: '10px' }}>
          {SHOP_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setShopTab(cat.id)} style={{
              background: 'none', border: 'none',
              padding: '6px 12px', borderRadius: '20px',
              color: shopTab === cat.id ? '#c9a96e' : 'rgba(255,255,255,0.3)',
              fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif',
              borderBottom: shopTab === cat.id ? '1px solid #c9a96e' : 'none',
            }}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* 商品列表 */}
        {currentItems.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'rgba(201,169,110,0.3)', textAlign: 'center', padding: '40px 0' }}>
            暂无商品可购买
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentItems.map(item => {
              const isGift = item.shopType === 'gift'
              const isHerClothes = item.owner === 'her'
              const canAfford = coins >= item.price
              return (
                <button key={item.id} onClick={() => {
                  if (!canAfford) { setToast('金币不足'); return }
                  setCoins(prev => prev - item.price)
                  
                  if (isGift) {
                    // 礼物：加好感度
                    const newIntimacy = Math.min(100, intimacy + (item.intimacyBoost || 0))
                    setIntimacy(newIntimacy)
                    sendToAI(`她送了他${item.name}（${item.desc}），他的反应，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                  } else if (item.shopType === 'wardrobe') {
                    // 衣物：加入衣帽间
                    setWardrobe(prev => [...prev, item.id])
                    if (isHerClothes) {
                      sendToAI(`她买了一件${item.name}，${item.desc}，他的反应，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                    } else {
                      sendToAI(`她买了一件${item.name}（${item.desc}）给他，他还没有换上，一句话评价`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                    }
                  } else if (item.shopType === 'bedside') {
                    // 道具：加入床头柜
                    setBedsideItems(prev => [...prev, item.id])
                    sendToAI(`她买了${item.name}（${item.desc}），放进床头柜，他的反应，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                  }
                  
                  saveToDb(messages, intimacy, playerRoom, luRoom)
                  setToast(`购买了 ${item.name}`)
                }} style={{
                  padding: '12px 14px', textAlign: 'left',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(201,169,110,0.08)',
                  borderRadius: '12px', cursor: canAfford ? 'pointer' : 'default',
                  opacity: canAfford ? 1 : 0.5,
                  fontFamily: 'Georgia, serif',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', marginBottom: '3px', color: 'rgba(201,169,110,0.8)' }}>{item.name}</div>
                      <div style={{ fontSize: '10px', opacity: 0.5 }}>{item.desc}</div>
                      {item.category && <div style={{ fontSize: '9px', color: 'rgba(201,169,110,0.3)', marginTop: '2px' }}>
                        {item.category === 'daily' ? '常服' : item.category === 'formal' ? '正装' : item.category === 'home' ? '居家' : item.category === 'intimate' ? '💕 情趣' : ''}
                      </div>}
                    </div>
                    <div style={{ fontSize: '14px', color: '#ffd966' }}>💰{item.price}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})()}

{/* 超市弹窗 */}
{showSupermarket && (() => {
  const categories = [
    { id: 'staple', label: '🍚 主食', items: SUPERMARKET_ITEMS.filter(i => i.category === 'staple') },
    { id: 'meat', label: '🥩 肉类', items: SUPERMARKET_ITEMS.filter(i => i.category === 'meat') },
    { id: 'veggie', label: '🥬 蔬菜', items: SUPERMARKET_ITEMS.filter(i => i.category === 'veggie') },
    { id: 'snack', label: '🍫 零食', items: SUPERMARKET_ITEMS.filter(i => i.category === 'snack') },
    { id: 'pet', label: '🐾 宠物', items: SUPERMARKET_ITEMS.filter(i => i.category === 'pet') },
    { id: 'life', label: '🩹 生活', items: SUPERMARKET_ITEMS.filter(i => i.category === 'life') },
  ]
  const currentCat = categories.find(c => c.id === superTab)
  
  const getCartQty = (id) => cart.find(c => c.id === id)?.qty || 0
  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id)
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
    } else {
      setCart([...cart, { id: item.id, name: item.name, price: item.price, qty: 1 }])
    }
  }
  const removeFromCart = (id) => {
    const existing = cart.find(c => c.id === id)
    if (existing.qty === 1) {
      setCart(cart.filter(c => c.id !== id))
    } else {
      setCart(cart.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c))
    }
  }
  const totalPrice = cart.reduce((sum, c) => sum + c.price * c.qty, 0)
  
  const handleCheckout = () => {
    if (totalPrice > coins) { setToast('金币不足'); return }
    setCoins(prev => prev - totalPrice)
    // 更新冰箱
    setFridge(prev => {
      const next = { ...prev }
      cart.forEach(c => {
        const item = SUPERMARKET_ITEMS.find(i => i.id === c.id)
        if (item) {
          const fridgeKey = {
            rice: '米', noodle: '面条', egg: '鸡蛋', milk: '牛奶',
            chicken: '鸡肉', pork: '猪肉', fish: '鱼', shrimp: '虾',
            tomato: '番茄', lettuce: '青菜', potato: '土豆', mushroom: '蘑菇',
            soy: '酱油', butter: '黄油', choco: '巧克力', cake: '蛋糕',
            catfood: '猫粮', dogfood: '狗粮', pads: '卫生巾',
          }[item.id] || item.name
          next[fridgeKey] = (next[fridgeKey] || 0) + c.qty
        }
      })
      return next
    })
    setCart([])
    setShowSupermarket(false)
    setToast('采购完成！')
    sendToAI('她去超市采购回来，说一句', messages, intimacy, playerRoom, luRoom, false, undefined, true)
    saveToDb(messages, intimacy, playerRoom, luRoom)
  }
  
  return (
    <div onClick={() => setShowSupermarket(false)} style={{
      position: 'fixed', inset: 0, zIndex: 250,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '480px',
        background: 'rgba(10,7,4,0.97)',
        border: '1px solid rgba(201,169,110,0.12)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 44px', maxHeight: '75vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', color: '#c9a96e', letterSpacing: '0.1em' }}>🛒 超市</div>
          <div style={{ fontSize: '14px', color: '#ffd966' }}>💰 {coins}</div>
        </div>

        {/* 分类Tab */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSuperTab(cat.id)} style={{
              background: 'none', border: 'none',
              padding: '5px 12px', borderRadius: '20px', whiteSpace: 'nowrap',
              color: superTab === cat.id ? '#c9a96e' : 'rgba(255,255,255,0.3)',
              fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif',
            }}>
              {cat.label}
            </button>
          ))}
        </div>

        {/* 商品列表 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {currentCat?.items.map(item => {
            const qty = getCartQty(item.id)
            return (
              <div key={item.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(201,169,110,0.08)',
                borderRadius: '12px',
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'rgba(201,169,110,0.8)' }}>{item.emoji} {item.name}</div>
                  <div style={{ fontSize: '10px', color: '#ffd966' }}>💰{item.price}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {qty > 0 && <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '18px', cursor: 'pointer' }}>-</button>}
                  {qty > 0 && <span style={{ fontSize: '14px', color: '#c9a96e' }}>{qty}</span>}
                  <button onClick={() => addToCart(item)} style={{ background: 'none', border: 'none', color: '#c9a96e', fontSize: '18px', cursor: 'pointer' }}>+</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 购物车 */}
        {cart.length > 0 && (
          <div style={{
            borderTop: '1px solid rgba(201,169,110,0.1)',
            paddingTop: '12px', marginTop: '4px',
          }}>
            <div style={{ fontSize: '11px', color: 'rgba(201,169,110,0.4)', marginBottom: '8px' }}>购物车</div>
            {cart.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                <span>{c.name} x{c.qty}</span>
                <span>💰{c.price * c.qty}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '12px', color: '#c9a96e' }}>总计: 💰{totalPrice}</span>
              <button onClick={handleCheckout} style={{
                padding: '6px 20px', background: 'rgba(201,169,110,0.15)',
                border: '1px solid rgba(201,169,110,0.3)', borderRadius: '20px',
                color: '#c9a96e', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif',
              }}>结算</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})()}

{/* 宠物面板 */}
{showPetPanel && (
  <div onClick={() => { setShowPetPanel(false); setShowAdopt(false) }} style={{
    position: 'fixed', inset: 0, zIndex: 250,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: '100%', maxWidth: '480px',
      background: 'rgba(10,7,4,0.97)',
      border: '1px solid rgba(201,169,110,0.12)',
      borderRadius: '20px 20px 0 0',
      padding: '20px 20px 44px',
    }}>
      {!pet ? (
        // 领养界面
        <>
          <div style={{ fontSize: '13px', color: '#c9a96e', marginBottom: '14px', textAlign: 'center' }}>🐾 领养宠物</div>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '20px' }}>
            {PETS.map(p => (
              <button key={p.id} onClick={() => setAdoptingType(p.id)} style={{
                background: 'rgba(201,169,110,0.08)',
                border: adoptingType === p.id ? '1px solid #c9a96e' : '1px solid rgba(201,169,110,0.2)',
                borderRadius: '16px', padding: '16px', cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ fontSize: '48px' }}>{p.emoji}</div>
                <div style={{ fontSize: '14px', color: '#c9a96e', marginTop: '8px' }}>{p.name}</div>
              </button>
            ))}
          </div>
          {adoptingType && (
            <>
              <input
                value={petNameInput}
                onChange={e => setPetNameInput(e.target.value)}
                placeholder="给宠物起个名字"
                style={{
                  width: '100%', padding: '10px 14px', marginBottom: '12px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,169,110,0.15)',
                  borderRadius: '12px', color: '#e8dcc8', fontSize: '13px', outline: 'none',
                  fontFamily: 'Georgia, serif',
                }}
              />
              <button onClick={() => {
                const newPet = createPet(adoptingType, petNameInput || (adoptingType === 'cat' ? '咪咪' : '旺财'))
                setPet(newPet)
                setShowPetPanel(false)
                setAdoptingType(null)
                setPetNameInput('')
                sendToAI(`她带回了一只${newPet.name}，你的反应，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                saveToDb(messages, intimacy, playerRoom, luRoom)
              }} style={{
                width: '100%', padding: '12px',
                background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.25)',
                borderRadius: '12px', color: '#c9a96e', fontSize: '13px', cursor: 'pointer',
                fontFamily: 'Georgia, serif',
              }}>确认领养</button>
            </>
          )}
        </>
      ) : (
        // 宠物管理界面
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '24px' }}>{PETS.find(p => p.id === pet.typeId)?.emoji}</div>
            <div style={{ fontSize: '16px', color: '#c9a96e' }}>{pet.name}</div>
            <button onClick={() => setShowPetPanel(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.4)', marginBottom: '4px' }}>饥饿</div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pet.hunger}%`, background: pet.hunger < 30 ? '#e08030' : '#c9a96e', borderRadius: '4px' }} />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.4)', marginBottom: '4px' }}>清洁</div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pet.clean}%`, background: pet.clean < 30 ? '#e08030' : '#c9a96e', borderRadius: '4px' }} />
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.4)', marginBottom: '4px' }}>心情</div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pet.mood}%`, background: pet.mood < 30 ? '#e08030' : '#c9a96e', borderRadius: '4px' }} />
            </div>
          </div>

          {pet.sick && <div style={{ fontSize: '11px', color: '#e08030', marginBottom: '12px', textAlign: 'center' }}>🤒 它生病了，需要照顾！</div>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => {
              const foodId = pet.typeId === 'cat' ? 'catfood' : 'dogfood'
              const foodName = pet.typeId === 'cat' ? '猫粮' : '狗粮'
              if ((fridge[foodName] || 0) <= 0) { setToast(`${foodName}不足`); return }
              setFridge(prev => ({ ...prev, [foodName]: Math.max(0, (prev[foodName] || 0) - 1) }))
              setPet(feedPet(pet))
              setToast(`喂了${pet.name}`)
              saveToDb(messages, intimacy, playerRoom, luRoom)
            }} style={{ padding: '6px 14px', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'rgba(201,169,110,0.7)', fontSize: '12px', cursor: 'pointer' }}>
              🍖 喂食
            </button>
            <button onClick={() => {
              setPet(bathePet(pet))
              setToast(`给${pet.name}洗了澡`)
              saveToDb(messages, intimacy, playerRoom, luRoom)
            }} style={{ padding: '6px 14px', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'rgba(201,169,110,0.7)', fontSize: '12px', cursor: 'pointer' }}>
              🧼 洗澡
            </button>
            <button onClick={() => {
              setPet(strokePet(pet))
              setToast(`撸了${pet.name}`)
              sendToAI(`她摸了摸${pet.name}，你的反应，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
              saveToDb(messages, intimacy, playerRoom, luRoom)
            }} style={{ padding: '6px 14px', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'rgba(201,169,110,0.7)', fontSize: '12px', cursor: 'pointer' }}>
              🫳 撸它
            </button>
            <button onClick={() => {
              sendToAI(`她叫${pet.name}过来，他的反应`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
            }} style={{ padding: '6px 14px', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'rgba(201,169,110,0.7)', fontSize: '12px', cursor: 'pointer' }}>
              🗣️ 叫他过来
            </button>
          </div>

          <button onClick={() => {
            setPet(null)
            setShowPetPanel(false)
            sendToAI('她决定把宠物送走，他的反应，一句话', messages, intimacy, playerRoom, luRoom, false, undefined, true)
            saveToDb(messages, intimacy, playerRoom, luRoom)
          }} style={{
            width: '100%', padding: '10px', marginTop: '8px',
            background: 'none', border: '1px solid rgba(255,100,100,0.2)',
            borderRadius: '10px', color: 'rgba(255,100,100,0.5)', fontSize: '12px', cursor: 'pointer',
            fontFamily: 'Georgia, serif',
          }}>送走</button>
        </>
      )}
    </div>
  </div>
)}
      <SettingsPanel show={showSettings} onClose={() => setShowSettings(false)} />
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '90px', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(12,8,4,0.94)', border: '1px solid rgba(201,169,110,0.15)',
          color: 'rgba(201,169,110,0.7)', fontSize: '11px', padding: '8px 20px',
          borderRadius: '20px', letterSpacing: '0.1em', zIndex: 300,
          whiteSpace: 'nowrap', backdropFilter: 'blur(8px)', isolation: 'isolate'
        }}>{toast}</div>
      )}

    </div>
      </div>
    </>
  )
}
