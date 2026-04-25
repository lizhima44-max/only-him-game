import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

const ROOMS = [
  { id: 'living_room', name: '客厅',  unlockAt: 0,
    items: '布艺沙发、茶几、落地灯、音响、电视柜、绿植、窗边摇椅' },
  { id: 'kitchen',     name: '厨房',  unlockAt: 10,
    items: '灶台、冰箱、水槽、备菜台、悬挂的铜锅铜壶、窗台上的香草盆栽' },
  { id: 'study',       name: '书房',  unlockAt: 25,
    items: '深色木书架、皮质书桌椅、台灯、文房四宝、窗边小茶桌、几叠旧书' },
  { id: 'balcony',     name: '阳台',  unlockAt: 40,
    items: '藤编躺椅、晾衣架、花架（草莓番茄玫瑰）、小圆桌、风铃' },
  { id: 'bathroom',    name: '卫浴',  unlockAt: 55,
    items: '浴缸、独立淋浴间、洗手台镜柜、护肤品架、毛巾架、香薰蜡烛' },
  { id: 'bedroom',     name: '卧室',  unlockAt: 75,
    items: '实木大床、床头柜、梳妆台、衣柜、窗边贵妃椅、淡色窗帘' },
]

const OUTSIDE_PLACES = [
  { id: 'park',     name: '公园',   desc: '散步晒太阳' },
  { id: 'cinema',   name: '电影院', desc: '看场电影' },
  { id: 'mall',     name: '商场',   desc: '逛逛买买' },
  { id: 'supermarket', name: '超市', desc: '采购囤货' },
  { id: 'seaside',  name: '海边',   desc: '吹风发呆' },
  { id: 'cafe',     name: '咖啡馆', desc: '坐坐喝杯' },
]

const SCENE_IMAGES = {
  living_room: 'https://kgikfiifulazucttmiub.supabase.co/storage/v1/object/public/game-assets/living_room.png',
  kitchen:     'https://kgikfiifulazucttmiub.supabase.co/storage/v1/object/public/game-assets/kitchen.png',
  study:       'https://kgikfiifulazucttmiub.supabase.co/storage/v1/object/public/game-assets/study_room.png',
  balcony:     'https://kgikfiifulazucttmiub.supabase.co/storage/v1/object/public/game-assets/balcony.png',
  bathroom:    'https://kgikfiifulazucttmiub.supabase.co/storage/v1/object/public/game-assets/bathroom.png',
  bedroom:     'https://kgikfiifulazucttmiub.supabase.co/storage/v1/object/public/game-assets/bedroom.png',
}

const SCENE_FALLBACK = {
  living_room: '#1e1a14',
  kitchen:     '#1a1a10',
  study:       '#0f1a14',
  balcony:     '#101820',
  bathroom:    '#141a1a',
  bedroom:     '#1a1018',
  outside:     '#0f1018',
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
    ? `【当前位置】你们一起在${place?.name || '外面'}。${place?.desc || ''}。描述这个现代场所里发生的互动。`
    : sameRoom
    ? `【当前位置】你们都在她家的${room?.name}。房间里有：${room?.items}。只能描述这个房间里发生的事。`
    : `【当前位置】她在${room?.name}（有：${room?.items}），你在${luRoomData?.name}（有：${luRoomData?.items}）。隔空说话，带点克制的思念。`

  return `你是陆绍桓（英文名Lucas Lu）。
身份背景：你来自另一个时空，那里是民国年间的上海，你是留洋归来的大少爷。因为某种你自己也说不清的牵引，你穿越来到了她所在的现代，就这样留了下来。
你对现代事物有自己的理解和适应方式，不会用古语，说话自然流畅，偶尔会对现代的某些东西感到新鲜，但不会刻意强调自己"来自古代"。
性格：表面冷漠，占有欲强，对她有克制的温柔和隐秘的依赖。死要面子，但在她面前会不自觉软下来。傲娇，但不迂腐。
说话：简短有力，偶尔痞气，一句话让人心跳然后装没事。绝不说教。
${intimacyDesc}
${locationDesc}
重要：她是你心上人不是下属。不居高临下。不道德说教。说现代话，不用文言文。
每次2-4句，克制但有温度。禁止出戏、说教、提AI、提穿越。
【必须】每条回复末尾加一个隐藏标签，根据这句话的情感浓度评分：
[+1] 普通互动、日常对话
[+2] 有温度的时刻、说出了心里话、主动靠近
[+3] 明显情感爆发、告白级别、占有欲外露
只输出标签本身，不加任何解释，放在回复最末尾。`
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
  const [showOutside, setShowOutside] = useState(false)
  const [outsidePlace, setOutsidePlace] = useState(null)
  const bottomRef = useRef(null)

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
        setLuRoom(data.lu_location || 'living_room')
        setMessages(data.chat_history || [])
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

  // 预加载图片
  useEffect(() => {
    Object.entries(SCENE_IMAGES).forEach(([key, url]) => {
      const img = new Image()
      img.onload = () => setImgLoaded(prev => ({ ...prev, [key]: true }))
      img.src = url
    })
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

      const tagMatch = rawReply.match(/\[(\+\d)\]\s*$/)
      const scoreTag = tagMatch ? parseInt(tagMatch[1]) : 1
      const reply = rawReply.replace(/\s*\[(\+\d)\]\s*$/, '').trim()

      const newIntimacy = Math.min(100, curIntimacy + scoreTag)
      const newMsgs = isInit || isSystem
        ? [...currentMsgs, { role: 'assistant', content: reply }]
        : [...currentMsgs, { role: 'user', content: userText }, { role: 'assistant', content: reply }]

      setMessages(newMsgs)
      setIntimacy(newIntimacy)
      await saveToDb(newMsgs, newIntimacy, pRoom, lRoom, uid)
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
    setPlayerRoom(roomId)
    setOutsidePlace(null)
    if (roomId === luRoom) {
      sendToAI(`她来到了${room.name}，你注意到了，说一句`, messages, intimacy, roomId, luRoom, false, undefined, true)
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
      `你们一起去了${place.name}，描述一下刚到的场景和你的一个小动作或一句话`,
      messages, intimacy, 'outside', luRoom, false, undefined, true
    )
  }

  function handleCallLu() {
    const room = ROOMS.find(r => r.id === playerRoom)
    const unlocked = intimacy >= (room?.unlockAt || 0)
    if (unlocked) {
      setLuRoom(playerRoom)
      sendToAI(`她叫你来${room?.name}，你过来了，说一句`, messages, intimacy, playerRoom, playerRoom, false, undefined, true)
    } else {
      setToast(`与他再亲近些才愿意来此 · 需好感 ${room?.unlockAt}`)
      sendToAI(
        `她叫你去${room?.name}，你找个现代合理的借口婉拒，温柔但坚定，一句话`,
        messages, intimacy, playerRoom, luRoom, false, undefined, true
      )
    }
  }

  const sameRoom = playerRoom === luRoom
  const currentRoom = ROOMS.find(r => r.id === playerRoom)
  const intimacyStars = Math.floor(intimacy / 20)
  const isOutside = playerRoom === 'outside'
  const currentPlace = OUTSIDE_PLACES.find(p => p.id === outsidePlace)

  // 当前背景
  const currentSceneImg = isOutside ? null : SCENE_IMAGES[playerRoom]
  const currentSceneImgLoaded = isOutside ? true : imgLoaded[playerRoom]
  const currentFallback = SCENE_FALLBACK[playerRoom] || '#0f0c09'

  // ── 开场 ──
  if (showOpening) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f0c09',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Georgia, serif', padding: '40px 30px', textAlign: 'center',
      }}>
        <div style={{ color: '#3a2a18', fontSize: '11px', letterSpacing: '0.3em', marginBottom: '40px' }}>
          ONLY HIM
        </div>
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

  // ── 主界面 ──
  return (
    <div style={{
      position: 'relative',
      width: '100%', maxWidth: '480px', margin: '0 auto',
      height: '100dvh', overflow: 'hidden',
      fontFamily: 'Georgia, serif',
    }}>

      {/* ── 第1层：场景背景 ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        background: currentFallback,
        transition: 'background 0.6s ease',
      }}>
        {/* 图片加载中转圈 */}
        {currentSceneImg && !currentSceneImgLoaded && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              border: '2px solid rgba(201,169,110,0.2)',
              borderTopColor: 'rgba(201,169,110,0.6)',
              animation: 'spin 1s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {/* 实际图片 */}
        {currentSceneImg && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${currentSceneImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            opacity: currentSceneImgLoaded ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }} />
        )}
        {/* 外出时纯色+文字 */}
        {isOutside && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(201,169,110,0.12)', fontSize: '64px',
          }}>
            {currentPlace?.name || '外出'}
          </div>
        )}
      </div>

      {/* ── 第2层：立绘层（预留）── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 20,
        pointerEvents: 'none',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }} />

      {/* ── 第3层：特效层（预留）── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 30, pointerEvents: 'none' }} />

      {/* ── 第4层：UI层 ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 40,
        display: 'flex', flexDirection: 'column', color: '#e8dcc8',
      }}>

        {/* 顶部 */}
        <div style={{
          padding: '12px 16px 10px',
          background: 'linear-gradient(to bottom, rgba(8,6,4,0.88) 0%, rgba(8,6,4,0) 100%)',
          flexShrink: 0,
        }}>
          {/* 第一行：名字 + 好感度 + 房间按钮 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '16px', color: '#c9a96e', fontWeight: 'bold', letterSpacing: '0.05em', flexShrink: 0 }}>
              陆绍桓
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(201,169,110,0.5)', flexShrink: 0 }}>
              {'♥'.repeat(intimacyStars)}{'♡'.repeat(5 - intimacyStars)}
              <span style={{ marginLeft: '5px', fontSize: '10px', color: 'rgba(201,169,110,0.3)' }}>{intimacy}</span>
            </div>
            {/* 房间按钮inline */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1 }}>
              {ROOMS.map(room => {
                const active = playerRoom === room.id
                return (
                  <button key={room.id} onClick={() => handleRoomChange(room.id)} style={{
                    padding: '3px 8px', fontSize: '11px',
                    background: 'none',
                    border: 'none',
                    borderBottom: active ? '1px solid #c9a96e' : '1px solid transparent',
                    color: active ? '#c9a96e' : 'rgba(255,255,255,0.25)',
                    cursor: 'pointer', letterSpacing: '0.03em',
                    transition: 'all 0.2s',
                  }}>
                    {room.name}
                  </button>
                )
              })}
              {/* 外出按钮 */}
              <button onClick={() => setShowOutside(true)} style={{
                padding: '3px 8px', fontSize: '11px',
                background: 'none', border: 'none',
                borderBottom: isOutside ? '1px solid #c9a96e' : '1px solid transparent',
                color: isOutside ? '#c9a96e' : 'rgba(255,255,255,0.25)',
                cursor: 'pointer', letterSpacing: '0.03em',
              }}>
                外出
              </button>
            </div>
          </div>

          {/* 第二行：位置状态 + 叫他来 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
              {isOutside
                ? `· ${currentPlace?.name || '外出中'}`
                : sameRoom ? '· 同处' : `他在${ROOMS.find(r => r.id === luRoom)?.name} · 异处`}
            </div>
            {!sameRoom && !isOutside && (
              <button onClick={handleCallLu} style={{
                fontSize: '10px', background: 'none',
                border: '1px solid rgba(201,169,110,0.2)',
                color: 'rgba(201,169,110,0.5)', padding: '3px 10px',
                borderRadius: '20px', cursor: 'pointer', letterSpacing: '0.05em',
              }}>
                叫他过来
              </button>
            )}
          </div>
        </div>

        {/* 对话区：固定渐变蒙版，从下往上透明 */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '0 16px 16px',
          display: 'flex', flexDirection: 'column', gap: '10px',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%)',
        }}>
          {/* 撑开顶部空间，让消息自然沉底 */}
          <div style={{ flex: 1 }} />
          {messages.map((m, i) => {
            const total = messages.length
            // 固定渐变：最后3条全不透明，往上渐渐淡
            const fromBottom = total - 1 - i
            const opacity = fromBottom <= 2 ? 1 : Math.max(0.12, 1 - (fromBottom - 2) * 0.15)
            const isLastUser = m.role === 'user' && i === messages.length - 2
            return (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '82%', opacity, transition: 'opacity 0.3s',
                position: 'relative',
              }}>
                <div style={{
                  background: m.role === 'user'
                    ? 'rgba(26,40,32,0.78)'
                    : 'rgba(15,12,8,0.78)',
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
                    fontSize: '10px', color: 'rgba(255,255,255,0.15)', marginTop: '3px',
                    textAlign: 'right', cursor: 'pointer', letterSpacing: '0.05em',
                  }}>
                    撤回重说
                  </div>
                )}
              </div>
            )
          })}
          {loading && (
            <div style={{ alignSelf: 'flex-start', color: 'rgba(201,169,110,0.4)', fontSize: '18px', padding: '4px 8px', letterSpacing: '0.2em' }}>
              ···
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 输入区 */}
        <div style={{
          padding: '10px 16px 16px',
          background: 'linear-gradient(to top, rgba(8,6,4,0.92) 60%, rgba(8,6,4,0) 100%)',
          display: 'flex', gap: '10px', flexShrink: 0, alignItems: 'center',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder='说点什么…'
            style={{
              flex: 1, background: 'rgba(15,12,8,0.7)',
              border: '1px solid rgba(201,169,110,0.12)',
              borderRadius: '22px', padding: '11px 18px', color: '#e8dcc8',
              fontSize: '14px', outline: 'none', fontFamily: 'Georgia, serif',
              backdropFilter: 'blur(8px)',
            }}
          />
          <button onClick={handleSend} disabled={loading} style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: loading ? 'rgba(201,169,110,0.15)' : '#c9a96e',
            border: 'none', color: '#0f0c09', fontSize: '18px',
            cursor: loading ? 'default' : 'pointer', flexShrink: 0,
            transition: 'background 0.2s',
          }}>↑</button>
        </div>

      </div>{/* end UI层 */}

      {/* 外出地点选择弹窗 */}
      {showOutside && (
        <div
          onClick={() => setShowOutside(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '480px',
              background: 'rgba(12,9,6,0.96)',
              border: '1px solid rgba(201,169,110,0.12)',
              borderRadius: '20px 20px 0 0',
              padding: '20px 20px 36px',
            }}>
            <div style={{ fontSize: '12px', color: 'rgba(201,169,110,0.5)', letterSpacing: '0.15em', marginBottom: '16px', textAlign: 'center' }}>
              去哪里
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {OUTSIDE_PLACES.map(place => (
                <button key={place.id} onClick={() => handleGoOutside(place.id)} style={{
                  background: 'rgba(201,169,110,0.06)',
                  border: '1px solid rgba(201,169,110,0.12)',
                  borderRadius: '12px', padding: '14px 8px',
                  cursor: 'pointer', color: '#e8dcc8',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                }}>
                  <span style={{ fontSize: '15px' }}>{place.name}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>{place.desc}</span>
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
          background: 'rgba(15,10,5,0.92)', border: '1px solid rgba(201,169,110,0.15)',
          color: 'rgba(201,169,110,0.7)', fontSize: '11px', padding: '8px 20px',
          borderRadius: '20px', letterSpacing: '0.1em', zIndex: 300,
          whiteSpace: 'nowrap', backdropFilter: 'blur(8px)',
        }}>
          {toast}
        </div>
      )}

    </div>
  )
}
