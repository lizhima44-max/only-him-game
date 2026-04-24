import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 已登录直接进游戏
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/game')
      else setLoading(false)
    })
  }, [])

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/game`
      }
    })
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0c09',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#c9a96e',
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
    }}>···</div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0c09',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Georgia, serif',
      padding: '20px',
    }}>
      {/* 标题 */}
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <div style={{
          fontSize: '11px',
          color: '#6a5a40',
          letterSpacing: '0.3em',
          marginBottom: '12px',
        }}>ONLY HIM</div>
        <div style={{
          fontSize: '42px',
          color: '#c9a96e',
          fontWeight: 'bold',
          fontStyle: 'italic',
          lineHeight: 1,
        }}>是他</div>
        <div style={{
          fontSize: '11px',
          color: '#4a3a28',
          letterSpacing: '0.2em',
          marginTop: '12px',
        }}>— 公馆 · 民国 —</div>
      </div>

      {/* 登录按钮 */}
      <button
        onClick={handleLogin}
        style={{
          background: 'transparent',
          border: '1px solid #c9a96e',
          color: '#c9a96e',
          padding: '14px 48px',
          fontSize: '14px',
          letterSpacing: '0.2em',
          cursor: 'pointer',
          fontFamily: 'Georgia, serif',
        }}
      >
        持牌入内
      </button>

      <div style={{
        marginTop: '16px',
        fontSize: '11px',
        color: '#3a2a18',
        letterSpacing: '0.1em',
      }}>以 Google 账号登录</div>
    </div>
  )
}
