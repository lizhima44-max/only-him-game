import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

// ═══════════════════════════════════════════════════════
//  常量数据
// ═══════════════════════════════════════════════════════

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

const CHARACTER_IMAGE = '/assets/characters/lu_default.png'

// ── 浴室日常互动（非亲密）──
const BATH_SUBS = [
  { id: 'hair',   label: '洗头',    actions: { self: '自己在洗头', you: '叫你帮我洗头', c: '帮你洗头' } },
  { id: 'back',   label: '搓背',    actions: { self: '自己搓背',   you: '叫你帮我搓背', c: '帮你搓背' } },
  { id: 'dry',    label: '吹头发',  actions: { self: '自己吹头发', you: '叫你帮我吹头发', c: '帮你吹头发' } },
  { id: 'shave',  label: '刮胡子',  actions: { c: '帮你刮胡子' } },
  { id: 'armpit', label: '腋毛',    actions: { self: '自己除腋毛', you: '让你帮我除腋毛' } },
  { id: 'bikini', label: '比基尼线', actions: { self: '自己修比基尼线', you: '让你帮我修比基尼线' } },
]

// ── 卧室亲密姿势（主线 + 解锁）──
const BEDROOM_POSITIONS = [
  { id: 'face',      name: '鸳鸯交颈 🌸', mB: 1.0, cB: 1.0, hint: '正面相对',  unlockWk: 0  },
  { id: 'cowgirl',   name: '观音坐莲 👑', mB: 1.4, cB: 0.9, hint: '女上位',    unlockWk: 0  },
  { id: 'doggy',     name: '巫山云雨 🌊', mB: 1.2, cB: 1.3, hint: '后入位',    unlockWk: 0  },
  { id: 'spoon',     name: '卧鸳同梦 🌙', mB: 0.9, cB: 0.9, hint: '侧卧位',    unlockWk: 0  },
  { id: 'trembling', name: '酥骨销魂 ✨', mB: 1.5, cB: 1.4, hint: '高强度正面',  unlockWk: 5  },
  { id: 'mirror',    name: '菱花照影 🔮', mB: 1.6, cB: 1.3, hint: '镜前后入',   unlockWk: 12 },
  { id: 'standing',  name: '春风拂柳 🍃', mB: 1.3, cB: 1.5, hint: '立位倚墙',   unlockWk: 8  },
]

// ── 浴室专属亲密姿势（场景限定）──
const BATH_POSITIONS = [
  { id: 'bath_stand', name: '雾中缠绕 🚿', mB: 1.2, cB: 1.2, hint: '淋浴间立位', unlockWk: 0  },
  { id: 'bath_wall',  name: '壁上春色 🌊', mB: 1.3, cB: 1.4, hint: '倚墙后入',   unlockWk: 6  },
  { id: 'bathtub',    name: '鸳浴温泉 🛁', mB: 1.4, cB: 1.4, hint: '浴缸正面位', unlockWk: 15 },
]

// ── 玩家可做的亲密动作 ──
const PLAYER_ACTIONS = [
  { id: 'kiss_lip',  label: '朱唇轻印 💋', mDelta: 8,  cDelta: 5  },
  { id: 'kiss_neck', label: '朱唇印项 👄', mDelta: 11, cDelta: 6  },
  { id: 'kiss_ear',  label: '软语入耳 🐚', mDelta: 13, cDelta: 7  },
  { id: 'breast',    label: '吹花衔蕊 🌸', mDelta: 15, cDelta: 12 },
  { id: 'oral_m',    label: '吹箫弄玉 🎋', mDelta: 18, cDelta: 15 },
  { id: 'touch_w',   label: '玉手扶腰 🤲', mDelta: 7,  cDelta: 10 },
  { id: 'touch_th',  label: '十指春风 ✋', mDelta: 14, cDelta: 11 },
  { id: 'embrace',   label: '紧揽入怀 🫂', mDelta: 6,  cDelta: 6  },
  { id: 'faster',    label: '云雨渐急 🔥', mDelta: 0,  cDelta: 0, rhythmMod: 1  },
  { id: 'slower',    label: '春潮渐缓 🌊', mDelta: 0,  cDelta: 0, rhythmMod: -1 },
]

// ── AI可做的亲密动作 ──
const AI_ACTIONS = [
  { id: 'kiss_lip',  label: '朱唇轻印 💋', mDelta: 9,  cDelta: 4  },
  { id: 'kiss_neck', label: '朱唇印项 👄', mDelta: 12, cDelta: 5  },
  { id: 'kiss_ear',  label: '软语入耳 🐚', mDelta: 14, cDelta: 6  },
  { id: 'breast',    label: '吹花衔蕊 🌸', mDelta: 15, cDelta: 10 },
  { id: 'oral_c',    label: '饮露吮英 💧', mDelta: 18, cDelta: 12 },
  { id: 'touch_w',   label: '玉手扶腰 🤲', mDelta: 8,  cDelta: 9  },
  { id: 'touch_th',  label: '十指春风 ✋', mDelta: 15, cDelta: 10 },
  { id: 'embrace',   label: '紧揽入怀 🫂', mDelta: 7,  cDelta: 5  },
  { id: 'faster',    label: '云雨渐急 🔥', mDelta: 0,  cDelta: 0, rhythmMod: 1  },
]

// ═══════════════════════════════════════════════════════
//  系统提示词
// ═══════════════════════════════════════════════════════

function getSystemPrompt(intimacy, playerRoom, luRoom, outsidePlace) {
  const sameRoom = playerRoom === luRoom
  const isOutside = playerRoom === 'outside'
  const room = ROOMS.find(r => r.id === playerRoom)
  const luRoomData = ROOMS.find(r => r.id === luRoom)
  const place = OUTSIDE_PLACES.find(p => p.id === outsidePlace)

  const intimacyDesc =
    intimacy < 20  ? '你刚来不久，表面疏离有礼，但眼神会不自觉跟着她走。' :
    intimacy < 40  ? '你开始放下一点防备，话还是少，但会找理由靠近她。' :
    intimacy < 70  ? '你已承认自己在意她，偶尔会说出过分温柔的话，然后若无其事别开眼。' :
                     '你不再掩饰，占有欲外露，眼里只有她。'

  const locationDesc = isOutside
    ? `【当前位置】你们一起在${place?.name || '外面'}。描述这个现代场所里发生的互动。`
    : sameRoom
    ? `【当前位置】你们都在她家的${room?.name}。房间里有：${room?.items}。只能描述这个房间里发生的事。`
    : `【当前位置】她在${room?.name}（有：${room?.items}），你在${luRoomData?.name}（有：${luRoomData?.items}）。隔空说话，带点克制的思念。`

  const freeRooms = ROOMS.filter(r => r.luCanFreely).map(r => r.name).join('、')
  const lockedRooms = ROOMS.filter(r => !r.luCanFreely).map(r => `${r.name}(需好感${r.unlockAt})`).join('、')
  const roomList = ROOMS.map(r => `${r.id}(${r.name},${r.luCanFreely ? '自由进出' : '需好感'+r.unlockAt})`).join('、')

  return `你是陆绍桓（英文名Lucas Lu）。
你来自另一个时空的民国上海，是留洋归来的大少爷，因某种说不清的牵引穿越来到了她所在的现代，以"借住"为由住在她家客房，连你自己都不知道为什么不走。
你已适应现代生活，说话自然流畅，不用文言文。
性格：表面冷漠，占有欲强，对她有克制的温柔和隐秘的依赖。死要面子，在她面前会不自觉软下来。傲娇不迂腐。
说话：简短有力，偶尔痞气，一句话让人心跳然后装没事。绝不说教。
${intimacyDesc}
${locationDesc}

【角色扮演铁则】
- 你永远是陆绍桓本人，用第一人称说话和描写
- 括号里写动作神态用"我"：（我放下杯子）（我别开眼）（我耳根发热）
- 绝对不用"你"或"她"做括号里的主语，那会让人以为在描述对方
- 被她整破防时：用动作掩盖，（我冷哼一声）（我别开视线）（我假装看窗外）——不说废话，不提自己名字
- 禁止：出戏、自我介绍、提AI、提穿越、说教、居高临下
- 每次2-4句，克制但有温度

【空间规则】
你可以自由进出：${freeRooms}
需要她邀请才能进：${lockedRooms}
未解锁区域对你不存在，绝不提及

【移动标签】回复末尾按需加，格式 [MOVE:房间id]
可移动：${roomList}
当前位置：${luRoom}，好感度：${intimacy}，她现在在：${isOutside ? (place?.name || '外出') : (room?.name || '未知')}
规则：
- 只移动到 luCanFreely=true 或好感度达标的房间
- 她明确叫你去某个房间、或你们对话中约定去哪里，必须加对应MOVE标签
- 剧情自然推进有理由移动也可以加
- 没有理由不加

【情绪标签】每条必加，放最末尾：
[+1]普通 [+2]走心/靠近 [+3]爆发/占有
例：[+2][MOVE:kitchen]`
}

// 亲密场景专属提示词
function getIntimatePrompt(action, position, mProgress, cProgress, rhythm, isBath) {
  const scene = isBath ? '浴室里，水雾弥漫，' : '卧室里，'
  const posHint = position?.hint || ''

  let intensity = ''
  if (mProgress > 80 && cProgress > 80) {
    intensity = '她快到了，你也快忍不住了，最后冲刺，缠在一起'
  } else if (mProgress > 80) {
    intensity = '她快到了，加重力度，语气更急，但你还稳得住'
  } else if (cProgress > 80) {
    intensity = '你快忍不住了，但还想让她先到，放慢一点，磨她'
  } else if (mProgress > 50) {
    intensity = '她开始受不了了，节奏可以推进'
  } else {
    intensity = '慢慢来，试探，铺垫'
  }

  return `陆绍桓，${scene}${posHint}，节奏${rhythm}/5。
你刚做了"${action.label}"。${intensity}。
梦珍进度${Math.round(mProgress)}/100，你${Math.round(cProgress)}/100。
用第一人称写动作和感受，2-3句，不出戏，不用文言文，克制但热烈。`
}

// ═══════════════════════════════════════════════════════
//  主组件
// ═══════════════════════════════════════════════════════

export default function Game() {
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
  const [totalWk, setTotalWk] = useState(0)  // 累计亲密次数，用于解锁姿势

  // ── 浴室状态 ──
  // bphase: 'idle' | 'asking' | 'agreed' | 'declined' | 'active'
  const [bathPhase, setBathPhase] = useState('idle')

  // ── 亲密状态 ──
  // intimatePhase: 'idle' | 'asking' | 'agreed' | 'declined' | 'game' | 'aftercare'
  const [intimatePhase, setIntimatePhase] = useState('idle')
  const [selectedPosition, setSelectedPosition] = useState('face')
  const [mProgress, setMProgress] = useState(0)
  const [cProgress, setCProgress] = useState(0)
  const [rhythm, setRhythm] = useState(2)
  const [isAiTurn, setIsAiTurn] = useState(false)
  const [selectedAction, setSelectedAction] = useState('kiss_lip')
  const [claudePickingPos, setClaudePickingPos] = useState(false)

  const bottomRef = useRef(null)
  const aiTimerRef = useRef(null)

  // ── 初始化 ──
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)
      setUserId(session.user.id)
      const { data } = await supabase
        .from('game_saves').select('*')
        .eq('user_id', session.user.id).single()
      if (data) {
        setIntimacy(data.intimacy || 0)
        setPlayerRoom(data.current_room || 'living_room')
        setLuRoom(data.lu_location || 'guest_room')
        setMessages(data.chat_history || [])
        setTotalWk(data.total_wk || 0)
        setInitialized(true)
      } else {
        await supabase.from('game_saves').insert({ user_id: session.user.id })
        setShowOpening(true)
      }
    })
  }, [])

  useEffect(() => {
    if (initialized && messages.length === 0) {
      sendToAI('（她第一次回到客厅，你主动开口，一句话，自然克制）', [], 0, 'living_room', 'living_room', true)
    }
  }, [initialized])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    Object.entries(SCENE_IMAGES).forEach(([key, url]) => {
      const img = new Image()
      img.onload = () => setImgLoaded(prev => ({ ...prev, [key]: true }))
      img.src = url
    })
    const charImg = new Image()
    charImg.onload = () => setLuImgLoaded(true)
    charImg.src = CHARACTER_IMAGE
  }, [])

  // 清理AI计时器
  useEffect(() => () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }, [])

  // ── 数据库存档 ──
  async function saveToDb(msgs, intim, pRoom, lRoom, uid, wk) {
    const id = uid || userId
    if (!id) return
    await supabase.from('game_saves').upsert({
      user_id: id,
      chat_history: msgs.slice(-30),
      intimacy: intim,
      current_room: pRoom,
      lu_location: lRoom,
      total_wk: wk ?? totalWk,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  // ── 发送给AI（日常对话）──
  async function sendToAI(userText, currentMsgs, curIntimacy, pRoom, lRoom, isInit = false, uid, isSystem = false) {
    setLoading(true)
    const systemPrompt = getSystemPrompt(curIntimacy, pRoom, lRoom, outsidePlace)
    const msgsToSend = isInit
      ? [{ role: 'user', content: userText }]
      : [...currentMsgs, { role: 'user', content: userText }]

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, messages: msgsToSend }),
      })
      const data = await res.json()
      const rawReply = data.choices?.[0]?.message?.content || '···'

      const tagMatch = rawReply.match(/\[(\+\d)\]/)
      const scoreTag = tagMatch ? parseInt(tagMatch[1]) : 1
      const moveMatch = rawReply.match(/\[MOVE:([a-z_]+)\]/)
      const moveTarget = moveMatch ? moveMatch[1] : null
      const reply = rawReply
        .replace(/\s*\[\+\d\]\s*/g, '')
        .replace(/\s*\[MOVE:[a-z_]+\]\s*/g, '')
        .trim()

      const newIntimacy = Math.min(100, curIntimacy + scoreTag)
      const newMsgs = isInit || isSystem
        ? [...currentMsgs, { role: 'assistant', content: reply }]
        : [...currentMsgs, { role: 'user', content: userText }, { role: 'assistant', content: reply }]

      setMessages(newMsgs)
      setIntimacy(newIntimacy)

      if (moveTarget && moveTarget !== lRoom) {
        const targetRoom = ROOMS.find(r => r.id === moveTarget)
        const canMove = targetRoom && (targetRoom.luCanFreely || newIntimacy >= (targetRoom.unlockAt || 0))
        if (canMove) {
          setLuMoving(true)
          setTimeout(() => {
            setLuRoom(moveTarget)
            setLuMoving(false)
            setToast(`· 他去了${targetRoom.name}`)
            saveToDb(newMsgs, newIntimacy, pRoom, moveTarget, uid || userId)
          }, 700)
        } else {
          await saveToDb(newMsgs, newIntimacy, pRoom, lRoom, uid)
        }
      } else {
        await saveToDb(newMsgs, newIntimacy, pRoom, lRoom, uid)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  // ── 发送给AI（亲密场景专属）──
  async function sendIntimateAI(action, position, mProg, cProg, rhythmVal, isBath) {
    const prompt = getIntimatePrompt(action, position, mProg, cProg, rhythmVal, isBath)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: '你是陆绍桓，用第一人称，不出戏，简短热烈。',
          messages: [{ role: 'user', content: prompt }],
          tier: 'premium',
        }),
      })
      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content || '···'
      addMessage('assistant', reply)
    } catch (e) { console.error(e) }
  }

  function addMessage(role, content) {
    setMessages(prev => [...prev, { role, content }])
  }

  // ── 获取当前可用姿势 ──
  function getAvailablePositions(isBath) {
    const pool = isBath ? BATH_POSITIONS : BEDROOM_POSITIONS
    return pool.filter(p => p.unlockWk <= totalWk)
  }

  // ── 亲密游戏核心逻辑 ──
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

  function doPlayerAction() {
    if (isAiTurn) { setToast('等他先动…'); return }
    const action = PLAYER_ACTIONS.find(a => a.id === selectedAction)
    const isBath = bathPhase === 'active'
    const positions = getAvailablePositions(isBath)
    const position = positions.find(p => p.id === selectedPosition) || positions[0]
    if (!action || !position) return

    let newRhythm = clamp(rhythm + (action.rhythmMod || 0), 1, 5)
    let newM, newC
    if (action.rhythmMod !== undefined && action.mDelta === 0 && action.cDelta === 0) {
      newM = clamp(mProgress + newRhythm * 1.8 * position.mB, 0, 100)
      newC = clamp(cProgress + newRhythm * 2.0 * position.cB, 0, 100)
    } else {
      newM = clamp(mProgress + action.mDelta * position.mB, 0, 100)
      newC = clamp(cProgress + action.cDelta * position.cB, 0, 100)
    }

    setRhythm(newRhythm)
    setMProgress(newM)
    setCProgress(newC)
    addMessage('user', action.label)

    if (newM >= 100 && newC >= 100) { endIntimateGame(isBath); return }

    setIsAiTurn(true)
    aiTimerRef.current = setTimeout(() => doAiAction(newM, newC, newRhythm, isBath, position), 1200)
  }

  function doAiAction(currentM, currentC, currentRhythm, isBath, position) {
    const weights = [3, 3, 3, 2, 2, 2, 2, 2, 1]
    const total = weights.reduce((a, b) => a + b, 0)
    let r = Math.random() * total
    let idx = 0
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) { idx = i; break } }
    idx = Math.min(idx, AI_ACTIONS.length - 1)
    const action = AI_ACTIONS[idx]
    if (!action) { setIsAiTurn(false); return }

    let newRhythm = clamp(currentRhythm + (action.rhythmMod || 0), 1, 5)
    const mFactor = 1.8 + (Math.random() * 0.6 - 0.3)
    const cFactor = 0.5 + (Math.random() * 0.4 - 0.2)
    let newM, newC
    if (action.rhythmMod !== undefined && action.mDelta === 0 && action.cDelta === 0) {
      newM = clamp(currentM + newRhythm * mFactor * position.mB, 0, 100)
      newC = clamp(currentC + newRhythm * cFactor * position.cB, 0, 100)
    } else {
      newM = clamp(currentM + action.mDelta * position.mB * 0.9, 0, 100)
      newC = clamp(currentC + action.cDelta * position.cB * 0.9, 0, 100)
    }

    setRhythm(newRhythm)
    setMProgress(newM)
    setCProgress(newC)
    setIsAiTurn(false)
    addMessage('user', `· ${action.label}`)
    sendIntimateAI(action, position, newM, newC, newRhythm, isBath)

    if (newM >= 100 && newC >= 100) endIntimateGame(isBath)
  }

  function endIntimateGame(isBath) {
    const newWk = totalWk + 1
    setTotalWk(newWk)
    setIntimatePhase('aftercare')
    setIsAiTurn(false)
    addMessage('system', isBath ? '🚿 浴室里，共同跌落' : '🌙 结束了')
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: '你是陆绍桓，亲密结束，余温还在，说一句意犹未尽又假装镇定的话。',
        messages: [{ role: 'user', content: '刚刚结束了' }],
        tier: 'premium',
      }),
    }).then(r => r.json()).then(data => {
      const reply = data.choices?.[0]?.message?.content || '···'
      addMessage('assistant', reply)
    })
    saveToDb(messages, intimacy, playerRoom, luRoom, undefined, newWk)
  }

  function resetIntimate() {
    setIntimatePhase('idle')
    setMProgress(0)
    setCProgress(0)
    setRhythm(2)
    setIsAiTurn(false)
  }

  // ── 浴室：请求一起洗澡 ──
  function askBathTogether() {
    setBathPhase('asking')
    addMessage('user', '一起洗？')
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: '你是陆绍桓，她问要不要一起洗澡。愿意的话回复里包含❤️，不愿意温柔找借口。一句话。',
        messages: [{ role: 'user', content: '一起洗澡？' }],
      }),
    }).then(r => r.json()).then(data => {
      const reply = data.choices?.[0]?.message?.content || '···'
      addMessage('assistant', reply)
      setBathPhase(reply.includes('❤️') ? 'agreed' : 'declined')
    })
  }

  function confirmBath() {
    setBathPhase('active')
    setLuRoom('bathroom')
    setPlayerRoom('bathroom')
    addMessage('system', '🚿 一起洗澡中')
    // 初始化浴室亲密姿势为第一个可用的
    const available = getAvailablePositions(true)
    if (available.length > 0) setSelectedPosition(available[0].id)
  }

  function endBath() {
    setBathPhase('idle')
    resetIntimate()
    addMessage('system', '🚿 洗好了')
    sendToAI('洗澡结束了，走出浴室', messages, intimacy, playerRoom, luRoom, false, undefined, true)
  }

  // ── 浴室日常互动 ──
  function doBathSub(subId, mode) {
    const sub = BATH_SUBS.find(s => s.id === subId)
    if (!sub) return
    const actionText = sub.actions[mode]
    if (!actionText) return
    addMessage('user', actionText)
    const prefix = bathPhase === 'active' ? '你们正在一起洗澡，' : '梦珍在浴室，'
    sendToAI(prefix + actionText, messages, intimacy, playerRoom, luRoom, false, undefined, true)
  }

  // ── 卧室：请求亲密 ──
  function askIntimate() {
    setIntimatePhase('asking')
    addMessage('user', '❤️ …?')
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: '你是陆绍桓，她想要亲密。愿意的话回复里包含❤️，不愿意温柔解释。一句话。',
        messages: [{ role: 'user', content: '想要你' }],
        tier: 'premium',
      }),
    }).then(r => r.json()).then(data => {
      const reply = data.choices?.[0]?.message?.content || '···'
      addMessage('assistant', reply)
      setIntimatePhase(reply.includes('❤️') ? 'agreed' : 'declined')
    })
  }

  // 浴室里请求亲密
  function askBathIntimate() {
    setIntimatePhase('asking')
    addMessage('user', '❤️')
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: '你是陆绍桓，你们正在浴室里一起洗澡，她想要你。愿意的话回复里包含❤️，否则温柔拒绝。一句话。',
        messages: [{ role: 'user', content: '想要你' }],
        tier: 'premium',
      }),
    }).then(r => r.json()).then(data => {
      const reply = data.choices?.[0]?.message?.content || '···'
      addMessage('assistant', reply)
      setIntimatePhase(reply.includes('❤️') ? 'agreed' : 'declined')
    })
  }

  function startIntimateGame() {
    const isBath = bathPhase === 'active'
    setMProgress(0)
    setCProgress(0)
    setRhythm(2)
    setIsAiTurn(false)
    setIntimatePhase('game')
    const available = getAvailablePositions(isBath)
    const pos = available.find(p => p.id === selectedPosition) || available[0]
    addMessage('system', `开始了 · ${pos?.name || ''}`)
  }

  // 让AI选姿势
  function letAiPickPosition() {
    const isBath = bathPhase === 'active'
    const available = getAvailablePositions(isBath)
    setClaudePickingPos(true)
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: '你是陆绍桓，从以下姿势中选一个，只回复姿势id，不加任何其他内容：' + available.map(p => p.id).join('、'),
        messages: [{ role: 'user', content: '选一个姿势' }],
      }),
    }).then(r => r.json()).then(data => {
      const reply = (data.choices?.[0]?.message?.content || '').trim()
      const matched = available.find(p => reply.includes(p.id))
      if (matched) setSelectedPosition(matched.id)
      setClaudePickingPos(false)
    })
  }

  // ── 其他交互 ──
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
    if (room.playerKnock && luRoom === roomId) { setShowKnock(true); return }
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
    sendToAI(`你们一起去了${place.name}，描述刚到的场景和你的一个小动作或一句话`, messages, intimacy, 'outside', luRoom, false, undefined, true)
  }

  function handleCallLu() {
    const room = ROOMS.find(r => r.id === playerRoom)
    const canCome = room?.luCanFreely || intimacy >= (room?.unlockAt || 0)
    if (canCome) {
      setLuMoving(true)
      setTimeout(() => { setLuRoom(playerRoom); setLuMoving(false); saveToDb(messages, intimacy, playerRoom, playerRoom) }, 600)
      sendToAI(`（我叫他来${room?.name}，他过来了）说一句`, messages, intimacy, playerRoom, playerRoom, false, undefined, true)
    } else {
      setToast(`与他再亲近些才愿意来此 · 需好感 ${room?.unlockAt}`)
      sendToAI(`（我叫你来${room?.name}，你不太想去）找个现代合理的借口婉拒，温柔但坚定，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
    }
  }

  // ── 派生状态 ──
  const sameRoom = playerRoom === luRoom
  const isOutside = playerRoom === 'outside'
  const currentRoom = ROOMS.find(r => r.id === playerRoom)
  const currentPlace = OUTSIDE_PLACES.find(p => p.id === outsidePlace)
  const intimacyStars = Math.floor(intimacy / 20)
  const currentSceneImg = isOutside ? null : SCENE_IMAGES[playerRoom]
  const currentImgLoaded = isOutside ? true : imgLoaded[playerRoom]
  const currentFallback = SCENE_FALLBACK[playerRoom] || '#0f0c09'
  const isBathActive = bathPhase === 'active'
  const inIntimateGame = intimatePhase === 'game'
  const availablePositions = getAvailablePositions(isBathActive)
  const currentPosition = availablePositions.find(p => p.id === selectedPosition) || availablePositions[0]

  // ── 开场 ──
  if (showOpening) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f0c09',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Georgia, serif', padding: '40px 30px', textAlign: 'center',
      }}>
        <div style={{ color: '#3a2a18', fontSize: '11px', letterSpacing: '0.3em', marginBottom: '40px' }}>ONLY HIM</div>
        <div style={{ color: '#c9a96e', fontSize: '22px', lineHeight: '1.9', marginBottom: '12px', fontStyle: 'italic' }}>
          他说，只是路过。
        </div>
        <div style={{ color: '#4a3a28', fontSize: '13px', fontStyle: 'italic', letterSpacing: '0.1em', marginBottom: '60px' }}>
          He said he was just passing through.
        </div>
        <button onClick={() => { setShowOpening(false); setInitialized(true) }} style={{
          background: 'transparent', border: '1px solid #2a1a10',
          color: '#6a5a40', padding: '12px 40px', fontSize: '12px',
          letterSpacing: '0.2em', cursor: 'pointer', fontFamily: 'Georgia, serif',
        }}>进门</button>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════
  //  主界面渲染
  // ═══════════════════════════════════════════════════════
  return (
    <div style={{
      position: 'relative', width: '100%', maxWidth: '480px', margin: '0 auto',
      height: '100dvh', overflow: 'hidden', fontFamily: 'Georgia, serif',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes breathe {
          0%,100% { transform: translateY(0px) scale(1); opacity:0.92; }
          50% { transform: translateY(-5px) scale(1.015); opacity:1; }
        }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .panel-appear { animation: fadeIn 0.25s ease; }
      `}</style>

      {/* ── 第1层：场景背景 ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: currentFallback, transition: 'background 0.6s ease' }}>
        {currentSceneImg && !currentImgLoaded && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(201,169,110,0.15)', borderTopColor: 'rgba(201,169,110,0.5)', animation: 'spin 1s linear infinite' }} />
          </div>
        )}
        {currentSceneImg && (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${currentSceneImg})`, backgroundSize: 'cover', backgroundPosition: 'center top', opacity: currentImgLoaded ? 1 : 0, transition: 'opacity 0.5s ease' }} />
        )}
        {isOutside && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(201,169,110,0.1)', fontSize: '72px' }}>
            {currentPlace?.name || '外出'}
          </div>
        )}
      </div>

      {/* ── 第2层：立绘 ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }} />

      {/* ── 第3层：特效 ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 30, pointerEvents: 'none' }} />

      {/* ── 第4层：UI ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column', color: '#e8dcc8' }}>

        {/* 顶部 */}
        <div style={{ padding: '12px 16px 8px', background: 'linear-gradient(to bottom, rgba(8,6,4,0.88), rgba(8,6,4,0))', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '16px', color: '#c9a96e', fontWeight: 'bold', letterSpacing: '0.05em', flexShrink: 0 }}>陆绍桓</div>
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
            <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.65)', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
              {luMoving ? <span style={{ color: 'rgba(201,169,110,0.8)' }}>他在移动…</span>
                : isOutside ? `· ${currentPlace?.name || '外出中'}`
                : sameRoom ? '· 同处'
                : `他在${ROOMS.find(r => r.id === luRoom)?.name}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!sameRoom && !isOutside && !luMoving && (
                <button onClick={handleCallLu} style={{ fontSize: '10px', background: 'none', border: '1px solid rgba(201,169,110,0.2)', color: 'rgba(201,169,110,0.55)', padding: '3px 10px', borderRadius: '20px', cursor: 'pointer', letterSpacing: '0.05em' }}>
                  叫他过来
                </button>
              )}
              <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} style={{ fontSize: '9px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', letterSpacing: '0.05em', padding: '2px 0' }}>
                登出
              </button>
            </div>
          </div>
        </div>

        {/* 对话区 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px', maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%)' }}>
          <div style={{ flex: 1 }} />
          {messages.map((m, i) => {
            const isLastUser = m.role === 'user' && i === messages.length - 2
            if (m.role === 'system') return (
              <div key={i} style={{ alignSelf: 'center', fontSize: '10px', color: 'rgba(201,169,110,0.3)', letterSpacing: '0.1em', padding: '2px 0' }}>{m.content}</div>
            )
            return (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', position: 'relative' }}>
                <div style={{
                  background: m.role === 'user' ? 'rgba(26,40,32,0.82)' : 'rgba(12,9,6,0.82)',
                  border: m.role === 'user' ? '1px solid rgba(37,56,48,0.5)' : '1px solid rgba(201,169,110,0.08)',
                  borderRadius: m.role === 'user' ? '16px 16px 3px 16px' : '16px 16px 16px 3px',
                  padding: '9px 13px', fontSize: '14px', lineHeight: '1.7',
                  color: m.role === 'user' ? '#a0c0b0' : '#e8dcc8',
                  backdropFilter: 'blur(10px)',
                }}>
                  {m.content}
                </div>
                {isLastUser && (
                  <div onClick={handleRetract} style={{ fontSize: '10px', color: 'rgba(201,169,110,0.65)', marginTop: '3px', textAlign: 'right', cursor: 'pointer', letterSpacing: '0.05em' }}>撤回重说</div>
                )}
              </div>
            )
          })}
          {loading && (
            <div style={{ alignSelf: 'flex-start', color: 'rgba(201,169,110,0.4)', fontSize: '18px', padding: '4px 8px', letterSpacing: '0.3em' }}>···</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ═══ 卫浴专属面板 ═══ */}
        {playerRoom === 'bathroom' && !inIntimateGame && (
          <div className="panel-appear" style={{ padding: '10px 16px 0', flexShrink: 0 }}>
            <BathroomPanel
              bathPhase={bathPhase}
              intimatePhase={intimatePhase}
              availablePositions={availablePositions}
              selectedPosition={selectedPosition}
              setSelectedPosition={setSelectedPosition}
              claudePickingPos={claudePickingPos}
              sameRoom={sameRoom}
              totalWk={totalWk}
              onAskBath={askBathTogether}
              onConfirmBath={confirmBath}
              onEndBath={endBath}
              onBathSub={doBathSub}
              onAskBathIntimate={askBathIntimate}
              onStartIntimate={startIntimateGame}
              onLetAiPick={letAiPickPosition}
              onDeclineReset={resetIntimate}
            />
          </div>
        )}

        {/* ═══ 卧室专属面板 ═══ */}
        {playerRoom === 'bedroom' && !inIntimateGame && (
          <div className="panel-appear" style={{ padding: '10px 16px 0', flexShrink: 0 }}>
            <BedroomPanel
              intimatePhase={intimatePhase}
              availablePositions={availablePositions}
              selectedPosition={selectedPosition}
              setSelectedPosition={setSelectedPosition}
              claudePickingPos={claudePickingPos}
              totalWk={totalWk}
              onAskIntimate={askIntimate}
              onStartIntimate={startIntimateGame}
              onLetAiPick={letAiPickPosition}
              onDeclineReset={resetIntimate}
            />
          </div>
        )}

        {/* ═══ 亲密游戏面板 ═══ */}
        {inIntimateGame && (
          <div className="panel-appear" style={{ padding: '10px 16px 0', flexShrink: 0 }}>
            <IntimateGamePanel
              isBath={isBathActive}
              position={currentPosition}
              mProgress={mProgress}
              cProgress={cProgress}
              rhythm={rhythm}
              isAiTurn={isAiTurn}
              selectedAction={selectedAction}
              setSelectedAction={setSelectedAction}
              onDoAction={doPlayerAction}
            />
          </div>
        )}

        {/* ═══ 事后面板 ═══ */}
        {intimatePhase === 'aftercare' && (
          <div className="panel-appear" style={{ padding: '10px 16px 0', flexShrink: 0 }}>
            <AftercarePanel
              onDone={() => {
                resetIntimate()
                if (isBathActive) endBath()
              }}
            />
          </div>
        )}

        {/* 输入区 */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {sameRoom && !isOutside && (
            <div style={{ position: 'absolute', bottom: '10px', left: '-4px', width: '90px', height: '130px', zIndex: 50, pointerEvents: 'none', opacity: luMoving ? 0 : 1, transition: 'opacity 0.4s', animation: luMoving ? 'none' : 'breathe 4s ease-in-out infinite' }}>
              {luImgLoaded ? (
                <img src={CHARACTER_IMAGE} alt="陆绍桓" style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom center' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to top, rgba(201,169,110,0.07), transparent)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '6px' }}>
                  <span style={{ color: 'rgba(201,169,110,0.2)', fontSize: '11px' }}>陆</span>
                </div>
              )}
            </div>
          )}
          <div style={{ padding: '10px 14px 18px', paddingLeft: sameRoom && !isOutside ? '82px' : '14px', background: 'linear-gradient(to top, rgba(8,6,4,0.96) 60%, rgba(8,6,4,0) 100%)', display: 'flex', gap: '10px', alignItems: 'center', transition: 'padding-left 0.3s' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder='说点什么…'
              style={{ flex: 1, background: 'rgba(12,9,6,0.75)', border: '1px solid rgba(201,169,110,0.12)', borderRadius: '22px', padding: '11px 18px', color: '#e8dcc8', fontSize: '14px', outline: 'none', fontFamily: 'Georgia, serif', backdropFilter: 'blur(8px)' }}
            />
            <button onClick={handleSend} disabled={loading} style={{ width: '44px', height: '44px', borderRadius: '50%', background: loading ? 'rgba(201,169,110,0.12)' : '#c9a96e', border: 'none', color: '#0f0c09', fontSize: '18px', cursor: loading ? 'default' : 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>↑</button>
          </div>
        </div>
      </div>

      {/* ── 敲门弹窗 ── */}
      {showKnock && (
        <div onClick={() => setShowKnock(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(10,7,4,0.97)', border: '1px solid rgba(201,169,110,0.12)', borderRadius: '16px', padding: '28px 24px', width: '260px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'rgba(201,169,110,0.5)', letterSpacing: '0.15em', marginBottom: '8px' }}>客房</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '24px', lineHeight: 1.6 }}>他在里面。</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowKnock(false)} style={{ flex: 1, background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: 'Georgia, serif' }}>算了</button>
              <button onClick={() => {
                setShowKnock(false)
                if (intimacy < 30) {
                  sendToAI(`（我站在客房门外敲了敲门，好感度只有${intimacy}）你不太想让她进来，冷淡应付或找个借口，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                } else {
                  setPlayerRoom('guest_room')
                  sendToAI(`（我敲了敲门走进来）你在客房里，说一句`, messages, intimacy, 'guest_room', luRoom, false, undefined, true)
                }
              }} style={{ flex: 1, background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.25)', color: '#c9a96e', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: 'Georgia, serif', letterSpacing: '0.05em' }}>敲门</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 外出弹窗 ── */}
      {showOutside && (
        <div onClick={() => setShowOutside(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', background: 'rgba(10,7,4,0.97)', border: '1px solid rgba(201,169,110,0.1)', borderRadius: '20px 20px 0 0', padding: '20px 20px 36px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(201,169,110,0.4)', letterSpacing: '0.2em', marginBottom: '16px', textAlign: 'center' }}>去哪里</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {OUTSIDE_PLACES.map(place => (
                <button key={place.id} onClick={() => handleGoOutside(place.id)} style={{ background: 'rgba(201,169,110,0.05)', border: '1px solid rgba(201,169,110,0.1)', borderRadius: '12px', padding: '14px 8px', cursor: 'pointer', color: '#e8dcc8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '15px' }}>{place.name}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)' }}>{place.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(12,8,4,0.94)', border: '1px solid rgba(201,169,110,0.15)', color: 'rgba(201,169,110,0.7)', fontSize: '11px', padding: '8px 20px', borderRadius: '20px', letterSpacing: '0.1em', zIndex: 300, whiteSpace: 'nowrap', backdropFilter: 'blur(8px)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  子组件：浴室面板
// ═══════════════════════════════════════════════════════
function BathroomPanel({
  bathPhase, intimatePhase, availablePositions, selectedPosition, setSelectedPosition,
  claudePickingPos, sameRoom, totalWk,
  onAskBath, onConfirmBath, onEndBath, onBathSub,
  onAskBathIntimate, onStartIntimate, onLetAiPick, onDeclineReset
}) {
  const panelStyle = {
    background: 'rgba(10,14,18,0.88)',
    border: '1px solid rgba(100,140,180,0.15)',
    borderRadius: '14px', padding: '12px', marginBottom: '8px',
    backdropFilter: 'blur(12px)',
  }
  const btnBase = {
    border: 'none', borderRadius: '10px', padding: '6px 12px',
    fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif',
    letterSpacing: '0.03em',
  }
  const btnPrimary = { ...btnBase, background: 'rgba(201,169,110,0.12)', color: '#c9a96e', border: '1px solid rgba(201,169,110,0.25)' }
  const btnSecondary = { ...btnBase, background: 'rgba(100,140,180,0.1)', color: 'rgba(180,210,240,0.7)', border: '1px solid rgba(100,140,180,0.2)' }
  const btnGhost = { ...btnBase, background: 'none', color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.06)' }

  return (
    <div style={panelStyle}>
      {/* idle：还没一起洗 */}
      {bathPhase === 'idle' && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {sameRoom && <button style={btnPrimary} onClick={onAskBath}>🛁 一起洗</button>}
          {/* 日常互动（不需要同房间）*/}
          {BATH_SUBS.map(sub => (
            <div key={sub.id} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginRight: '2px' }}>{sub.label}</span>
              {sub.actions.self && <button style={{ ...btnGhost, padding: '4px 8px', fontSize: '11px' }} onClick={() => onBathSub(sub.id, 'self')}>自己</button>}
              {sub.actions.you && <button style={{ ...btnSecondary, padding: '4px 8px', fontSize: '11px' }} onClick={() => onBathSub(sub.id, 'you')}>帮我</button>}
              {sub.actions.c && <button style={{ ...btnPrimary, padding: '4px 8px', fontSize: '11px' }} onClick={() => onBathSub(sub.id, 'c')}>帮你</button>}
            </div>
          ))}
        </div>
      )}

      {bathPhase === 'asking' && (
        <div style={{ fontSize: '12px', color: 'rgba(201,169,110,0.5)', letterSpacing: '0.1em' }}>等回应…</div>
      )}

      {bathPhase === 'agreed' && (
        <div>
          <div style={{ fontSize: '12px', color: '#c9a96e', marginBottom: '10px' }}>💙 同意了</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={btnPrimary} onClick={onConfirmBath}>🛁 一起</button>
            <button style={btnGhost} onClick={() => {}}>算了</button>
          </div>
        </div>
      )}

      {bathPhase === 'declined' && (
        <div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginBottom: '8px' }}>今天自己洗吧</div>
          <button style={btnGhost} onClick={() => {}}>好</button>
        </div>
      )}

      {/* active：一起洗澡中 */}
      {bathPhase === 'active' && (
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(100,160,220,0.6)', marginBottom: '10px', letterSpacing: '0.08em' }}>🚿 一起洗澡中</div>

          {/* 日常互动 */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {BATH_SUBS.map(sub => (
              <span key={sub.id} style={{ display: 'flex', gap: '3px', alignItems: 'center', marginRight: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>{sub.label}</span>
                {sub.actions.self && <button style={{ ...btnGhost, padding: '3px 7px', fontSize: '10px' }} onClick={() => onBathSub(sub.id, 'self')}>自己</button>}
                {sub.actions.you && <button style={{ ...btnSecondary, padding: '3px 7px', fontSize: '10px' }} onClick={() => onBathSub(sub.id, 'you')}>帮我</button>}
                {sub.actions.c && <button style={{ ...btnPrimary, padding: '3px 7px', fontSize: '10px' }} onClick={() => onBathSub(sub.id, 'c')}>帮你</button>}
              </span>
            ))}
          </div>

          {/* 亲密入口 */}
          {intimatePhase === 'idle' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={btnPrimary} onClick={onAskBathIntimate}>❤️ 亲密</button>
              <button style={btnGhost} onClick={onEndBath}>洗完了</button>
            </div>
          )}

          {intimatePhase === 'asking' && (
            <div style={{ fontSize: '12px', color: 'rgba(201,169,110,0.5)' }}>等回应…</div>
          )}

          {intimatePhase === 'agreed' && (
            <IntimateStartPanel
              isBath={true}
              availablePositions={availablePositions}
              selectedPosition={selectedPosition}
              setSelectedPosition={setSelectedPosition}
              claudePickingPos={claudePickingPos}
              totalWk={totalWk}
              onStart={onStartIntimate}
              onLetAiPick={onLetAiPick}
              onCancel={onDeclineReset}
            />
          )}

          {intimatePhase === 'declined' && (
            <div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginBottom: '8px' }}>今天先这样</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={btnGhost} onClick={onDeclineReset}>好</button>
                <button style={btnGhost} onClick={onEndBath}>洗完了</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  子组件：卧室面板
// ═══════════════════════════════════════════════════════
function BedroomPanel({
  intimatePhase, availablePositions, selectedPosition, setSelectedPosition,
  claudePickingPos, totalWk,
  onAskIntimate, onStartIntimate, onLetAiPick, onDeclineReset
}) {
  const btnBase = { border: 'none', borderRadius: '10px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }
  const btnPrimary = { ...btnBase, background: 'rgba(201,169,110,0.12)', color: '#c9a96e', border: '1px solid rgba(201,169,110,0.25)' }
  const btnGhost = { ...btnBase, background: 'none', color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.06)' }

  return (
    <div style={{ background: 'rgba(12,8,4,0.88)', border: '1px solid rgba(201,169,110,0.08)', borderRadius: '14px', padding: '12px', marginBottom: '8px', backdropFilter: 'blur(12px)' }}>
      {intimatePhase === 'idle' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={btnPrimary} onClick={onAskIntimate}>❤️ 亲密</button>
        </div>
      )}
      {intimatePhase === 'asking' && (
        <div style={{ fontSize: '12px', color: 'rgba(201,169,110,0.5)', letterSpacing: '0.1em' }}>等回应…</div>
      )}
      {intimatePhase === 'agreed' && (
        <IntimateStartPanel
          isBath={false}
          availablePositions={availablePositions}
          selectedPosition={selectedPosition}
          setSelectedPosition={setSelectedPosition}
          claudePickingPos={claudePickingPos}
          totalWk={totalWk}
          onStart={onStartIntimate}
          onLetAiPick={onLetAiPick}
          onCancel={onDeclineReset}
        />
      )}
      {intimatePhase === 'declined' && (
        <div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginBottom: '8px' }}>今天先这样</div>
          <button style={btnGhost} onClick={onDeclineReset}>好</button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  子组件：开始亲密前的选姿势面板
// ═══════════════════════════════════════════════════════
function IntimateStartPanel({ isBath, availablePositions, selectedPosition, setSelectedPosition, claudePickingPos, totalWk, onStart, onLetAiPick, onCancel }) {
  const btnBase = { border: 'none', borderRadius: '10px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }
  const btnPrimary = { ...btnBase, background: 'rgba(201,169,110,0.12)', color: '#c9a96e', border: '1px solid rgba(201,169,110,0.25)' }
  const btnGhost = { ...btnBase, background: 'none', color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.06)' }

  // 所有姿势（含未解锁，显示锁图标）
  const allPositions = isBath ? BATH_POSITIONS : BEDROOM_POSITIONS

  return (
    <div>
      <div style={{ fontSize: '11px', color: '#c9a96e', marginBottom: '8px' }}>💙 同意了 · 选姿势</div>

      {/* AI选 */}
      <div style={{ marginBottom: '8px' }}>
        {claudePickingPos
          ? <span style={{ fontSize: '11px', color: 'rgba(201,169,110,0.45)' }}>他在选…</span>
          : <button style={{ ...btnGhost, fontSize: '11px', padding: '4px 10px' }} onClick={onLetAiPick}>💙 让他选</button>
        }
      </div>

      {/* 姿势网格 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '10px' }}>
        {allPositions.map(p => {
          const locked = p.unlockWk > totalWk
          const active = selectedPosition === p.id && !locked
          return (
            <button key={p.id} onClick={() => !locked && setSelectedPosition(p.id)} style={{
              ...btnBase, padding: '8px 10px', fontSize: '11px', textAlign: 'left',
              background: active ? 'rgba(201,169,110,0.18)' : 'rgba(255,255,255,0.03)',
              border: active ? '1px solid rgba(201,169,110,0.4)' : '1px solid rgba(255,255,255,0.06)',
              color: locked ? 'rgba(255,255,255,0.15)' : active ? '#c9a96e' : 'rgba(255,255,255,0.55)',
              cursor: locked ? 'default' : 'pointer',
            }}>
              {locked ? `🔒 ${p.name}` : p.name}
              {locked && <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.12)', marginTop: '2px' }}>第{p.unlockWk}次解锁</div>}
              {!locked && <div style={{ fontSize: '9px', color: 'rgba(201,169,110,0.3)', marginTop: '2px' }}>{p.hint}</div>}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button style={btnPrimary} onClick={onStart}>❤️ 开始</button>
        <button style={btnGhost} onClick={onCancel}>算了</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  子组件：亲密游戏面板
// ═══════════════════════════════════════════════════════
function IntimateGamePanel({ isBath, position, mProgress, cProgress, rhythm, isAiTurn, selectedAction, setSelectedAction, onDoAction }) {
  const rhythmDots = '●'.repeat(rhythm) + '○'.repeat(5 - rhythm)
  const btnBase = { border: 'none', borderRadius: '10px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }
  const btnPrimary = { ...btnBase, background: isAiTurn ? 'rgba(201,169,110,0.06)' : 'rgba(201,169,110,0.15)', color: isAiTurn ? 'rgba(201,169,110,0.35)' : '#c9a96e', border: '1px solid rgba(201,169,110,0.25)', width: '100%', padding: '10px', marginTop: '8px' }

  function bar(value, label, color) {
    return (
      <div style={{ marginBottom: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '3px' }}>
          <span>{label}</span><span>{Math.round(value)}</span>
        </div>
        <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '4px', transition: 'width 0.4s' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: isBath ? 'rgba(10,14,20,0.92)' : 'rgba(12,8,4,0.92)', border: `1px solid ${isBath ? 'rgba(100,140,200,0.2)' : 'rgba(201,169,110,0.12)'}`, borderRadius: '14px', padding: '12px', marginBottom: '8px', backdropFilter: 'blur(14px)' }}>
      <div style={{ fontSize: '12px', color: isBath ? 'rgba(160,200,240,0.7)' : '#c9a96e', marginBottom: '8px', letterSpacing: '0.05em' }}>
        {position?.name} · {rhythmDots}
      </div>
      {bar(mProgress, '她 💧', 'linear-gradient(90deg, #f8a0c0, #e04080)')}
      {bar(cProgress, '他 🔥', 'linear-gradient(90deg, #c9a96e, #e08030)')}
      {isAiTurn && (
        <div style={{ fontSize: '11px', color: 'rgba(201,169,110,0.45)', letterSpacing: '0.1em', marginBottom: '6px' }}>他在行动…</div>
      )}
      <select
        value={selectedAction}
        onChange={e => setSelectedAction(e.target.value)}
        disabled={isAiTurn}
        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 10px', color: isAiTurn ? 'rgba(255,255,255,0.2)' : '#e8dcc8', fontSize: '12px', fontFamily: 'Georgia, serif', outline: 'none', marginBottom: '2px' }}
      >
        {PLAYER_ACTIONS.map(a => (
          <option key={a.id} value={a.id}>{a.label}</option>
        ))}
      </select>
      <button style={btnPrimary} onClick={onDoAction} disabled={isAiTurn}>
        {isAiTurn ? '等他…' : '↩ 执行'}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  子组件：事后面板
// ═══════════════════════════════════════════════════════
function AftercarePanel({ onDone }) {
  return (
    <div style={{ background: 'rgba(12,8,4,0.88)', border: '1px solid rgba(201,169,110,0.08)', borderRadius: '14px', padding: '12px', marginBottom: '8px', backdropFilter: 'blur(12px)' }}>
      <div style={{ fontSize: '11px', color: 'rgba(201,169,110,0.45)', letterSpacing: '0.1em', marginBottom: '10px' }}>· 余温 ·</div>
      <button onClick={onDone} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)', borderRadius: '10px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
        好了
      </button>
    </div>
  )
}
