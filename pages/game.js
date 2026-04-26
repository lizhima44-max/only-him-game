import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

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

const CHARACTER_IMAGES = {
  default:   '/assets/characters/lu_default.png',
  shy:       '/assets/characters/lu_shy.png',      // 腻歪/一起洗
  intense:   '/assets/characters/lu_intense.png',  // 亲密进行
  aftercare: '/assets/characters/lu_aftercare.png',// 余温
}
// 占位：图片不存在时fallback到default
function getCharImg(key) {
  return CHARACTER_IMAGES[key] || CHARACTER_IMAGES.default
}

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
  const [expandedAction, setExpandedAction] = useState(null)
  const [romantic, setRomantic] = useState(0)
  const [bathPhase, setBathPhase] = useState('idle')
  const [intimatePhase, setIntimatePhase] = useState('idle')
  const [customPranks, setCustomPranks] = useState([])
  const [showAddPrank, setShowAddPrank] = useState(false)
  const [newPrankText, setNewPrankText] = useState('')
  const bottomRef = useRef(null)

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
    charImg.src = CHARACTER_IMAGE
  }, [])

  async function saveToDb(msgs, intim, pRoom, lRoom, uid) {
    const id = uid || userId
    if (!id) return
    await supabase.from('game_saves').upsert({
      user_id: id,
      chat_history: msgs.slice(-30),
      intimacy: intim,
      current_room: pRoom,
      lu_location: lRoom,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  async function sendToAI(userText, currentMsgs, curIntimacy, pRoom, lRoom, isInit = false, uid, isSystem = false) {
    setLoading(true)
    const systemPrompt = getSystemPrompt(curIntimacy, pRoom, lRoom, outsidePlace)
    const msgsToSend = isInit
      ? [{ role: 'user', content: userText }]
      : [...currentMsgs, { role: 'user', content: userText }]
    let rawReply = ''
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, messages: msgsToSend }),
      })
      const data = await res.json()
      rawReply = data.choices?.[0]?.message?.content || '···'
      console.log('AI rawReply:', rawReply)

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
              陆绍桓
            </div>
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
            const isLastUser = m.role === 'user' && i === messages.length - 2
            return (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%', position: 'relative',
              }}>
                <div style={{
                  background: m.role === 'user' ? 'rgba(26,40,32,0.82)' : 'rgba(12,9,6,0.82)',
                  border: m.role === 'user'
                    ? '1px solid rgba(37,56,48,0.5)'
                    : '1px solid rgba(201,169,110,0.08)',
                  borderRadius: m.role === 'user' ? '16px 16px 3px 16px' : '16px 16px 16px 3px',
                  padding: '9px 13px', fontSize: '14px', lineHeight: '1.7',
                  color: m.role === 'user' ? '#a0c0b0' : '#e8dcc8',
                  backdropFilter: 'blur(10px)',
                }}>
                  {m.content}
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
                  alt="陆绍桓"
                  onError={e => { if (imgSrc !== CHARACTER_IMAGES.default) e.target.src = CHARACTER_IMAGES.default }}
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
                  fontSize: '12px', cursor: 'pointer', backdropFilter: 'blur(8px)',
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
                  fontSize: '12px', cursor: 'pointer', backdropFilter: 'blur(8px)',
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
                  ],
                  kitchen: [
                    { label: '一起做饭', prompt: '她叫你一起进厨房做饭，你的反应，一句话' },
                    { label: '蹭饭', prompt: '她在做饭你凑过去蹭了一口，说一句' },
                  ],
                  study: [
                    { label: '借书', prompt: '她进书房想借本书，你抬头看了她一眼，说一句' },
                    { label: '打扰他', prompt: '她故意进书房打扰你，你的反应，一句话' },
                  ],
                  balcony: [
                    { label: '看星星', prompt: '她在阳台看星星，你跟出来了，说一句' },
                    { label: '浇花', prompt: '她蹲下来浇花，你站在旁边，说一句' },
                  ],
                  guest_room: [
                    { label: '坐会儿', prompt: '她进了客房坐下，你坐在对面，说一句' },
                  ],
                  bathroom: [],
                  bedroom: [
                    { label: '躺一躺', prompt: '她走进卧室躺下，你站在门口，说一句' },
                    { label: '说说话', prompt: '卧室里安静，她想和你说说话，你的反应' },
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
                  fontSize: '12px', cursor: 'pointer', backdropFilter: 'blur(8px)',
                  fontFamily: 'Georgia, serif', letterSpacing: '0.05em', transition: 'all 0.2s',
                })
                return (
                  <>
                    {acts.map(a => (
                      <button key={a.label} onClick={() => { setExpandedAction(null); sendToAI(a.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true) }}
                        style={btnStyle()}
                      >{a.label}</button>
                    ))}
                    {/* 书房：日记本（不需要同处，是他自己的日记） */}
                    {playerRoom === 'study' && (
                      <button onClick={() => {
                        sendToAI('你在书房，写一篇关于她的日记（你自己的内心独白，不让她看到的那种），2-4句，第一人称，克制但藏不住', messages, intimacy, playerRoom, luRoom, false, undefined, true)
                      }} style={btnStyle()}>他的日记</button>
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
                  mall:        [{ label: '逛逛', prompt: '她在商场橱窗前停下来，你说一句' }, { label: '帮我提包', prompt: '她把袋子塞给你，你接过来，说一句' }],
                  supermarket: [{ label: '推车', prompt: '你接过了超市的购物车，说一句' }, { label: '挑东西', prompt: '她拿起什么东西在研究，你凑过去，说一句' }],
                  seaside:     [{ label: '吹风', prompt: '海边的风把她头发吹乱了，你看着，说一句' }, { label: '捡贝壳', prompt: '她蹲下来捡贝壳，你站在旁边，说一句' }],
                  cafe:        [{ label: '点单', prompt: '服务员来了，她在想点什么，你替她说了一句' }, { label: '发呆', prompt: '咖啡馆里很安静，你们都有点发呆，你先开口' }],
                }
                const acts = outsideActions[outsidePlace] || []
                return acts.map(a => (
                  <button
                    key={a.label}
                    onClick={() => sendToAI(a.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true)}
                    style={{
                      flexShrink: 0, padding: '6px 14px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(201,169,110,0.12)',
                      borderRadius: '20px', color: 'rgba(201,169,110,0.55)',
                      fontSize: '12px', cursor: 'pointer', backdropFilter: 'blur(8px)',
                      fontFamily: 'Georgia, serif', letterSpacing: '0.05em',
                    }}
                  >{a.label}</button>
                ))
              })()}
            </div>

            {/* 展开面板：腻歪 */}
            {expandedAction === 'niwai' && (
              <div style={{
                margin: '0 14px 6px',
                background: 'rgba(12,9,6,0.85)', backdropFilter: 'blur(12px)',
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
                background: 'rgba(12,9,6,0.85)', backdropFilter: 'blur(12px)',
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
                background: 'rgba(12,9,6,0.85)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(201,169,110,0.12)',
                borderRadius: '14px', padding: '10px 12px',
              }}>
                {bathPhase === 'idle' && (
                  <>
                    <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.35)', letterSpacing: '0.15em', marginBottom: '8px' }}>浴室</div>
                    {/* 不需要同处：自己护理 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: sameRoom ? '8px' : '0' }}>
                      {(sameRoom ? [
                        // 同处才有：需要他帮忙的
                        { label: '帮我洗头', prompt: '她让陆绍桓帮她洗头，他的反应' },
                        { label: '帮我搓背', prompt: '她让陆绍桓帮她搓背，他的反应，一句话' },
                        { label: '帮我吹头发', prompt: '她让陆绍桓帮她吹头发，他的反应和动作' },
                        { label: '帮你刮胡子', prompt: '她主动给陆绍桓刮胡子，他的反应' },
                        { label: '泡个澡', prompt: '她泡进浴缸里，陆绍桓也在里面，说一句' },
                      ] : [
                        // 不同处：自己在浴室叫他
                        { label: '叫他进来', prompt: '她在浴室外叫陆绍桓进来帮忙，他推开门，说一句' },
                        { label: '帮我吹头发', prompt: '她洗完出来让陆绍桓帮她吹头发，他的反应' },
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
                        const reply = await sendToAI('她问陆绍桓要不要一起洗，他的回应，如果愿意回复里自然包含❤️', messages, intimacy, playerRoom, luRoom, false, undefined, true)
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
                        { label: '帮我洗头', prompt: '你们一起洗澡，她让陆绍桓帮她洗头，他的反应' },
                        { label: '帮我搓背', prompt: '你们一起洗澡，她让陆绍桓帮她搓背，他的反应' },
                        { label: '靠着他', prompt: '你们一起在浴室，她往他身上靠了一下，他的反应' },
                      ].map(a => (
                        <button key={a.label} onClick={() => sendToAI(a.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true)}
                          style={{ padding: '5px 12px', background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'rgba(201,169,110,0.7)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
                        >{a.label}</button>
                      ))}
                    </div>
                    {intimacy >= 60 && intimatePhase === 'idle' && (
                      <button onClick={async () => {
                        setIntimatePhase('asking')
                        const reply = await sendToAI('你们一起在浴室里，她想要更进一步，陆绍桓自然地回应，如果愿意带❤️', messages, intimacy, playerRoom, luRoom, false, undefined, true)
                        if (reply && reply.includes('❤️')) {
                          setIntimatePhase('agreed')
                        } else {
                          setIntimatePhase('declined')
                        }
                      }} style={{ padding: '6px 14px', background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: '20px', color: 'rgba(201,169,110,0.8)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>再近一点</button>
                    )}
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
                background: 'rgba(12,9,6,0.85)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(201,169,110,0.12)',
                borderRadius: '14px', padding: '10px 12px',
              }}>
                {/* 浪漫值进度条 */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(201,169,110,0.4)', marginBottom: '4px' }}>
                    <span>浪漫值</span><span>{romantic}/100</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${romantic}%`, background: 'linear-gradient(to right, rgba(201,169,110,0.4), rgba(201,169,110,0.8))', borderRadius: '4px', transition: 'width 0.4s' }} />
                  </div>
                </div>

                {intimatePhase === 'idle' && (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {[
                        { label: '点蜡烛', action: () => { setRomantic(n => Math.min(100, n + 20)); sendToAI('她点上了蜡烛，你注意到了，说一句', messages, intimacy, playerRoom, luRoom, false, undefined, true) } },
                        { label: '营造气氛', action: () => { setRomantic(n => Math.min(100, n + 10)); sendToAI('她在营造浪漫气氛，你感觉到了，说一句', messages, intimacy, playerRoom, luRoom, false, undefined, true) } },
                        { label: '靠着你', action: () => sendToAI('她在卧室靠在你身边，你感觉到了，说一句', messages, intimacy, playerRoom, luRoom, false, undefined, true) },
                        { label: '说晚安', action: () => sendToAI('她说晚安，你的回应，一句话', messages, intimacy, playerRoom, luRoom, false, undefined, true) },
                      ].map(a => (
                        <button key={a.label} onClick={() => a.action()}
                          style={{ padding: '5px 12px', background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'rgba(201,169,110,0.7)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
                        >{a.label}</button>
                      ))}
                    </div>
                    {romantic >= 60 && sameRoom && intimacy >= 60 ? (
                      <button onClick={async () => {
                        setIntimatePhase('asking')
                        const reply = await sendToAI('卧室里气氛很好，她主动靠近你，你感觉到了她的意思，自然地回应，如果愿意带❤️', messages, intimacy, playerRoom, luRoom, false, undefined, true)
                        if (reply && reply.includes('❤️')) {
                          setIntimatePhase('agreed')
                        } else {
                          setIntimatePhase('declined')
                        }
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
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setIntimatePhase('game'); sendToAI('你们决定了，描述这个时刻的开始，第一人称，克制温柔，情绪细腻，不超过4句', messages, intimacy, playerRoom, luRoom, false, undefined, true) }}
                      style={{ flex: 1, padding: '8px', background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.3)', borderRadius: '10px', color: '#c9a96e', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>继续</button>
                    <button onClick={() => setIntimatePhase('idle')} style={{ padding: '8px 12px', background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: 'rgba(255,255,255,0.2)', fontSize: '12px', cursor: 'pointer' }}>算了</button>
                  </div>
                )}
                {intimatePhase === 'game' && (
                  <>
                    <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.4)', marginBottom: '8px', letterSpacing: '0.1em' }}>
                      {playerRoom === 'bathroom' ? '浴室 · 进行中' : '卧室 · 进行中'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {[
                        { label: '慢一点', prompt: `她说慢一点，陆绍桓的回应，第一人称，克制深情，一两句` },
                        { label: '抱紧我', prompt: `她说抱紧我，陆绍桓的反应，动作+一句话` },
                        { label: '亲亲', prompt: `她想要他亲她，陆绍桓的反应，细腻感受` },
                        { label: '别停', prompt: `她说别停，陆绍桓的回应，第一人称，沉溺其中` },
                        { label: '看着我', prompt: `她说看着我，陆绍桓低头看她，说一句话，眼神和情绪都写出来` },
                      ].map(a => (
                        <button key={a.label} onClick={() => sendToAI(a.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true)}
                          style={{ padding: '5px 12px', background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'rgba(201,169,110,0.7)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
                        >{a.label}</button>
                      ))}
                    </div>
                    <button onClick={() => {
                      setIntimatePhase('aftercare')
                      if (playerRoom === 'bathroom') setBathPhase('idle')
                      setRomantic(0)
                      sendToAI('结束了，陆绍桓温柔地陪着她，余温里说一句，不急不躁', messages, intimacy, playerRoom, luRoom, false, undefined, true)
                    }} style={{ padding: '6px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', color: 'rgba(255,255,255,0.2)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>结束</button>
                  </>
                )}
                {intimatePhase === 'aftercare' && (
                  <>
                    <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.35)', marginBottom: '8px', letterSpacing: '0.12em' }}>余温 · 还在</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {[
                        { label: '抱着睡', prompt: '她窝在陆绍桓怀里，快要睡着，他轻轻说一句，声音低沉温柔' },
                        { label: '说说话', prompt: '事后两人静静靠着，她先开口说了句什么，他的回应，克制里有温柔' },
                        { label: '亲额头', prompt: '陆绍桓在余温里轻轻亲了她的额头，带点不自知的温柔，写他的动作和内心一句话' },
                        { label: '他先睡', prompt: '陆绍桓慢慢闭上眼，她看着他，描述这一刻' },
                      ].map(a => (
                        <button key={a.label} onClick={() => sendToAI(a.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true)}
                          style={{ padding: '5px 12px', background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.12)', borderRadius: '20px', color: 'rgba(201,169,110,0.6)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
                        >{a.label}</button>
                      ))}
                    </div>
                    <button onClick={() => setIntimatePhase('idle')} style={{ marginTop: '8px', padding: '5px 12px', background: 'none', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', color: 'rgba(255,255,255,0.15)', fontSize: '11px', cursor: 'pointer' }}>结束余温</button>
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
                  backdropFilter: 'blur(8px)',
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
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
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
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
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
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
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
                const prompt = `她${newPrankText.trim()}，陆绍桓的反应，一句话`
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

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '90px', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(12,8,4,0.94)', border: '1px solid rgba(201,169,110,0.15)',
          color: 'rgba(201,169,110,0.7)', fontSize: '11px', padding: '8px 20px',
          borderRadius: '20px', letterSpacing: '0.1em', zIndex: 300,
          whiteSpace: 'nowrap', backdropFilter: 'blur(8px)',
        }}>{toast}</div>
      )}

    </div>
      </div>
    </>
  )
}
