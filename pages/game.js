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

const CHARACTER_IMAGE = '/assets/characters/lu_default.png'

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
        setInitialized(true)
      } else {
        await supabase.from('game_saves').upsert(
          { user_id: session.user.id },
          { onConflict: 'user_id', ignoreDuplicates: true }
        )
        setShowOpening(true)
      }
    })
  }, [])

  // 新用户第一句话由「进门」按钮直接触发，不在此处理

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

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, messages: msgsToSend }),
      })
      const data = await res.json()
      const rawReply = data.choices?.[0]?.message?.content || '···'
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
  if (showOpening) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#0f0c09',
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
        <button onClick={async () => {
          // 先让AI说第一句，等回来了再进主界面
          setInitialized(true)
          await sendToAI('（她第一次回到客厅，你主动开口，一句话，自然克制）', [], 0, 'living_room', 'living_room', true)
          setShowOpening(false)
        }} style={{
          background: 'transparent', border: '1px solid #2a1a10',
          color: '#6a5a40', padding: '12px 40px', fontSize: '12px',
          letterSpacing: '0.2em', cursor: 'pointer', fontFamily: 'Georgia, serif',
        }}>进门</button>
      </div>
    )
  }

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
          {sameRoom && !isOutside && (
            <div style={{
              position: 'absolute',
              bottom: '10px', left: '-4px',
              width: '90px', height: '130px',
              zIndex: 50, pointerEvents: 'none',
              opacity: luMoving ? 0 : 1,
              transition: 'opacity 0.4s',
              animation: luMoving ? 'none' : 'breathe 4s ease-in-out infinite',
            }}>
              {luImgLoaded ? (
                <img src={CHARACTER_IMAGE} alt="陆绍桓"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom center' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  background: 'linear-gradient(to top, rgba(201,169,110,0.07), transparent)',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '6px',
                }}>
                  <span style={{ color: 'rgba(201,169,110,0.2)', fontSize: '11px' }}>陆</span>
                </div>
              )}
            </div>
          )}

          <div style={{
            padding: '10px 14px 18px',
            paddingLeft: sameRoom && !isOutside ? '82px' : '14px',
            background: 'linear-gradient(to top, rgba(8,6,4,0.96) 60%, rgba(8,6,4,0) 100%)',
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
