import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'
import AgreementModal from '../components/AgreementModal'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [agreedAll, setAgreedAll] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('agreedAll') === 'true'
    }
    return false
  })
  const [ageConfirmed, setAgeConfirmed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ageConfirmed') === 'true'
    }
    return false
  })
  const [showAgreement, setShowAgreement] = useState(null)

  const [theme, setTheme] = useState('day')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 18) {
      setTheme('day')
    } else {
      setTheme('night')
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/lobby')
      else setLoading(false)
    })
  }, [])

  async function handleGoogleLogin() {
    if (!agreedAll) {
      setError('请阅读并同意用户协议、隐私政策和免责声明')
      return
    }
    if (!ageConfirmed) {
      setError('请确认您已年满18周岁')
      return
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/lobby` }
    })
  }

  async function handleEmailLogin() {
    setError(''); setSuccess('')
    if (!agreedAll) {
      setError('请阅读并同意用户协议、隐私政策和免责声明')
      return
    }
    if (!ageConfirmed) {
      setError('请确认您已年满18周岁')
      return
    }
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
    if (!agreedAll) {
      setError('请阅读并同意用户协议、隐私政策和免责声明')
      return
    }
    if (!ageConfirmed) {
      setError('请确认您已年满18周岁')
      return
    }
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

  if (loading) return (
    <div className={`theme-${theme}`} style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Georgia, serif',
      background: 'var(--bg-main)',
    }}>
      {/*<img src="/assets/lobby/lobby_bg.png" alt="" style={{*/}
      <img src="" alt="" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', objectPosition: 'center', zIndex: 0,
        pointerEvents: 'none', opacity: theme === 'day' ? 0.3 : 0.5,
      }} />
      <div style={{
        position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 40px',
      }}>
        <div style={{
          fontSize: '13px', color: 'var(--text-primary)',
          letterSpacing: '0.2em', lineHeight: 2.2,
          textShadow: theme === 'day' ? 'none' : '0 0 20px rgba(255,141,186,0.3)',
          opacity: lineFade ? 1 : 0,
          transform: lineFade ? 'translateY(0)' : 'translateY(6px)',
          transition: 'all 0.6s ease',
        }}>{loadingLines[lineIdx]}</div>
      </div>
    </div>
  )

  return (
    <>
      <style jsx global>{`
        /* ========== 白天模式 ========== */
        .theme-day {
          --bg-main: #F9F5F2;
          --text-primary: #3A3A3A;
          --text-secondary: #6D6D6D;
          --text-accent: #F88DA7;
          --btn-gradient-start: #F88DA7;
          --btn-gradient-end: #FFB8C5;
          --border-glass: rgba(255,255,255,0.5);
          --shadow-btn: rgba(248,141,167,0.3);
          --card-bg: rgba(255,255,255,0.12);
          --card-bg-hover: rgba(255,255,255,0.22);
          --error-bg: rgba(255,80,80,0.1);
          --error-border: rgba(255,100,100,0.2);
          --error-color: #c94a4a;
          --success-bg: rgba(80,180,255,0.08);
          --success-border: rgba(80,180,255,0.2);
          --success-color: #4a9eff;
        }

        /* ========== 夜晚模式 ========== */
        .theme-night {
          --bg-main: #1B0A1F;
          --text-primary: #EDEAF2;
          --text-secondary: #C9B8D9;
          --text-accent: #FFB8C5;
          --btn-gradient-start: #FF8DBA;
          --btn-gradient-end: #F78DC0;
          --border-glass: rgba(255,255,255,0.35);
          --shadow-btn: rgba(255,136,187,0.35);
          --card-bg: rgba(255,255,255,0.08);
          --card-bg-hover: rgba(255,255,255,0.18);
          --error-bg: rgba(255,80,80,0.1);
          --error-border: rgba(255,100,100,0.2);
          --error-color: #ff9e9e;
          --success-bg: rgba(80,180,255,0.08);
          --success-border: rgba(80,180,255,0.2);
          --success-color: #7ec8ff;
        }

        html, body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          height: 100%;
        }

        * {
          -webkit-tap-highlight-color: transparent;
          box-sizing: border-box;
        }

        input::placeholder {
          color: var(--text-secondary);
          opacity: 0.5;
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

        /* ========== Tab 容器 ========== */
        .tab-container {
          display: flex;
          width: 100%;
          margin-bottom: 20px;
          border-radius: 16px;
          overflow: hidden;
          background: var(--card-bg);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-glass);
          padding: 2px;
          gap: 2px;
        }
        .tab-btn {
          flex: 1;
          padding: 11px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          font-size: 13px;
          letter-spacing: 0.12em;
          font-family: Georgia, serif;
          transition: all 0.25s ease;
          border-radius: 12px;
        }
        .tab-btn.active {
          background: rgba(255,255,255,0.2);
          color: var(--text-primary);
        }
        .tab-btn:hover:not(.active) {
          background: rgba(255,255,255,0.12);
          color: var(--text-primary);
          box-shadow: 0 0 8px var(--btn-gradient-start);
          border-radius: 12px;
        }

        /* ========== 玻璃感输入框 ========== */
        .input-glass {
          width: 100%;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid var(--border-glass);
          background: var(--card-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          transition: all 0.25s;
          font-family: Georgia, serif;
        }
        .input-glass:focus {
          border-color: var(--btn-gradient-start);
          background: var(--card-bg-hover);
          box-shadow: 0 0 8px var(--btn-gradient-start);
        }

        /* ========== 主按钮（入内）- 默认无光晕，hover时有 ========== */
        .btn-main {
          width: 100%;
          padding: 14px 0;
          border-radius: 28px;
          border: 1px solid var(--border-glass);
          background: var(--card-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 500;
          text-align: center;
          font-family: Georgia, serif;
          letter-spacing: 0.16em;
          box-shadow: none;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .btn-main:hover:not(:disabled) {
          background: var(--card-bg-hover);
          transform: translateY(-2px);
          box-shadow: 0 0 16px var(--btn-gradient-start), 0 4px 20px var(--shadow-btn);
          border-color: var(--btn-gradient-start);
        }
        .btn-main:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ========== 次按钮（Google） ========== */
        .btn-secondary {
          width: 100%;
          padding: 12px 0;
          border-radius: 22px;
          border: 1px solid var(--border-glass);
          background: var(--card-bg);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: var(--text-primary);
          font-size: 12px;
          font-family: Georgia, serif;
          letter-spacing: 0.14em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .btn-secondary:hover {
          background: var(--card-bg-hover);
          border-color: var(--btn-gradient-start);
          box-shadow: 0 0 8px var(--btn-gradient-start);
        }

        /* ========== 协议卡片 ========== */
        .agreement-card {
          background: var(--card-bg);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border-glass);
          border-radius: 16px;
          padding: 14px 16px;
          transition: all 0.25s ease;
          cursor: pointer;
        }
        .agreement-card:hover {
          background: var(--card-bg-hover);
          border-color: var(--btn-gradient-start);
          box-shadow: 0 0 8px var(--btn-gradient-start);
        }
        .agreement-link {
          background: none;
          border: none;
          color: var(--text-accent);
          font-size: 11px;
          cursor: pointer;
          padding: 4px 0;
          transition: all 0.2s ease;
          font-family: Georgia, serif;
        }
        .agreement-link:hover {
          color: var(--btn-gradient-end);
          text-shadow: 0 0 4px var(--text-accent);
          transform: translateY(-1px);
        }
      `}</style>

      <div className={`theme-${theme}`} style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-main)',
      }}>
        {/*<img src="/assets/lobby/lobby_bg.png" alt="" style={{*/}
        <img src="" alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center', zIndex: 0, pointerEvents: 'none',
          opacity: theme === 'day' ? 0.3 : 0.5,
        }} />

        <div style={{
          position: 'relative', zIndex: 10,
          width: '100%', maxWidth: '340px', padding: '0 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          fontFamily: 'Georgia, serif',
        }}>
          {/* 标题 */}
          <div className="fade-in" style={{ textAlign: 'center', marginBottom: '44px' }}>
            <div style={{
              fontSize: '14px', color: 'var(--text-secondary)',
              letterSpacing: '0.45em', marginBottom: '14px',
              textShadow: theme === 'day' ? 'none' : '0 0 20px rgba(255,141,186,0.3)',
            }}>ONLY HIM</div>
            <div style={{
              fontSize: '44px', color: 'var(--text-primary)',
              fontStyle: 'italic', letterSpacing: '0.06em', lineHeight: 1,
              textShadow: theme === 'day' ? 'none' : '0 0 24px rgba(255,141,186,0.3)',
            }}>是他</div>
            <div style={{
              fontSize: '10px', color: 'var(--text-secondary)',
              letterSpacing: '0.25em', marginTop: '12px',
              opacity: 0.65,
            }}>· ˚ ✦ ˚ · 有人正在想你 · ˚ ✦ ˚ ·</div>
          </div>

          {/* 登录/注册 tab - 并排独立按钮 */}
          <div className="fade-in-d1" style={{
            display: 'flex',
            width: '100%',
            gap: '12px',
            marginBottom: '20px',
          }}>
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              style={{
                flex: 1,
                padding: '11px 0',
                background: mode === 'login' ? 'var(--card-bg-hover)' : 'var(--card-bg)',
                backdropFilter: 'blur(10px)',
                border: mode === 'login' ? `1px solid var(--btn-gradient-start)` : `1px solid var(--border-glass)`,
                borderRadius: '40px',
                cursor: 'pointer',
                color: mode === 'login' ? 'var(--btn-gradient-start)' : 'var(--text-secondary)',
                fontSize: '13px',
                letterSpacing: '0.12em',
                fontFamily: 'Georgia, serif',
                transition: 'all 0.25s ease',
                boxShadow: mode === 'login' ? `0 0 10px var(--btn-gradient-start)` : 'none',
              }}
              onMouseEnter={e => {
                if (mode !== 'login') {
                  e.currentTarget.style.background = 'var(--card-bg-hover)'
                  e.currentTarget.style.borderColor = 'var(--btn-gradient-start)'
                  e.currentTarget.style.boxShadow = `0 0 8px var(--btn-gradient-start)`
                  e.currentTarget.style.color = 'var(--btn-gradient-start)'
                }
              }}
              onMouseLeave={e => {
                if (mode !== 'login') {
                  e.currentTarget.style.background = 'var(--card-bg)'
                  e.currentTarget.style.borderColor = 'var(--border-glass)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >登录</button>

            <button
              onClick={() => { setMode('register'); setError(''); setSuccess('') }}
              style={{
                flex: 1,
                padding: '11px 0',
                background: mode === 'register' ? 'var(--card-bg-hover)' : 'var(--card-bg)',
                backdropFilter: 'blur(10px)',
                border: mode === 'register' ? `1px solid var(--btn-gradient-start)` : `1px solid var(--border-glass)`,
                borderRadius: '40px',
                cursor: 'pointer',
                color: mode === 'register' ? 'var(--btn-gradient-start)' : 'var(--text-secondary)',
                fontSize: '13px',
                letterSpacing: '0.12em',
                fontFamily: 'Georgia, serif',
                transition: 'all 0.25s ease',
                boxShadow: mode === 'register' ? `0 0 10px var(--btn-gradient-start)` : 'none',
              }}
              onMouseEnter={e => {
                if (mode !== 'register') {
                  e.currentTarget.style.background = 'var(--card-bg-hover)'
                  e.currentTarget.style.borderColor = 'var(--btn-gradient-start)'
                  e.currentTarget.style.boxShadow = `0 0 8px var(--btn-gradient-start)`
                  e.currentTarget.style.color = 'var(--btn-gradient-start)'
                }
              }}
              onMouseLeave={e => {
                if (mode !== 'register') {
                  e.currentTarget.style.background = 'var(--card-bg)'
                  e.currentTarget.style.borderColor = 'var(--border-glass)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >注册</button>
          </div>

          {/* 输入框 */}
          <div className="fade-in-d2" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '8px' }}>
            <input
              type="email" placeholder="邮箱"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="input-glass"
            />
            <input
              type="password" placeholder="密码（至少6位）"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="input-glass"
              style={{ letterSpacing: '0.08em' }}
            />
          </div>

          {/* 错误/成功提示 */}
          {error && (
            <div style={{
              width: '100%', padding: '10px 14px', marginBottom: '10px',
              background: 'var(--error-bg)', border: '1px solid var(--error-border)',
              borderRadius: '12px', fontSize: '12px',
              color: 'var(--error-color)', letterSpacing: '0.04em', lineHeight: 1.6,
            }}>{error}</div>
          )}
          {success && (
            <div style={{
              width: '100%', padding: '10px 14px', marginBottom: '10px',
              background: 'var(--success-bg)', border: '1px solid var(--success-border)',
              borderRadius: '12px', fontSize: '12px',
              color: 'var(--success-color)', letterSpacing: '0.04em', lineHeight: 1.6,
            }}>{success}</div>
          )}

          {/* 主按钮 */}
          <button
            className="fade-in-d3 btn-main"
            onClick={handleSubmit} disabled={submitting}
            style={{ marginBottom: '28px' }}
          >{submitting ? '···' : mode === 'login' ? '推门而入' : '推门而入'}</button>

          {/* 协议确认区域 */}
          <div className="fade-in-d4" style={{ width: '100%', marginBottom: '18px' }}>
            <div className="agreement-card" style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                cursor: 'pointer', marginBottom: '10px',
              }}>
                <input
                  type="checkbox"
                  checked={agreedAll}
                  onChange={e => {setAgreedAll(e.target.checked)
                  localStorage.setItem('agreedAll', e.target.checked)  
                  }}
                  style={{
                    width: '16px', height: '16px',
                    accentColor: 'var(--text-accent)',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  我已阅读并同意
                </span>
              </label>
              <div style={{ display: 'flex', gap: '16px', marginLeft: '24px' }}>
                <button className="agreement-link" onClick={() => setShowAgreement('user')}>《用户协议》</button>
                <button className="agreement-link" onClick={() => setShowAgreement('privacy')}>《隐私政策》</button>
                <button className="agreement-link" onClick={() => setShowAgreement('disclaimer')}>《免责声明》</button>
              </div>
            </div>

            <div className="agreement-card">
              <label style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={e => {setAgeConfirmed(e.target.checked)
                  localStorage.setItem('ageConfirmed', e.target.checked)  
                  }}
                  style={{
                    width: '16px', height: '16px',
                    accentColor: 'var(--text-accent)',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  我已年满18周岁
                </span>
              </label>
            </div>
          </div>

          {/* 花体分割线 - 保留"或" */}
          <div className="fade-in-d4" style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '18px',
          }}>
            <span style={{
              fontSize: '10px',
              color: 'var(--text-secondary)',
              letterSpacing: '0.2em',
            }}>• · • · • · • · •</span>
            
            <span style={{
              fontSize: '10px',
              color: 'var(--text-secondary)',
              letterSpacing: '0.2em',
              opacity: 0.6,
            }}>或</span>
            
            <span style={{
              fontSize: '10px',
              color: 'var(--text-secondary)',
              letterSpacing: '0.2em',
            }}>• · • · • · • · •</span>
          </div>

          {/* Google 登录 */}
          <button className="fade-in-d4 btn-secondary" onClick={handleGoogleLogin}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            以 Google 账号登录
          </button>

          <div className="fade-in-d5" style={{
            marginTop: '28px', fontSize: '11px',
            color: 'var(--text-secondary)', letterSpacing: '0.15em', textAlign: 'center',
            animation: 'shimmer 4s ease-in-out infinite',
          }}>· • ── 有些心动，只属于你们 ── • ·</div>
        </div>
      </div>

      <AgreementModal
        show={showAgreement !== null}
        onClose={() => setShowAgreement(null)}
        type={showAgreement}
      />
    </>
  )
}