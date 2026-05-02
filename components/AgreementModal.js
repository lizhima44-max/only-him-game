// components/AgreementModal.js
import { USER_AGREEMENT, PRIVACY_POLICY, DISCLAIMER } from '../lib/agreements'

export default function AgreementModal({ show, onClose, type }) {
  if (!show) return null

  const titles = {
    user: '用户协议',
    privacy: '隐私政策',
    disclaimer: '免责声明'
  }

  const contents = {
    user: USER_AGREEMENT,
    privacy: PRIVACY_POLICY,
    disclaimer: DISCLAIMER
  }

  const title = titles[type]
  const content = contents[type]

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '90%', maxWidth: '400px', maxHeight: '80vh',
        background: 'rgba(30,20,35,0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,141,186,0.35)',
        borderRadius: '24px',
        overflow: 'hidden',
        fontFamily: 'Georgia, serif',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 20px rgba(255,141,186,0.2)',
      }}>
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid rgba(255,141,186,0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(255,255,255,0.05)',
        }}>
          <div style={{ fontSize: '16px', color: '#FFB8C5', letterSpacing: '0.1em' }}>{title}</div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '18px',
            cursor: 'pointer',
            width: '28px',
            height: '28px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,141,186,0.3)'; e.currentTarget.style.color = '#FFB8C5' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
          >✕</button>
        </div>
        <div style={{
          padding: '20px', overflowY: 'auto', maxHeight: '55vh',
          fontSize: '12px', color: 'rgba(220,220,240,0.85)', lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
        }}>
          {content}
        </div>
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,141,186,0.15)' }}>
          <button onClick={onClose} style={{
            width: '100%', padding: '12px',
            background: 'rgba(255,141,186,0.15)',
            border: '1px solid rgba(255,141,186,0.35)',
            borderRadius: '40px',
            color: '#FFB8C5',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: 'Georgia, serif',
            letterSpacing: '0.1em',
            transition: 'all 0.25s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,141,186,0.3)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(255,141,186,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,141,186,0.15)'; e.currentTarget.style.boxShadow = 'none' }}
          >我已知晓</button>
        </div>
      </div>
    </div>
  )
}