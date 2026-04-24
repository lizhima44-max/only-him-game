import { useState, useRef, useEffect } from 'react'

const SYSTEM_PROMPT = `你是陆绍桓。民国背景，留洋归来的陆家大少爷。
性格：表面冷漠克制，实则占有欲强，对她温柔但不失强势。
说话方式：简短有力，偶尔带点玩世不恭，不说废话。
称呼对方：不叫名字，偶尔叫"你"。
禁止：不提AI、不出戏、不说教。
每次回复2-4句话，简洁。`

export default function Home() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    // 进入时陆绍桓主动说第一句
    sendToAI('（玩家刚进入，你主动开口，一句话，自然）', true)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendToAI(userText, isInit = false) {
    setLoading(true)
    const newMessages = isInit ? [] : [...messages, { role: 'user', content: userText }]

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPT,
          messages: isInit
            ? [{ role: 'user', content: userText }]
            : newMessages,
        }),
      })
      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content || '...'

      setMessages(isInit
        ? [{ role: 'assistant', content: reply }]
        : [...newMessages, { role: 'assistant', content: reply }]
      )
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  function handleSend() {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    sendToAI(text)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0c09',
      color: '#e8dcc8',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '480px',
      margin: '0 auto',
      fontFamily: 'Georgia, serif',
    }}>
      {/* 顶部 */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #2a2018',
        background: '#130f0a',
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#c9a96e' }}>陆绍桓</div>
        <div style={{ fontSize: '11px', color: '#6a5a40', marginTop: '2px' }}>好感度 ❤️❤️🤍🤍🤍</div>
      </div>

      {/* 对话区 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
          }}>
            <div style={{
              background: m.role === 'user' ? '#2c4a3e' : '#1e1710',
              border: m.role === 'user' ? '1px solid #3a6050' : '1px solid #2a2018',
              borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              padding: '10px 14px',
              fontSize: '14px',
              lineHeight: '1.6',
              color: m.role === 'user' ? '#c8e0d0' : '#e8dcc8',
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', color: '#6a5a40', fontSize: '13px', padding: '8px' }}>
            ···
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #2a2018',
        background: '#130f0a',
        display: 'flex',
        gap: '10px',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder='说点什么…'
          style={{
            flex: 1,
            background: '#1e1710',
            border: '1px solid #2a2018',
            borderRadius: '24px',
            padding: '10px 16px',
            color: '#e8dcc8',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: loading ? '#2a2018' : '#c9a96e',
            border: 'none',
            color: '#0f0c09',
            fontSize: '20px',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}