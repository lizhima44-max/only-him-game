import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function Game() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/')
      else setUser(session.user)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!user) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0c09',
      color: '#c9a96e',
      fontFamily: 'Georgia, serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '20px',
    }}>
      <div>登录成功！{user.email}</div>
      <button onClick={handleLogout} style={{
        background: 'transparent',
        border: '1px solid #6a5a40',
        color: '#6a5a40',
        padding: '8px 24px',
        cursor: 'pointer',
        fontFamily: 'Georgia, serif',
      }}>退出</button>
    </div>
  )
}
