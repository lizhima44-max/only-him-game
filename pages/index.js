import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/lobby')
      else setLoading(false)
    })
  }, [])

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/lobby` }
    })
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#02010a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(180,220,255,0.5)', fontFamily: 'Georgia, serif', fontSize: '14px',
    }}>···</div>
  )

  return (
    <div style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Georgia, serif',
    }}>
      {/* 背景图 */}
      <img src="/assets/lobby/lobby_bg.png" alt="" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', objectPosition: 'center',
        zIndex: 0, pointerEvents: 'none',
      }} />
      {/* 遮罩——让文字更清晰 */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(to bottom, rgba(2,1,12,0.25) 0%, rgba(2,1,12,0.55) 100%)',
      }} />

      {/* 内容 */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '20px' }}>
        <div style={{
          fontSize: '10px', color: 'rgba(180,220,255,0.6)',
          letterSpacing: '0.45em', marginBottom: '16px',
        }}>ONLY HIM</div>

        <div style={{
          fontSize: '48px', color: 'rgba(220,235,255,0.98)',
          fontStyle: 'italic', letterSpacing: '0.08em',
          lineHeight: 1, marginBottom: '12px',
          textShadow: '0 0 40px rgba(100,160,255,0.5), 0 2px 20px rgba(0,0,0,0.8)',
        }}>是他</div>

        <div style={{
          fontSize: '10px', color: 'rgba(160,210,255,0.5)',
          letterSpacing: '0.25em', marginBottom: '64px',
        }}>选择你的故事</div>

        <button onClick={handleLogin} style={{
          background: 'rgba(20,35,80,0.45)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(120,180,255,0.35)',
          color: 'rgba(180,220,255,0.9)',
          padding: '14px 52px',
          fontSize: '13px',
          letterSpacing: '0.25em',
          cursor: 'pointer',
          fontFamily: 'Georgia, serif',
          borderRadius: '40px',
          boxShadow: '0 0 24px rgba(60,120,255,0.2)',
          textShadow: '0 0 12px rgba(100,180,255,0.6)',
          transition: 'all 0.3s',
        }}>持牌入内</button>

        <div style={{
          marginTop: '14px', fontSize: '10px',
          color: 'rgba(120,170,255,0.3)', letterSpacing: '0.1em',
        }}>以 Google 账号登录</div>
      </div>
    </div>
  )
}
