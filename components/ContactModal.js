// components/ContactModal.js
export default function ContactModal({ show, onClose }) {
  if (!show) return null
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '90%', maxWidth: '400px',
        background: 'var(--panel-bg, #1B0A1F)',
        border: '1px solid var(--text-accent, #F88DA7)',
        borderRadius: '24px', padding: '24px',
        fontFamily: 'Georgia, serif',
      }}>
        <h3 style={{ color: 'var(--text-accent)', marginBottom: '16px' }}>联系我们</h3>
        <textarea
          rows={5}
          placeholder="请写下你的问题或建议..."
          style={{
            width: '100%', padding: '12px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px', color: 'var(--text-primary)',
            fontFamily: 'Georgia, serif', resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button onClick={() => alert('邮件发送功能稍后接入')} style={{
            flex: 1, padding: '10px',
            background: 'rgba(248,141,167,0.2)',
            border: '1px solid var(--text-accent)',
            borderRadius: '30px', color: 'var(--text-accent)',
            cursor: 'pointer',
          }}>发送</button>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px',
            background: 'transparent',
            border: '1px solid var(--border-glass)',
            borderRadius: '30px', color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}>取消</button>
        </div>
      </div>
    </div>
  )
}