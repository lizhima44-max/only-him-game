// lib/gameConstants.js

export const ROOMS = [
  { id: 'living_room', name: '客厅', icon: '📺', unlockAt: 0, luCanFreely: true, playerKnock: false },
  { id: 'kitchen', name: '厨房', icon: '🍳', unlockAt: 0, luCanFreely: true, playerKnock: false },
  { id: 'study', name: '书房', icon: '📚', unlockAt: 0, luCanFreely: true, playerKnock: false },
  { id: 'balcony', name: '阳台', icon: '🌿', unlockAt: 0, luCanFreely: true, playerKnock: false },
  { id: 'guest_room', name: '客房', icon: '🛏️', unlockAt: 0, luCanFreely: true, playerKnock: true },
  { id: 'bathroom', name: '卫浴', icon: '🛁', unlockAt: 0, luCanFreely: true, playerKnock: false },
  { id: 'bedroom', name: '卧室', icon: '🌙', unlockAt: 70, luCanFreely: false, playerKnock: false },
]

export const OUTSIDE_PLACES = [
  { id: 'park', name: '公园', icon: '🌳', desc: '散步晒太阳' },
  { id: 'cinema', name: '电影院', icon: '🎬', desc: '看场电影' },
  { id: 'mall', name: '商场', icon: '🛍️', desc: '逛逛买买' },
  { id: 'supermarket', name: '超市', icon: '🛒', desc: '采购囤货' },
  { id: 'seaside', name: '海边', icon: '🌊', desc: '吹风发呆' },
  { id: 'cafe', name: '咖啡馆', icon: '☕', desc: '坐坐喝杯' },
]

// 场景背景图映射（保留原来的）
export const SCENE_IMAGES = {
  living_room: '/assets/scenes/living_room.png',
  kitchen: '/assets/scenes/kitchen.png',
  study: '/assets/scenes/study_room.png',
  balcony: '/assets/scenes/balcony.png',
  guest_room: '/assets/scenes/guest_room.png',
  bathroom: '/assets/scenes/bathroom.png',
  bedroom: '/assets/scenes/bedroom.png',
}

export const SCENE_FALLBACK = {
  living_room: '#1e1a14', kitchen: '#1a1a10', study: '#0f1a14',
  balcony: '#101820', guest_room: '#1a1614', bathroom: '#141a1a',
  bedroom: '#1a1018', outside: '#0f1018',
}