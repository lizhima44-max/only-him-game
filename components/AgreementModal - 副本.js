// components/AgreementModal.js
import { useState } from 'react'
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
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '90%', maxWidth: '400px', maxHeight: '80vh',
        background: 'rgba(10,7,4,0.98)',
        border: '1px solid rgba(201,169,110,0.2)',
        borderRadius: '20px',
        overflow: 'hidden',
        fontFamily: 'Georgia, serif',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(201,169,110,0.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: '16px', color: '#c9a96e' }}>{title}</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.4)', fontSize: '20px', cursor: 'pointer',
          }}>✕</button>
        </div>
        <div style={{
          padding: '20px', overflowY: 'auto', maxHeight: '60vh',
          fontSize: '12px', color: 'rgba(220,235,255,0.7)', lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
        }}>
          {content}
        </div>
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(201,169,110,0.1)' }}>
          <button onClick={onClose} style={{
            width: '100%', padding: '10px',
            background: 'rgba(201,169,110,0.1)',
            border: '1px solid rgba(201,169,110,0.2)',
            borderRadius: '10px',
            color: '#c9a96e', fontSize: '12px', cursor: 'pointer',
            fontFamily: 'Georgia, serif',
          }}>我已知晓</button>
        </div>
      </div>
    </div>
  )
}