import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/lobby')
      else setLoading(false)
    })
  }, [])

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/lobby` }
    })
  }

  async function handleEmailLogin() {
    setError(''); setSuccess('')
    if (!email || !password) { setError('请填写邮箱和密码'); return }
    setSubmitting(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (err) {
      setError(err.message.includes('Invalid login') ? '邮箱或密码不正确' : err.message)
      return
    }
    router.push('/lobby')
  }

  async function handleEmailRegister() {
    setError(''); setSuccess('')
    if (!email || !password) { setError('请填写邮箱和密码'); return }
    if (password.length < 6) { setError('密码至少6位'); return }
    setSubmitting(true)

    const { data, error: signUpErr } = await supabase.auth.signUp({ email, password })
    if (signUpErr) {
      setSubmitting(false)
      if (signUpErr.message.includes('already registered') || signUpErr.message.includes('already')) {
        setError('该邮箱已注册，请直接登录')
      } else {
        setError(signUpErr.message)
      }
      return
    }

    if (data.session) { router.push('/lobby'); return }

    // 没有 session 说明 Supabase 后台开着邮件验证，尝试直接登录
    const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (loginErr) {
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

  // 氛围句子
  const loadingLines = [
    '他在某个时空，等你很久了。',
    '有些相遇，是命中注定。',
    '你听见了吗？他在叫你的名字。',
    '故事的开头，总是一场意外。',
    '他说，这次不会再让你走了。',
    '月光替他藏好了所有秘密。',
  ]
  const [lineIdx, setLineIdx] = useState(0)
  const [lineFade, setLineFade] = useState(true)

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setLineFade(false)
      setTimeout(() => {
        setLineIdx(prev => (prev + 1) % loadingLines.length)
        setLineFade(true)
      }, 600)
    }, 3000)
    return () => clearInterval(interval)
  }, [loading])

  // 加载中
  if (loading) return (
    <div style={{
      position: 'fixed', inset: 0, background: '#020108',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Georgia, serif',
    }}>
      <img src="/assets/lobby/lobby_bg.png" alt="" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', objectPosition: 'center', zIndex: 0,
        pointerEvents: 'none', opacity: 0.6,
      }} />
      <div style={{
        position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 40px',
      }}>
        <div style={{
          fontSize: '13px', color: 'rgba(220,235,255,0.85)',
          letterSpacing: '0.2em', lineHeight: 2.2,
          textShadow: '0 0 20px rgba(80,160,255,0.5), 0 2px 12px rgba(0,0,0,0.5)',
          opacity: lineFade ? 1 : 0,
          transform: lineFade ? 'translateY(0)' : 'translateY(6px)',
          transition: 'all 0.6s ease',
        }}>{loadingLines[lineIdx]}</div>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; background: #020108; }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }

        input::placeholder { color: rgba(180,210,255,0.35); }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px rgba(10,15,40,0.95) inset !important;
          -webkit-text-fill-color: rgba(200,225,255,0.9) !important;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.8s ease-out both; }
        .fade-in-d1 { animation: fadeIn 0.8s ease-out 0.1s both; }
        .fade-in-d2 { animation: fadeIn 0.8s ease-out 0.2s both; }
        .fade-in-d3 { animation: fadeIn 0.8s ease-out 0.3s both; }
        .fade-in-d4 { animation: fadeIn 0.8s ease-out 0.4s both; }
        .fade-in-d5 { animation: fadeIn 0.8s ease-out 0.5s both; }

        @keyframes shimmer {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#020108',
      }}>
        {/* 背景图 */}
        <img src="/assets/lobby/lobby_bg.png" alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center', zIndex: 0, pointerEvents: 'none',
        }} />

        {/* 内容 */}
        <div style={{
          position: 'relative', zIndex: 10,
          width: '100%', maxWidth: '340px', padding: '0 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          fontFamily: 'Georgia, serif',
        }}>
          {/* 标题 */}
          <div className="fade-in" style={{ textAlign: 'center', marginBottom: '44px' }}>
            <div style={{
              fontSize: '14px', color: 'rgba(220,235,255,0.85)',
              letterSpacing: '0.45em', marginBottom: '14px',
              textShadow: '0 0 20px rgba(80,160,255,0.4)',
            }}>ONLY HIM</div>
            <div style={{
              fontSize: '44px', color: 'rgba(230,240,255,0.98)',
              fontStyle: 'italic', letterSpacing: '0.06em', lineHeight: 1,
              textShadow: '0 0 24px rgba(80,160,255,0.5), 0 0 48px rgba(80,160,255,0.2)',
            }}>是他</div>
            <div style={{
              fontSize: '10px', color: 'rgba(180,215,255,0.65)',
              letterSpacing: '0.25em', marginTop: '12px',
            }}>— 硅基小镇 —</div>
          </div>

          {/* 登录/注册 tab */}
          <div className="fade-in-d1" style={{
            display: 'flex', width: '100%', marginBottom: '20px',
            borderRadius: '14px', overflow: 'hidden',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess('') }}
                style={{
                  flex: 1, padding: '11px',
                  background: mode === m ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: mode === m ? 'rgba(230,240,255,0.95)' : 'rgba(180,210,255,0.45)',
                  fontSize: '13px', letterSpacing: '0.12em',
                  fontFamily: 'Georgia, serif', transition: 'all 0.25s',
                }}
              >{m === 'login' ? '登录' : '注册'}</button>
            ))}
          </div>

          {/* 输入框 */}
          <div className="fade-in-d2" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '8px' }}>
            <input
              type="email" placeholder="邮箱"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{
                width: '100%', padding: '14px 16px',
                background: 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px',
                outline: 'none', color: 'rgba(230,240,255,0.95)',
                fontSize: '14px', fontFamily: 'Georgia, serif', letterSpacing: '0.04em',
                transition: 'border-color 0.25s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(140,190,255,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
            <input
              type="password" placeholder="密码（至少6位）"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{
                width: '100%', padding: '14px 16px',
                background: 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px',
                outline: 'none', color: 'rgba(230,240,255,0.95)',
                fontSize: '14px', fontFamily: 'Georgia, serif', letterSpacing: '0.08em',
                transition: 'border-color 0.25s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(140,190,255,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
          </div>

          {/* 错误/成功提示 */}
          {error && (
            <div style={{
              width: '100%', padding: '10px 14px', marginBottom: '10px',
              background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,100,100,0.2)',
              borderRadius: '12px', fontSize: '12px',
              color: 'rgba(255,190,190,0.95)', letterSpacing: '0.04em', lineHeight: 1.6,
            }}>{error}</div>
          )}
          {success && (
            <div style={{
              width: '100%', padding: '10px 14px', marginBottom: '10px',
              background: 'rgba(80,180,255,0.08)', border: '1px solid rgba(80,180,255,0.2)',
              borderRadius: '12px', fontSize: '12px',
              color: 'rgba(160,220,255,0.95)', letterSpacing: '0.04em', lineHeight: 1.6,
            }}>{success}</div>
          )}

          {/* 主按钮 */}
          <button
            className="fade-in-d3"
            onClick={handleSubmit} disabled={submitting}
            style={{
              width: '100%', padding: '14px', marginBottom: '20px',
              background: submitting
                ? 'rgba(255,255,255,0.05)'
                : 'linear-gradient(135deg, rgba(80,140,255,0.35), rgba(120,80,255,0.3))',
              border: '1px solid rgba(140,180,255,0.3)', borderRadius: '14px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              color: submitting ? 'rgba(180,210,255,0.4)' : 'rgba(230,240,255,0.95)',
              fontSize: '14px', letterSpacing: '0.16em', fontFamily: 'Georgia, serif',
              boxShadow: submitting ? 'none' : '0 4px 24px rgba(80,120,255,0.25)',
              textShadow: submitting ? 'none' : '0 0 12px rgba(100,180,255,0.5)',
              transition: 'all 0.25s',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >{submitting ? '···' : mode === 'login' ? '入 内' : '加 入'}</button>

          {/* 分割线 */}
          <div className="fade-in-d4" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '10px', color: 'rgba(200,220,255,0.4)', letterSpacing: '0.2em' }}>或</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Google 登录 */}
          <button
            className="fade-in-d4"
            onClick={handleGoogleLogin}
            style={{
              width: '100%', padding: '13px',
              background: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px',
              cursor: 'pointer', color: 'rgba(220,235,255,0.8)',
              fontSize: '12px', letterSpacing: '0.14em', fontFamily: 'Georgia, serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.25s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(140,190,255,0.35)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.8 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            以 Google 账号登录
          </button>

          <div className="fade-in-d5" style={{
            marginTop: '28px', fontSize: '11px',
            color: 'rgba(230,240,255,0.85)', letterSpacing: '0.15em', textAlign: 'center',
            textShadow: '0 0 16px rgba(20,10,60,0.9), 0 0 32px rgba(10,5,40,0.7), 0 0 8px rgba(80,160,255,0.4)',
            animation: 'shimmer 4s ease-in-out infinite',
          }}>你的故事，只有你们知道</div>
        </div>
      </div>
    </>
  )
}
