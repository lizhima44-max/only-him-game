// components/SideMenu.js
import { useEffect, useState } from 'react'

export default function SideMenu({ 
  show, 
  onClose, 
  onSettings, 
  onLogout,
  onMemories,
  onGarden,
  onPet,
  onFridge,
  onWardrobe,
  onShop,
  onSupermarket,
  onBedside,
  onCalendar,
  onChangeAvatar,
  onFavorites,    // 👈 检查这一行有没有
  onContact,
  intimacy,
  characterName,
  intimacyLevel,
  intimacyStage,
  daysTogether,
  avatarUrl              // 👈 新增
}) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setIsOpen(show)
  }, [show])

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(() => onClose(), 300)
  }

  if (!show && !isOpen) return null

  return (
    <>
      <div
        className="menu-overlay"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        onClick={handleClose}
      />
      <div className="side-menu" style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}>
        <div className="menu-header">
          <span>✨ 主菜单</span>
          <button className="menu-close" onClick={handleClose}>✕</button>
        </div>

        {/* 用户信息区 */}
        <div className="user-info">
          <div className="avatar-large" onClick={onChangeAvatar}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="头像" />
            ) : (
              <span>🖼️</span>
            )}
          </div>
          <div className="user-details">
            <div className="user-name">{characterName}</div>
            <div className="user-level">{intimacyLevel} · {intimacyStage} ({intimacy})/100</div>
            <div className="user-days"> 相伴 {daysTogether}天</div>
            <button className="edit-profile" onClick={onChangeAvatar}>✎ 编辑</button>
          </div>
        </div>

        <div className="menu-divider" />

        <div className="menu-section">主要功能</div>
        <button className="menu-item" onClick={onSettings}><span>⚙️</span> AI模型设置</button>
        <button className="menu-item" onClick={onMemories}><span>📖</span> 重要回忆</button>
        <button className="menu-item" onClick={onFavorites}><span>📝</span> 我的收藏</button>
        <button className="menu-item" onClick={onCalendar}><span>🩸</span> 生理期日历</button>

        <div className="menu-divider" />

        <div className="menu-section">外观</div>
        <button className="menu-item" onClick={() => alert('皮肤主题 开发中')}><span>🎨</span> 皮肤主题</button>
        <button className="menu-item" onClick={onChangeAvatar}><span>🖼️</span> 更换头像</button>

        <div className="menu-divider" />

        <div className="menu-section">其他</div>
        <button className="menu-item" onClick={onContact}><span>📧</span> 联系我们</button>
        <button className="menu-item" onClick={onLogout}><span>🚪</span> 退出登录</button>
      </div>

      <style jsx>{`
        .menu-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          transition: opacity 0.3s ease;
        }
        .side-menu {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 280px;
          z-index: 210;
          background: var(--panel-bg, rgba(27,10,31,0.98));
          backdrop-filter: blur(20px);
          border-left: 1px solid var(--text-accent, #F88DA7);
          display: flex;
          flex-direction: column;
          font-family: 'Georgia', serif;
          box-shadow: -4px 0 24px rgba(0,0,0,0.3);
          overflow-y: auto;
          transition: transform 0.3s ease;
        }
        .menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 20px 12px;
          border-bottom: 1px solid rgba(248,141,167,0.2);
          color: var(--text-accent, #F88DA7);
          font-size: 16px;
          letter-spacing: 0.1em;
        }
        .menu-close {
          background: none;
          border: none;
          color: rgba(248,141,167,0.6);
          font-size: 20px;
          cursor: pointer;
        }
        .user-info {
          display: flex;
          gap: 16px;
          padding: 20px;
          background: rgba(248,141,167,0.05);
          border-bottom: 1px solid rgba(248,141,167,0.1);
        }
        .avatar-large {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(248,141,167,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          cursor: pointer;
          transition: 0.2s;
          overflow: hidden;
        }
        .avatar-large img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .avatar-large:hover {
          background: rgba(248,141,167,0.4);
        }
        .user-details {
          flex: 1;
        }
        .user-name {
          font-size: 16px;
          font-weight: bold;
          color: var(--text-primary);
        }
        .user-level {
          font-size: 11px;
          color: var(--text-accent);
          margin: 4px 0;
        }
        .user-days {
          font-size: 10px;
          color: var(--text-secondary);
        }
        .edit-profile {
          background: none;
          border: none;
          font-size: 11px;
          color: var(--text-accent);
          cursor: pointer;
          margin-top: 6px;
          padding: 0;
          text-decoration: underline;
        }
        .menu-divider {
          height: 1px;
          background: rgba(248,141,167,0.1);
          margin: 12px 20px;
        }
        .menu-section {
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--text-secondary);
          margin: 8px 20px 4px;
        }
        .menu-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 20px;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          color: var(--text-primary);
          font-size: 14px;
          cursor: pointer;
          transition: 0.2s;
        }
        .menu-item:hover {
          background: rgba(248,141,167,0.1);
          color: var(--text-accent);
        }
        .menu-item span:first-child {
          font-size: 18px;
          width: 28px;
        }
      `}</style>
    </>
  )
}