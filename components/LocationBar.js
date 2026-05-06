// components/LocationBar.js
export default function LocationBar({ 
  locationState, 
  rooms, 
  places, 
  currentRoomId, 
  currentPlaceId, 
  onSelectRoom, 
  onSelectPlace 
}) {
  const items = locationState === 'home' ? rooms : places
  return (
    <div className="location-bar">
      {items.map(item => {
        const isActive = locationState === 'home' 
          ? (item.id === currentRoomId)
          : (item.id === currentPlaceId)
        return (
          <button
            key={item.id}
            className={`location-btn ${isActive ? 'active' : ''}`}
            onClick={() => locationState === 'home' ? onSelectRoom(item.id) : onSelectPlace(item.id)}
          >
            {item.icon} {item.name}
          </button>
        )
      })}
    </div>
  )
}