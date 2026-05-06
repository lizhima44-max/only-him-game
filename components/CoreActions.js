export default function CoreActions({ onNiwai, onPrank, onRoomAction, expandedAction, showRoomPanel }) {
  return (
    <div className="core-actions">
      <button className={`core-btn ${expandedAction === 'niwai' ? 'active' : ''}`} onClick={onNiwai}>
        🤗 腻歪
      </button>
      <button className={`core-btn ${expandedAction === 'prank' ? 'active' : ''}`} onClick={onPrank}>
        😈 恶作剧
      </button>
      <button className={`core-btn ${showRoomPanel ? 'active' : ''}`} onClick={onRoomAction}>
        💫 做点什么
      </button>
    </div>
  )
}