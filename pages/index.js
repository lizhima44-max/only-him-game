import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/lobby')
      else setLoading(false)
    })
  }, [])

  // 星空背景 canvas（跟 lobby 一致）
  useEffect(() => {
    if (loading) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()

    const W = canvas.width, H = canvas.height

    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.6 + 0.2,
      speed: 0.002 + Math.random() * 0.005,
      phase: Math.random() * Math.PI * 2,
    }))

    const nebulae = [
      { x: W*0.5, y: H*0.3,  rx: 180, ry: 120, color: '40,100,255',  alpha: 0.06 },
      { x: W*0.2, y: H*0.6,  rx: 120, ry: 80,  color: '80,140,255',  alpha: 0.04 },
      { x: W*0.8, y: H*0.5,  rx: 100, ry: 70,  color: '60,120,255',  alpha: 0.035 },
      { x: W*0.15,y: H*0.25, rx: 110, ry: 75,  color: '255,100,180', alpha: 0.03 },
      { x: W*0.85,y: H*0.7,  rx: 90,  ry: 65,  color: '220,80,160',  alpha: 0.025 },
    ]

    const meteors = []
    let meteorTimer = 0
    function spawnMeteor() {
      meteors.push({
        x: Math.random() * (W - 40) + 20,
        y: Math.random() * H * 0.4 + 10,
        vx: 1.2 + Math.random() * 1.8,
        vy: 0.4 + Math.random() * 0.8,
        len: 40 + Math.random() * 55,
        life: 1,
        decay: 0.012 + Math.random() * 0.015,
      })
    }

    let t = 0
    function draw() {
      ctx.clearRect(0, 0, W, H)

      const bg = ctx.createRadialGradient(W/2, H*0.3, 0, W/2, H*0.6, H*0.85)
      bg.addColorStop(0, 'rgba(8,10,28,1)')
      bg.addColorStop(1, 'rgba(2,1,10,1)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      nebulae.forEach(n => {
        const pulse = Math.sin(t * 0.22 + n.x * 0.01) * 0.3 + 0.7
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.rx)
        grad.addColorStop(0, `rgba(${n.color},${n.alpha * pulse * 2})`)
        grad.addColorStop(0.5, `rgba(${n.color},${n.alpha * pulse})`)
        grad.addColorStop(1, `rgba(${n.color},0)`)
        ctx.save(); ctx.scale(1, n.ry / n.rx); ctx.fillStyle = grad
        ctx.beginPath(); ctx.arc(n.x, n.y * (n.rx / n.ry), n.rx, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      })

      stars.forEach(s => {
        const pulse = (Math.sin(t * s.speed * 8 + s.phase) + 1) / 2
        const a = 0.1 + pulse * 0.85
        const r = s.r * (0.7 + pulse * 0.5)
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(180,220,255,${a})`; ctx.fill()
        if (s.r > 1.2) {
          ctx.beginPath(); ctx.arc(s.x, s.y, r * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(100,180,255,${a * 0.1})`; ctx.fill()
        }
      })

      meteorTimer++
      if (meteorTimer > 100 + Math.random() * 80) { spawnMeteor(); meteorTimer = 0 }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * (m.len/5), m.y - m.vy * (m.len/5))
        grad.addColorStop(0, `rgba(200,230,255,${m.life * 0.85})`)
        grad.addColorStop(0.4, `rgba(140,200,255,${m.life * 0.35})`)
        grad.addColorStop(1, 'rgba(100,180,255,0)')
        ctx.strokeStyle = grad; ctx.lineWidth = m.life * 1.4
        ctx.beginPath(); ctx.moveTo(m.x, m.y)
        ctx.lineTo(m.x - m.vx * (m.len/5), m.y - m.vy * (m.len/5)); ctx.stroke()
        m.x += m.vx; m.y += m.vy; m.life -= m.decay
        if (m.life <= 0) meteors.splice(i, 1)
      }

      t += 0.016
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [loading])

  // Google 登录
  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/lobby` }
    })
  }

  // 邮箱登录
  async function handleEmailLogin() {
    setError(''); setSuccess('')
    if (!email || !password) { setError('请填写邮箱和密码'); return }
    setSubmitting(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (err) {
      if (err.message.includes('Invalid login')) setError('邮箱或密码不正确')
      else setError(err.message)
      return
    }
    router.push('/lobby')
  }

  // 邮箱注册（注册成功直接登录，不发验证邮件）
  async function handleEmailRegister() {
    setError(''); setSuccess('')
    if (!email || !password) { setError('请填写邮箱和密码'); return }
    if (password.length < 6) { setError('密码至少6位'); return }
    setSubmitting(true)

    // 注册
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // emailRedirectTo 不设置，配合 Supabase 后台关掉邮件验证
        data: {}
      }
    })
    
    if (signUpErr) {
      setSubmitting(false)
      // 重复邮箱错误
      if (
        signUpErr.message.includes('already registered') ||
        signUpErr.message.includes('User already registered') ||
        signUpErr.message.includes('email address is already')
      ) {
        setError('该邮箱已注册，请直接登录')
      } else {
        setError(signUpErr.message)
      }
      return
    }

    // Supabase 在关掉邮件验证的情况下，signUp 后 session 会直接返回
    // 如果已有 session 直接进
    if (data.session) {
      router.push('/lobby')
      return
    }

    // 如果没有 session（说明 Supabase 后台还开着邮件验证），尝试直接登录
    const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (loginErr) {
      // 登录失败说明邮件验证没关 — 给个提示
      setSuccess('注册成功！请查收验证邮件后登录')
      setMode('login')
    } else {
      router.push('/lobby')
    }
  }

  function handleSubmit() {
    if (mode === 'login') handleEmailLogin()
    else handleEmailRegister()
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#020108',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(100,180,255,0.5)', fontFamily: 'Georgia, serif', fontSize: '14px',
    }}>···</div>
  )

  return (
    <div style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      fontFamily: 'Georgia, serif', background: '#020108',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* 星空背景 */}
      <canvas ref={canvasRef} style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0,
      }} />

      {/* 中央内容 */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: '340px',
        padding: '0 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>

        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            fontSize: '10px', color: 'rgba(140,200,255,0.3)',
            letterSpacing: '0.5em', marginBottom: '14px',
          }}>ONLY HIM</div>
          <div className="title-breathe" style={{
            fontSize: '44px', color: 'rgba(210,230,255,0.95)',
            fontStyle: 'italic', letterSpacing: '0.06em', lineHeight: 1,
          }}>是他</div>
          <div style={{
            fontSize: '10px', color: 'rgba(100,160,255,0.2)',
            letterSpacing: '0.25em', marginTop: '12px',
          }}>— 硅基小镇 —</div>
        </div>

        {/* 登录/注册切换 */}
        <div style={{
          display: 'flex', gap: '0', marginBottom: '28px',
          border: '1px solid rgba(80,140,255,0.12)', borderRadius: '12px', overflow: 'hidden',
          width: '100%',
        }}>
          {['login', 'register'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setSuccess('') }}
              style={{
                flex: 1, padding: '10px',
                background: mode === m ? 'rgba(60,120,255,0.18)' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: mode === m ? 'rgba(180,220,255,0.85)' : 'rgba(100,160,255,0.3)',
                fontSize: '12px', letterSpacing: '0.12em',
                fontFamily: 'Georgia, serif',
                transition: 'all 0.25s',
              }}
            >{m === 'login' ? '登录' : '注册'}</button>
          ))}
        </div>

        {/* 表单 */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '8px' }}>
          <input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{
              width: '100%', padding: '13px 16px', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(80,140,255,0.15)',
              borderRadius: '12px', outline: 'none',
              color: 'rgba(200,225,255,0.85)', fontSize: '14px',
              fontFamily: 'Georgia, serif', letterSpacing: '0.04em',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(80,160,255,0.4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(80,140,255,0.15)'}
          />
          <input
            type="password"
            placeholder="密码（至少6位）"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{
              width: '100%', padding: '13px 16px', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(80,140,255,0.15)',
              borderRadius: '12px', outline: 'none',
              color: 'rgba(200,225,255,0.85)', fontSize: '14px',
              fontFamily: 'Georgia, serif', letterSpacing: '0.08em',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(80,160,255,0.4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(80,140,255,0.15)'}
          />
        </div>

        {/* 错误/成功提示 */}
        {error && (
          <div style={{
            width: '100%', padding: '10px 14px', boxSizing: 'border-box',
            background: 'rgba(255,80,80,0.08)',
            border: '1px solid rgba(255,80,80,0.15)',
            borderRadius: '10px', marginBottom: '12px',
            fontSize: '12px', color: 'rgba(255,140,140,0.8)',
            letterSpacing: '0.04em', lineHeight: 1.6,
          }}>{error}</div>
        )}
        {success && (
          <div style={{
            width: '100%', padding: '10px 14px', boxSizing: 'border-box',
            background: 'rgba(80,180,255,0.06)',
            border: '1px solid rgba(80,180,255,0.15)',
            borderRadius: '10px', marginBottom: '12px',
            fontSize: '12px', color: 'rgba(140,200,255,0.8)',
            letterSpacing: '0.04em', lineHeight: 1.6,
          }}>{success}</div>
        )}

        {/* 主按钮 */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%', padding: '14px',
            background: submitting
              ? 'rgba(40,80,180,0.15)'
              : 'linear-gradient(135deg, rgba(60,120,255,0.28), rgba(40,80,220,0.38))',
            border: '1px solid rgba(80,160,255,0.35)',
            borderRadius: '14px', cursor: submitting ? 'not-allowed' : 'pointer',
            color: submitting ? 'rgba(100,160,255,0.4)' : 'rgba(180,220,255,0.9)',
            fontSize: '14px', letterSpacing: '0.16em',
            fontFamily: 'Georgia, serif',
            boxShadow: submitting ? 'none' : '0 0 20px rgba(60,140,255,0.2)',
            transition: 'all 0.25s',
            marginBottom: '20px',
          }}
        >
          {submitting ? '···' : mode === 'login' ? '入内' : '加入'}
        </button>

        {/* 分割线 */}
        <div style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(80,140,255,0.08)' }} />
          <span style={{ fontSize: '10px', color: 'rgba(100,160,255,0.2)', letterSpacing: '0.2em' }}>或</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(80,140,255,0.08)' }} />
        </div>

        {/* Google 登录 */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: '100%', padding: '13px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(80,140,255,0.12)',
            borderRadius: '14px', cursor: 'pointer',
            color: 'rgba(140,190,255,0.45)',
            fontSize: '12px', letterSpacing: '0.14em',
            fontFamily: 'Georgia, serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.25s',
          }}
          onMouseEnter={e => {
            e.target.style.borderColor = 'rgba(80,160,255,0.22)'
            e.target.style.color = 'rgba(160,210,255,0.6)'
          }}
          onMouseLeave={e => {
            e.target.style.borderColor = 'rgba(80,140,255,0.12)'
            e.target.style.color = 'rgba(140,190,255,0.45)'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          以 Google 账号登录
        </button>

        <div style={{
          marginTop: '32px', fontSize: '10px',
          color: 'rgba(60,100,180,0.25)', letterSpacing: '0.1em', textAlign: 'center',
        }}>你的故事，只有你们知道</div>
      </div>

      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: rgba(100,160,255,0.2); }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #020108 inset !important;
          -webkit-text-fill-color: rgba(200,225,255,0.85) !important;
        }

        @keyframes titleBreathe {
          0%, 100% {
            text-shadow:
              0 0 20px rgba(80,160,255,0.45),
              0 0 40px rgba(80,160,255,0.2),
              0 0 80px rgba(60,120,255,0.08);
          }
          50% {
            text-shadow:
              0 0 30px rgba(100,180,255,0.85),
              0 0 60px rgba(80,160,255,0.45),
              0 0 100px rgba(60,140,255,0.2);
          }
        }
        .title-breathe {
          animation: titleBreathe 3.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
