import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [mode, setMode] = useState('entry') // entry | email_login | email_register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/game')
      else setChecking(false)
    })
  }, [])

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/game` }
    })
  }

  async function handleEmailLogin() {
    if (!email || !password) { setError('请填写邮箱和密码'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message.includes('Invalid') ? '邮箱或密码错误' : error.message)
    } else {
      router.push('/game')
    }
    setLoading(false)
  }

  async function handleEmailRegister() {
    if (!email || !password) { setError('请填写邮箱和密码'); return }
    if (password.length < 6) { setError('密码至少6位'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/game` }
    })
    if (error) {
      setError(error.message)
    } else {
      setEmailSent(true)
    }
    setLoading(false)
  }

  if (checking) return (
    <div style={{
      minHeight: '100vh', background: '#0f0c09',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(201,169,110,0.4)', fontFamily: 'Georgia, serif', fontSize: '18px',
      letterSpacing: '0.3em',
    }}>···</div>
  )

  const inputStyle = {
    width: '100%', background: 'rgba(20,16,12,0.8)',
    border: '1px solid rgba(201,169,110,0.15)',
    borderRadius: '4px', padding: '12px 16px',
    color: '#e8dcc8', fontSize: '14px', outline: 'none',
    fontFamily: 'Georgia, serif', letterSpacing: '0.05em',
    boxSizing: 'border-box',
  }

  const btnPrimary = {
    width: '100%', background: 'transparent',
    border: '1px solid rgba(201,169,110,0.5)',
    color: '#c9a96e', padding: '12px',
    fontSize: '13px', letterSpacing: '0.15em',
    cursor: loading ? 'default' : 'pointer',
    fontFamily: 'Georgia, serif',
    opacity: loading ? 0.5 : 1,
    borderRadius: '4px',
  }

  const btnGhost = {
    background: 'none', border: 'none',
    color: 'rgba(201,169,110,0.35)', fontSize: '11px',
    cursor: 'pointer', fontFamily: 'Georgia, serif',
    letterSpacing: '0.1em', padding: '4px 0',
    textDecoration: 'underline', textUnderlineOffset: '3px',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0f0c09',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Georgia, serif', padding: '20px',
    }}>
      {/* 标题 */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(201,169,110,0.3)', letterSpacing: '0.35em', marginBottom: '14px' }}>
          ONLY HIM
        </div>
        <div style={{ fontSize: '44px', color: '#c9a96e', fontWeight: 'bold', fontStyle: 'italic', lineHeight: 1 }}>
          是他
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(201,169,110,0.2)', letterSpacing: '0.2em', marginTop: '12px' }}>
          — 公馆 · 民国 —
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* 入口页 */}
        {mode === 'entry' && (
          <>
            <button onClick={handleGoogle} style={btnPrimary}>
              以 Google 账号进入
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,110,0.08)' }} />
              <span style={{ fontSize: '10px', color: 'rgba(201,169,110,0.2)', letterSpacing: '0.1em' }}>或</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,110,0.08)' }} />
            </div>
            <button onClick={() => { setMode('email_login'); setError('') }} style={btnPrimary}>
              邮箱登录
            </button>
            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button onClick={() => { setMode('email_register'); setError('') }} style={btnGhost}>
                没有账号？注册
              </button>
            </div>
          </>
        )}

        {/* 邮箱登录 */}
        {mode === 'email_login' && (
          <>
            <input
              type="email" placeholder="邮箱" value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password" placeholder="密码" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
              style={inputStyle}
            />
            {error && <div style={{ fontSize: '11px', color: 'rgba(200,80,80,0.8)', textAlign: 'center' }}>{error}</div>}
            <button onClick={handleEmailLogin} disabled={loading} style={btnPrimary}>
              {loading ? '···' : '进入'}
            </button>
            <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button onClick={() => { setMode('entry'); setError('') }} style={btnGhost}>返回</button>
              <button onClick={() => { setMode('email_register'); setError('') }} style={btnGhost}>没有账号？</button>
            </div>
          </>
        )}

        {/* 邮箱注册 */}
        {mode === 'email_register' && !emailSent && (
          <>
            <input
              type="email" placeholder="邮箱" value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password" placeholder="密码（至少6位）" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmailRegister()}
              style={inputStyle}
            />
            {error && <div style={{ fontSize: '11px', color: 'rgba(200,80,80,0.8)', textAlign: 'center' }}>{error}</div>}
            <button onClick={handleEmailRegister} disabled={loading} style={btnPrimary}>
              {loading ? '···' : '注册'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => { setMode('email_login'); setError('') }} style={btnGhost}>已有账号？登录</button>
            </div>
          </>
        )}

        {/* 注册成功 */}
        {emailSent && (
          <div style={{ textAlign: 'center', color: 'rgba(201,169,110,0.5)', fontSize: '13px', lineHeight: 1.8, letterSpacing: '0.05em' }}>
            验证邮件已发送<br />
            <span style={{ fontSize: '11px', color: 'rgba(201,169,110,0.3)' }}>请查收邮箱后点击链接进入</span>
          </div>
        )}

      </div>
    </div>
  )
}
