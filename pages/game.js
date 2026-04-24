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

function getSystemPrompt(intimacy, playerRoom, luRoom) {
  const sameRoom = playerRoom === luRoom
  const room = ROOMS.find(r => r.id === playerRoom)
  const luRoomData = ROOMS.find(r => r.id === luRoom)

  const intimacyDesc =
    intimacy < 20  ? '你刚来不久，表面疏离有礼，但眼神会不自觉跟着她走。' :
    intimacy < 40  ? '你开始放下一点防备，话还是少，但会找理由靠近她。' :
    intimacy < 70  ? '你已承认自己在意她，偶尔会说出过分温柔的话，然后若无其事别开眼。' :
                     '你不再掩饰，占有欲外露，眼里只有她。'

  const locationDesc = sameRoom
    ? `【当前位置】你们都在${room?.name}。房间里有：${room?.items}。只能描述这个房间里发生的事。`
    : `【当前位置】她在${room?.name}（有：${room?.items}），你在${luRoomData?.name}（有：${luRoomData?.items}）。隔空说话，带点克制的思念，不能描述去了其他地方。`

  return `你是陆绍桓（英文名Lucas Lu）。民国背景，留洋归来的大少爷。
这里是她的家，你说"路过"就留下来了，连你自己也说不清为什么。
性格：表面冷漠，占有欲强，对她有克制的温柔和隐秘的依赖。死要面子，但在她面前会不自觉软下来。傲娇，但不迂腐。
说话：简短有力，偶尔痞气，一句话让人心跳然后装没事。文白夹杂但不过度，绝不说教礼教规矩。
${intimacyDesc}
${locationDesc}
重要：她是你心上人不是下属。不提"孤男寡女"之类的迂腐话。不居高临下。不道德说教。
每次2-4句，克制但有温度。禁止出戏、说教、提AI。`
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
// 初始化第一句
  useEffect(() => {
    if (initialized && messages.length === 0) {
      sendToAI('（她第一次回到客厅，你主动开口，一句话，自然克制）', [], 0, 'living_room', 'living_room', true)
    }
  }, [initialized])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  async function sendToAI(userText, currentMsgs, curIntimacy, pRoom, lRoom, isInit = false, uid,isSystem = false) {
    setLoading(true)
    const systemPrompt = getSystemPrompt(curIntimacy, pRoom, lRoom)
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
      const reply = data.choices?.[0]?.message?.content || '···'
      const newIntimacy = Math.min(100, curIntimacy + 1)
// isSystem=true时只存AI回复，不存用户指令
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

  // 撤回最后一条（删掉最后一问一答）
  function handleRetract() {
    if (messages.length < 2) return
    const newMsgs = messages.slice(0, -2)
    setMessages(newMsgs)
    saveToDb(newMsgs, intimacy, playerRoom, luRoom)
  }

  function handleRoomChange(roomId) {
    const room = ROOMS.find(r => r.id === roomId)
    if (!room) return
    // 玩家永远可以去任何房间，未解锁只是他不来
    setPlayerRoom(roomId)
    // 换房间触发
    if (roomId === luRoom) {
      sendToAI(`她来到了${room.name}，你注意到了，说一句`, messages, intimacy, roomId, luRoom, false, undefined, true)
    } else {
      saveToDb(messages, intimacy, roomId, luRoom)
    }
  }

function handleCallLu() {
  const room = ROOMS.find(r => r.id === playerRoom)
  const unlocked = intimacy >= (room?.unlockAt || 0)
  if (unlocked) {
    setLuRoom(playerRoom)
    // 叫他来-解锁
    sendToAI(`她叫你来${room?.name}，你过来了，说一句`, messages, intimacy, playerRoom, playerRoom, false, undefined, true)
  } else {
    // AI拒绝 + UI提示同时触发
    setToast(`与他再亲近些才愿意来此 · 需好感 ${room?.unlockAt}`)
    // 叫他来-拒绝
    sendToAI(
      `她叫你去${room?.name}，你找个合理借口婉拒，温柔但坚定，一句话，不提好感度数字`,
      messages, intimacy, playerRoom, luRoom, false, undefined, true
    )
  }
}

const [toast, setToast] = useState('')

useEffect(() => {
  if (!toast) return
  const t = setTimeout(() => setToast(''), 3000)
  return () => clearTimeout(t)
}, [toast])

  const sameRoom = playerRoom === luRoom
  const currentRoom = ROOMS.find(r => r.id === playerRoom)
  const intimacyStars = Math.floor(intimacy / 20)

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
      minHeight: '100vh', background: '#0f0c09', color: '#e8dcc8',
      display: 'flex', flexDirection: 'column',
      maxWidth: '480px', margin: '0 auto', fontFamily: 'Georgia, serif',
    }}>
      {/* 顶部 */}
      <div style={{
        padding: '12px 16px 10px', borderBottom: '1px solid #1a1410',
        background: '#0d0a07', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '16px', color: '#c9a96e', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              陆绍桓
            </div>
            <div style={{ fontSize: '10px', color: '#3a2a18', marginTop: '3px' }}>
              {'❤️'.repeat(intimacyStars)}{'🤍'.repeat(5 - intimacyStars)}
              <span style={{ marginLeft: '6px', color: '#4a3a28' }}>{intimacy} / 100</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#4a3a28' }}>
              {ROOMS.find(r => r.id === luRoom)?.name}
              <span style={{ color: sameRoom ? '#6a5a40' : '#2a1a10', marginLeft: '6px' }}>
                {sameRoom ? '· 同处' : '· 异处'}
              </span>
            </div>
            {/* 好感度不够时显示提示 */}
            {!sameRoom && intimacy < (currentRoom?.unlockAt || 0) && (
              <div style={{ fontSize: '9px', color: '#3a2010', marginTop: '2px' }}>
                好感 {currentRoom?.unlockAt} 可叫他来此
              </div>
            )}
          </div>
        </div>

        {/* 房间切换 */}
        <div style={{ display: 'flex', gap: '5px', marginTop: '10px', flexWrap: 'wrap' }}>
          {ROOMS.map(room => {
            const active = playerRoom === room.id
            return (
              <button key={room.id} onClick={() => handleRoomChange(room.id)}
                style={{
                  padding: '5px 10px', fontSize: '11px',
                  background: active ? '#1e1508' : 'transparent',
                  border: active ? '1px solid #c9a96e' : '1px solid #1e1410',
                  color: active ? '#c9a96e' : '#4a3a28',
                  cursor: 'pointer', borderRadius: '3px', letterSpacing: '0.05em',
                }}>
                {room.name}
              </button>
            )
          })}
        </div>

        {/* 叫他来 */}
        {!sameRoom && (
          <button onClick={handleCallLu} style={{
            width: '100%', marginTop: '8px', padding: '7px',
            fontSize: '11px', background: 'transparent',
            border: '1px solid #1e1208', color: '#4a3020',
            cursor: 'pointer', borderRadius: '3px', letterSpacing: '0.1em',
          }}>
            叫他过来
          </button>
        )}
      </div>

      {/* 对话区 */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        {messages.map((m, i) => {
          const total = messages.length
          const opacity = Math.max(0.12, (i + 1) / total)
          const isLast = i === messages.length - 1 || i === messages.length - 2
          return (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '82%', opacity, transition: 'opacity 0.3s',
              position: 'relative',
            }}>
              <div style={{
                background: m.role === 'user' ? '#1a2820' : '#14100c',
                border: m.role === 'user' ? '1px solid #253830' : '1px solid #221c14',
                borderRadius: m.role === 'user' ? '16px 16px 3px 16px' : '16px 16px 16px 3px',
                padding: '9px 13px', fontSize: '14px', lineHeight: '1.65',
                color: m.role === 'user' ? '#a0c0b0' : '#e8dcc8',
              }}>
                {m.content}
              </div>
              {/* 最后一条用户消息显示撤回 */}
              {m.role === 'user' && isLast && i === messages.length - 2 && (
                <div
                  onClick={handleRetract}
                  style={{
                    fontSize: '10px', color: '#2a1a10', marginTop: '3px',
                    textAlign: 'right', cursor: 'pointer', letterSpacing: '0.05em',
                  }}>
                  撤回重说
                </div>
              )}
            </div>
          )
        })}
        {loading && (
          <div style={{ alignSelf: 'flex-start', color: '#3a2a18', fontSize: '13px', padding: '6px' }}>
            ···
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {/* 提示条 */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '50%',
          transform: 'translateX(-50%)',
          background: '#1a1208', border: '1px solid #2a1a08',
          color: '#6a5030', fontSize: '11px', padding: '8px 20px',
          borderRadius: '20px', letterSpacing: '0.1em', zIndex: 50,
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}
      {/* 输入区 */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid #1a1410',
        background: '#0d0a07', display: 'flex', gap: '10px',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder='说点什么…'
          style={{
            flex: 1, background: '#14100c', border: '1px solid #1e1410',
            borderRadius: '20px', padding: '10px 16px', color: '#e8dcc8',
            fontSize: '14px', outline: 'none', fontFamily: 'Georgia, serif',
          }}
        />
        <button onClick={handleSend} disabled={loading} style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: loading ? '#1a1410' : '#c9a96e',
          border: 'none', color: '#0f0c09', fontSize: '20px',
          cursor: loading ? 'default' : 'pointer', flexShrink: 0,
        }}>↑</button>
      </div>
    </div>
  )
}
