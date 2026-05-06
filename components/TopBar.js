// components/TopBar.js
export default function TopBar({ 
  characterName, 
  intimacy, 
  coins, 
  locationState, 
  onToggleLocation, 
  onMenuClick,
  avatarUrl,
  intimacyLevel,      // 新增：好感度等级，如 "Lv.5"
  intimacyStage,      // 新增：阶段名，如 "热恋期"
  daysTogether        // 新增：陪伴天数
}) {
  return (
    <div className="top-bar">
      <div className="top-bar-left">
        {avatarUrl && <img src={avatarUrl} alt="头像" className="avatar-small" />}
        <div className="character-name">{characterName}</div>
        <div className="intimacy-level">
          {intimacyLevel} · {intimacyStage}
        </div>
        <div className="days-together">
          📅 相伴 {daysTogether}天
        </div>
        <div className="coins">💰{coins}</div>
      </div>
      <div className="top-bar-right">
        {/* 位置切换按钮和菜单按钮保持不变 */}
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