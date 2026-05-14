// components/TopBar.js
import { useState } from 'react'

export default function TopBar({ 
  characterName, 
  intimacy, 
  coins, 
  locationState, 
  onToggleLocation, 
  onMenuClick,
  avatarUrl,
  intimacyStage,
  daysTogether,
  romantic,
  onRomanticClick     // 新增：点击浪漫值时调用的函数
}) {
  // 根据浪漫值返回文案
  const getRomanticText = (value) => {
    if (value >= 81) return '🔥 今夜难眠'
    if (value >= 51) return '💕 暧昧升温'
    if (value >= 21) return '🌸 有点心动'
    return '🍃 平平淡淡'
  }

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        {avatarUrl && <img src={avatarUrl} alt="头像" className="avatar-small" />}
        <div className="character-name">{characterName}</div>
        <div className="intimacy-level">
          {intimacyStage}
        </div>
        <div className="days-together">
           相伴 {daysTogether}天
        </div>
        <div className="coins">💰{coins}</div>
      </div>
      <div className="top-bar-right">
        {/* 浪漫值 - 点击显示氛围文案 */}
        <div 
          className="romantic-value"
          onClick={() => onRomanticClick && onRomanticClick(getRomanticText(romantic))}
          style={{ 
            fontSize: '11px', 
            color: '#ffb8c5', 
            marginRight: '8px',
            cursor: 'pointer'
          }}
        >
          ❤️ {romantic}
        </div>

        <button className="location-toggle" onClick={onToggleLocation}>
          <span className="toggle-icon">{locationState === 'home' ? '🏠' : '🏠'}</span>
          <span className="toggle-text">{locationState === 'home' ? '在家里' : '回家吧'}</span>
          <span className="toggle-sep">✦</span>
          <span className="toggle-text">{locationState === 'home' ? '出门去' : '在外面'}</span>
          <span className="toggle-icon">{locationState === 'home' ? '🌸' : '🌸'}</span>
        </button>
        <button className="menu-btn" onClick={onMenuClick}>≡</button>
      </div>
    </div>
  )
}