import { useEffect, useRef, useState } from 'react'
//import { supabase } from '../lib/supabase.js'
// 替换原来的 import
// import { supabase } from '../lib/supabase'

// 临时直接创建
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://kgikfiifulazucttmiub.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnaWtmaWlmdWxhenVjdHRtaXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjUwMzksImV4cCI6MjA5MjU0MTAzOX0.o-Oc7ug5rf7FwQTCnEGprBfzTS0qIFqlPq6-vEoKTtU'
)
import { useRouter } from 'next/router'
import { loadApiConfig } from '../lib/apiClient'
import SettingsPanel from '../components/SettingsPanel'
import CharacterCreator from '../components/CharacterCreator'
import { listCustomCharacters, deleteCustomCharacter, saveCustomCharacter } from '../lib/characterImport'

// ═══════════════════════════════════════════════════════════
//  预设角色（陆绍桓 + 敬请期待占位卡）
// ═══════════════════════════════════════════════════════════
const DEFAULT_CHARACTERS = [
  {
    id: 'lu',
    name: '陆绍桓',
    en: 'LU SHAOHUAN · Lucas Lu',
    tag: '民国 · 借住者 · 大少爷',
    desc: '留洋归来的民国大少爷，因某种说不清的牵引穿越来到了你所在的现代。以"借住"为由住在你家客房，连他自己都不知道为什么不走。',
    tags: ['表面冷漠', '占有欲强', '傲娇', '克制温柔', '死要面子'],
    cardImg: '/assets/characters/lu_card.png',
    isPlaceholder: false,
    theme: {
      primary: '248,141,167',
      accent: '255,184,197',
      glow: 'rgba(248,141,167,0.45)',
      cardBg: 'linear-gradient(160deg, #2a1a2e 0%, #1a0f1e 60%, #1f1225 100%)',
      borderActive: 'rgba(248,141,167,0.5)',
      btnBg: 'linear-gradient(135deg, rgba(248,141,167,0.25), rgba(220,100,140,0.35))',
      btnBorder: 'rgba(248,141,167,0.35)',
      btnColor: 'rgba(255,220,230,0.9)',
      btnShadow: '0 0 20px rgba(248,141,167,0.25)',
      tagBorder: 'rgba(248,141,167,0.2)',
      tagColor: 'rgba(248,141,167,0.5)',
    },
  },
  {
    id: 'coming_1',
    name: '···',
    en: '',
    tag: '敬请期待',
    desc: '神秘角色，即将登场',
    tags: [],
    cardImg: null,
    isPlaceholder: true,
    glowColor: 'rgba(248,141,167,0.3)',
  },
]

export default function Lobby() {
  const router = useRouter()
  const trackRef = useRef(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [selectedChar, setSelectedChar] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showCreator, setShowCreator] = useState(false)
  const [customChars, setCustomChars] = useState([])
  const [userId, setUserId] = useState(null)
  const [allCards, setAllCards] = useState([])

  // 主题模式
  const [theme, setTheme] = useState('day')

  // 鼠标拖拽滑动
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  // 根据系统时间设置主题
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 18) {
      setTheme('day')
    } else {
      setTheme('night')
    }
  }, [])

  // 构建卡片列表：预设卡 + 占位卡 + 入口卡 + 自定义卡
  const buildCards = (customList) => {
    const customCards = customList.map(char => ({
      id: char.id,
      name: char.name,
      tag: char.tagline || '自定义角色',
      desc: char.characterData?.background || '一个特别的他',
      tags: char.tags || [],
      cardImg: char.characterData?.images?.default || null,
      isCustom: true,
      customData: char.characterData,
      theme: {
        primary: '248,141,167',
        accent: '255,184,197',
        glow: 'rgba(248,141,167,0.35)',
        cardBg: 'linear-gradient(160deg, #2a1a2e 0%, #1a0f1e 60%, #1f1225 100%)',
        borderActive: 'rgba(248,141,167,0.4)',
        btnBg: 'linear-gradient(135deg, rgba(248,141,167,0.25), rgba(220,100,140,0.35))',
        btnBorder: 'rgba(248,141,167,0.35)',
        btnColor: 'rgba(255,220,230,0.9)',
        tagBorder: 'rgba(248,141,167,0.2)',
        tagColor: 'rgba(248,141,167,0.5)',
      }
    }))
    
    return [
      ...DEFAULT_CHARACTERS,
      ...customCards,
      { id: 'custom_entry', isCustomEntry: true, name: '与他重逢', tag: '创造或导入你的故事', desc: '创造属于你的独特角色，开启专属故事' }
    ]
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/')
      else setUserId(session.user.id)
    })
  }, [])

  const loadCustomChars = async () => {
    if (!userId) return
    const chars = await listCustomCharacters(supabase, userId)
    setCustomChars(chars)
    const cards = buildCards(chars)
    setAllCards(cards)
    const firstRealChar = cards.find(c => !c.isPlaceholder && !c.isCustomEntry)
    if (firstRealChar) setSelectedChar(firstRealChar)
  }

  useEffect(() => {
    if (userId) loadCustomChars()
  }, [userId])

  // 滚动检测高亮中间卡片
  useEffect(() => {
    const track = trackRef.current
    if (!track || allCards.length === 0) return
    
    function onScroll() {
      const rect = track.getBoundingClientRect()
      const center = rect.left + rect.width / 2
      let closest = 0, minDist = Infinity
      const children = Array.from(track.children)
      
      children.forEach((el, i) => {
        const r = el.getBoundingClientRect()
        const dist = Math.abs(r.left + r.width / 2 - center)
        if (dist < minDist) { minDist = dist; closest = i }
      })
      
      setActiveIdx(closest)
      const newSelectedCard = allCards[closest]
      if (newSelectedCard) setSelectedChar(newSelectedCard)
    }
    
    track.addEventListener('scroll', onScroll, { passive: true })
    setTimeout(onScroll, 100)
    return () => track.removeEventListener('scroll', onScroll)
  }, [allCards])

  // 鼠标拖拽滑动
  const handleMouseDown = (e) => {
    setIsDragging(true)
    setStartX(e.pageX - trackRef.current.offsetLeft)
    setScrollLeft(trackRef.current.scrollLeft)
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    e.preventDefault()
    const x = e.pageX - trackRef.current.offsetLeft
    const walk = (x - startX) * 1.5
    trackRef.current.scrollLeft = scrollLeft - walk
  }

  const handleMouseUp = () => setIsDragging(false)

  function handleSelectCustomFromEntry(char) {
    setSelectedChar(char)
    const track = trackRef.current
    const cardIndex = allCards.findIndex(c => c.id === char.id)
    if (track && cardIndex !== -1) {
      const cardEl = track.children[cardIndex]
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      }
    }
  }

  async function handleDeleteCustom(charId, e) {
    e.stopPropagation()
    if (confirm('确定要删除这个角色吗？')) {
      await deleteCustomCharacter(supabase, userId, charId)
      loadCustomChars()
    }
  }

  async function handleEnter() {
    const cfg = loadApiConfig()
    if (!cfg?.apiKey) {
      setShowSettings(true)
      return
    }
    
    let finalSelectedChar = selectedChar
    if (selectedChar?.isCustomEntry) return
    
    if (selectedChar?.isCustom && selectedChar.customData) {
      const storedNickname = localStorage.getItem(`nickname_${selectedChar.id}`)
      
      if (!storedNickname) {
        const currentNickname = selectedChar.customData.playerNickname || '你'
        const newNickname = prompt(`他应该怎么称呼你？\n\n当前：${currentNickname}\n\n（可以修改，比如：你、她、姐姐、宝贝...）`, currentNickname)
        
        if (newNickname !== null && newNickname.trim()) {
          localStorage.setItem(`nickname_${selectedChar.id}`, newNickname)
          finalSelectedChar = {
            ...selectedChar,
            customData: {
              ...selectedChar.customData,
              playerNickname: newNickname,              
            }
          }
          if (finalSelectedChar.customData.customId) {
            await saveCustomCharacter(supabase, userId, finalSelectedChar.customData)
          }
        } else {
          return
        }
      } else {
        finalSelectedChar = {
          ...selectedChar,
          customData: {
            ...selectedChar.customData,
            playerNickname: storedNickname,
          }
        }
      }
    }
    
    if (finalSelectedChar?.theme) {
      if (finalSelectedChar.isCustom) {
        localStorage.setItem('selectedCharId', 'custom')
        localStorage.setItem('selectedCustomCharId', finalSelectedChar.id)
        if (finalSelectedChar.customData?.playerNickname) {
          localStorage.setItem(`playerNickname_${finalSelectedChar.id}`, finalSelectedChar.customData.playerNickname)
        }
      } else {
        localStorage.setItem('selectedCharId', finalSelectedChar.id)
        localStorage.removeItem('selectedCustomCharId')
      }
      localStorage.setItem('selectedCharTheme', JSON.stringify(finalSelectedChar.theme))
    }
    
    router.push('/game')
  }

  // 渲染单张卡片
  const renderCard = (char, idx) => {
    const isActive = activeIdx === idx
    const isPlaceholder = char.isPlaceholder
    const isCustomEntry = char.isCustomEntry
    const themeColor = char.theme
    const glowColor = themeColor?.glow || char.glowColor || 'rgba(248,141,167,0.2)'

    let cardStyle = {
      flexShrink: 0,
      scrollSnapAlign: 'center',
      cursor: isPlaceholder ? 'default' : 'pointer',
      borderRadius: '20px',
      overflow: 'hidden',
      transition: 'all 0.4s cubic-bezier(0.34,1.4,0.64,1)',
      position: 'relative',
      width: isActive ? '185px' : '138px',
      height: isActive ? '295px' : '215px',
      opacity: isActive ? 1 : 0.45,
      transform: isActive ? 'scale(1)' : 'scale(0.86)',
      boxShadow: isActive ? `0 0 25px ${glowColor}, 0 0 50px ${glowColor}` : 'none',
    }

    if (isPlaceholder) {
      cardStyle = {
        ...cardStyle,
        background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(18px)',
        border: isActive ? '1px solid rgba(248,141,167,0.3)' : '1px solid rgba(248,141,167,0.08)',
      }
    } else if (isCustomEntry) {
      cardStyle = {
        ...cardStyle,
        background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(18px)',
        border: isActive ? '1px solid rgba(248,141,167,0.35)' : '1px dashed rgba(248,141,167,0.1)',
      }
    } else {
      cardStyle = {
        ...cardStyle,
        background: themeColor?.cardBg || 'linear-gradient(160deg, #2a1a2e 0%, #1a0f1e 60%, #1f1225 100%)',
        border: isActive ? `1px solid ${themeColor?.borderActive || 'rgba(248,141,167,0.5)'}` : '1px solid rgba(248,141,167,0.12)',
      }
    }

    return (
      <div key={char.id} style={cardStyle}>
        {/* 占位卡片 */}
        {isPlaceholder && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '20px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              border: isActive ? '1px solid rgba(248,141,167,0.4)' : '1px solid rgba(248,141,167,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
              color: isActive ? 'rgba(248,141,167,0.7)' : 'rgba(248,141,167,0.2)',
            }}>✦</div>
            <div style={{
              fontSize: isActive ? '12px' : '10px',
              color: isActive ? 'rgba(248,141,167,0.8)' : 'rgba(248,141,167,0.18)',
              textAlign: 'center', lineHeight: 2,
            }}>
              敬请期待<br />
              <span style={{ fontSize: '9px', opacity: 0.65 }}>COMING SOON</span>
            </div>
          </div>
        )}

        {/* 与他重逢入口卡片 */}
        {!isPlaceholder && isCustomEntry && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '20px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              border: isActive ? '1px solid rgba(248,141,167,0.5)' : '1px solid rgba(248,141,167,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px',
              color: isActive ? 'rgba(248,141,167,0.8)' : 'rgba(248,141,167,0.18)',
            }}>+</div>
            <div style={{
              fontSize: isActive ? '13px' : '11px',
              color: isActive ? 'rgba(248,141,167,0.85)' : 'rgba(248,141,167,0.2)',
              textAlign: 'center', lineHeight: 1.9,
            }}>
              {char.name}<br />
              <span style={{ fontSize: '10px', opacity: 0.65 }}>{char.tag}</span>
            </div>
          </div>
        )}

        {/* 正常角色卡片 */}
        {!isPlaceholder && !isCustomEntry && (
          <>
            <div style={{ position: 'absolute', inset: 0, background: char.theme?.cardBg }}>
              {char.cardImg && (
                <img src={char.cardImg} alt={char.name} style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover', objectPosition: 'center 8%',
                }} />
              )}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '42%',
                background: 'linear-gradient(to top, rgba(26,15,30,0.98) 0%, rgba(26,15,30,0.6) 55%, transparent 100%)',
              }} />
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '22%',
                background: 'linear-gradient(to bottom, rgba(26,15,30,0.28), transparent)',
              }} />
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px 16px', zIndex: 3 }}>
              <div style={{
                fontSize: '16px', color: 'rgba(255,220,230,0.95)',
                letterSpacing: '0.06em', marginBottom: '5px',
                textShadow: isActive && char.theme ? `0 0 14px rgba(${char.theme.accent},0.7)` : 'none',
              }}>{char.name}</div>
              <div style={{
                fontSize: '9px',
                color: isActive && char.theme ? `rgba(${char.theme.accent},0.6)` : 'rgba(248,141,167,0.28)',
                letterSpacing: '0.1em',
              }}>{char.tag}</div>
            </div>
          </>
        )}
      </div>
    )
  }

  // 渲染底部详情面板
  const renderBottomPanel = () => {
    if (!selectedChar) return null

    if (selectedChar.isPlaceholder) {
      return (
        <div style={{
          padding: '24px 20px 40px',
          textAlign: 'center',
          background: theme === 'day' 
            ? 'linear-gradient(to top, rgba(249,245,242,0.95) 0%, rgba(249,245,242,0.6) 100%)'
            : 'linear-gradient(to top, rgba(27,10,31,0.95) 0%, rgba(27,10,31,0.6) 100%)',
        }}>
          <div style={{ fontSize: '32px', color: 'rgba(248,141,167,0.4)', marginBottom: '16px' }}>✦</div>
          <div style={{ fontSize: '18px', color: 'rgba(248,141,167,0.7)', marginBottom: '8px' }}>敬请期待</div>
          <div style={{ fontSize: '12px', color: 'rgba(248,141,167,0.4)' }}>COMING SOON</div>
        </div>
      )
    }

    if (selectedChar.isCustomEntry) {
      return (
        <div style={{
          padding: '24px 20px 40px',
          background: theme === 'day'
            ? 'linear-gradient(to top, rgba(249,245,242,0.98) 0%, rgba(249,245,242,0.5) 100%)'
            : 'linear-gradient(to top, rgba(27,10,31,0.98) 0%, rgba(27,10,31,0.5) 100%)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', color: 'rgba(248,141,167,0.6)', marginBottom: '8px' }}>还没有属于你的故事？</div>
            <div style={{ fontSize: '11px', color: 'rgba(248,141,167,0.4)' }}>创造属于你的独特角色</div>
          </div>

          {customChars.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(248,141,167,0.5)', marginBottom: '12px', letterSpacing: '0.1em' }}>你的故事集</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                {customChars.map(char => (
                  <div key={char.id} onClick={() => handleSelectCustomFromEntry(char)} style={{
                    padding: '12px 16px',
                    background: theme === 'day' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(248,141,167,0.1)',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    position: 'relative',
                  }}>
                    <div style={{ fontSize: '15px', color: theme === 'day' ? '#3A3A3A' : 'rgba(255,220,230,0.9)', marginBottom: '4px' }}>{char.name}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(248,141,167,0.5)' }}>{char.tagline}</div>
                    <button onClick={(e) => handleDeleteCustom(char.id, e)} style={{
                      position: 'absolute', bottom: '10px', right: '12px',
                      background: 'none', border: 'none', color: 'rgba(255,100,100,0.45)',
                      fontSize: '11px', cursor: 'pointer',
                    }}>删除</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => setShowCreator(true)} style={{
            width: '100%', padding: '14px',
            background: 'rgba(248,141,167,0.15)',
            border: '1px solid rgba(248,141,167,0.3)',
            borderRadius: '28px',
            cursor: 'pointer',
            color: theme === 'day' ? '#3A3A3A' : '#FFDCE6',
            fontSize: '13px',
            fontFamily: 'Georgia, serif',
            letterSpacing: '0.1em',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.25s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,141,167,0.25)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(248,141,167,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,141,167,0.15)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            + 创造新的他
          </button>
        </div>
      )
    }

    const themeColor = selectedChar.theme
    const isDay = theme === 'day'
    // 骨架屏：数据还没加载完时显示
    if (allCards.length === 0) {
      return (
        <div className={`theme-lobby-${theme}`} style={{
          position: 'fixed', inset: 0,
          background: 'var(--bg-main)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '480px', height: '100%', margin: '0 auto', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column' }}>
              
              {/* 顶部标题 */}
              <div style={{ textAlign: 'center', padding: '32px 20px 8px', flexShrink: 0 }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', letterSpacing: '0.45em', marginBottom: '12px' }}>ONLY HIM</div>
                <div style={{ fontSize: '32px', color: 'var(--text-primary)', fontStyle: 'italic', letterSpacing: '0.08em' }}>是他</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.2em', marginTop: '10px', opacity: 0.65 }}>选择你的故事</div>
              </div>

              {/* 骨架卡片 */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', padding: '20px 0', overflow: 'hidden' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    width: '138px', height: '215px',
                    borderRadius: '20px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-glass)',
                    opacity: 0.5,
                  }} />
                ))}
              </div>

              {/* 点导航骨架 */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '12px 0 6px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    width: '4px', height: '4px', borderRadius: '50%',
                    background: 'rgba(248,141,167,0.3)',
                  }} />
                ))}
              </div>

              {/* 底部面板骨架 */}
              <div style={{ flex: 1, marginTop: 'auto', padding: '20px 24px 34px' }}>
                <div style={{
                  height: '200px',
                  borderRadius: '16px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-glass)',
                  opacity: 0.5,
                }} />
              </div>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div style={{
        padding: '20px 24px 34px',
        background: isDay
          ? 'linear-gradient(to top, rgba(249,245,242,0.98) 0%, rgba(249,245,242,0.7) 100%)'
          : 'linear-gradient(to top, rgba(27,10,31,0.98) 0%, rgba(27,10,31,0.7) 100%)',
      }}>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '24px', color: isDay ? '#3A3A3A' : 'rgba(255,220,230,0.95)', fontStyle: 'italic', marginBottom: '2px' }}>{selectedChar.name}</div>
          {selectedChar.en && (
            <div style={{ fontSize: '9px', color: 'rgba(248,141,167,0.5)', letterSpacing: '0.2em', marginBottom: '14px' }}>{selectedChar.en}</div>
          )}
          <div style={{ fontSize: '13px', color: isDay ? '#6D6D6D' : 'rgba(220,200,230,0.7)', lineHeight: 1.8, marginBottom: '16px' }}>{selectedChar.desc}</div>
          
          {selectedChar.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '28px' }}>
              {selectedChar.tags.map(tag => (
                <span key={tag} style={{
                  padding: '4px 12px', borderRadius: '20px',
                  border: `1px solid ${themeColor?.tagBorder || 'rgba(248,141,167,0.2)'}`,
                  fontSize: '10px',
                  color: themeColor?.tagColor || 'rgba(248,141,167,0.55)',
                }}>{tag}</span>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleEnter} style={{
          width: '100%', padding: '14px',
          background: themeColor?.btnBg || 'rgba(248,141,167,0.15)',
          border: `1px solid ${themeColor?.btnBorder || 'rgba(248,141,167,0.35)'}`,
          color: themeColor?.btnColor || (isDay ? '#3A3A3A' : '#FFDCE6'),
          borderRadius: '28px', fontSize: '13px', cursor: 'pointer',
          fontFamily: 'Georgia, serif', letterSpacing: '0.12em',
          boxShadow: themeColor?.btnShadow,
          backdropFilter: 'blur(10px)',
          transition: 'all 0.25s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,141,167,0.25)'; e.currentTarget.style.boxShadow = `0 0 16px rgba(248,141,167,0.4)` }}
        onMouseLeave={e => { e.currentTarget.style.background = themeColor?.btnBg || 'rgba(248,141,167,0.15)'; e.currentTarget.style.boxShadow = themeColor?.btnShadow || 'none' }}
        >
          呼唤他
        </button>
      </div>
    )
  }

  const isDay = theme === 'day'

  return (
    
    <>
      <style jsx global>{`
        .theme-lobby-day {
          --bg-main: #F9F5F2;
          --text-primary: #3A3A3A;
          --text-secondary: #6D6D6D;
          --text-accent: #F88DA7;
          --border-glass: rgba(0,0,0,0.08);
          --card-bg: rgba(255,255,255,0.5);
          --card-bg-hover: rgba(255,255,255,0.7);
        }
        .theme-lobby-night {
          --bg-main: #1B0A1F;
          --text-primary: #EDEAF2;
          --text-secondary: #C9B8D9;
          --text-accent: #FFB8C5;
          --border-glass: rgba(255,255,255,0.12);
          --card-bg: rgba(255,255,255,0.08);
          --card-bg-hover: rgba(255,255,255,0.18);
        }
        html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; background: #020108; }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        @keyframes shimmer { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.95; } }
        .shimmer { animation: shimmer 4s ease-in-out infinite; }
        .card-track { scrollbar-width: none; -webkit-overflow-scrolling: touch; cursor: grab; user-select: none; }
        .card-track:active { cursor: grabbing; }
        .card-track::-webkit-scrollbar { display: none; }
      `}</style>

      <div className={`theme-lobby-${theme}`} style={{
        position: 'fixed', inset: 0,
        background: 'var(--bg-main)',
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '480px', height: '100%', margin: '0 auto', overflow: 'hidden', fontFamily: 'Georgia, serif' }}>
          
          {/* 背景图 */}
          {/*<img src="/assets/lobby/lobby_bg.png" alt="" style={{ */}
          <img src="" alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', 
            objectFit: 'cover', pointerEvents: 'none',
            opacity: isDay ? 0.15 : 0.4,
          }} />

          <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* 顶部标题 + 设置按钮 */}
            <div style={{ textAlign: 'center', padding: '32px 20px 8px', flexShrink: 0, position: 'relative' }}>
              <button onClick={() => setShowSettings(true)} style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'var(--card-bg)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--border-glass)',
                borderRadius: '50%', width: '32px', height: '32px',
                cursor: 'pointer', fontSize: '14px',
                color: 'var(--text-secondary)',
                transition: 'all 0.25s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--card-bg-hover)'; e.currentTarget.style.boxShadow = '0 0 8px rgba(248,141,167,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--card-bg)'; e.currentTarget.style.boxShadow = 'none' }}
              >⚙</button>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', letterSpacing: '0.45em', marginBottom: '12px' }}>ONLY HIM</div>
              <div style={{ fontSize: '32px', color: 'var(--text-primary)', fontStyle: 'italic', letterSpacing: '0.08em', textShadow: isDay ? 'none' : '0 0 24px rgba(248,141,167,0.4)' }}>是他</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.2em', marginTop: '10px', opacity: 0.65 }}>选择你的故事</div>
            </div>

            {/* 卡片滑轨 */}
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', marginTop: '8px' }}>
              <div
                ref={trackRef}
                className="card-track"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '20px 120px', overflowX: 'auto',
                  scrollSnapType: 'x mandatory', width: '100%',
                }}
              >
                {allCards.map((char, idx) => renderCard(char, idx))}
              </div>
            </div>

            {/* 点导航 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '12px 0 6px', flexShrink: 0 }}>
              {allCards.map((_, i) => (
                <div key={i} style={{
                  height: '4px', transition: 'all 0.3s',
                  width: activeIdx === i ? '18px' : '4px',
                  borderRadius: activeIdx === i ? '2px' : '50%',
                  background: activeIdx === i ? 'rgba(248,141,167,0.8)' : 'rgba(248,141,167,0.25)',
                  boxShadow: activeIdx === i ? '0 0 6px rgba(248,141,167,0.6)' : 'none',
                }} />
              ))}
            </div>

            {/* 底部详情面板 */}
            <div style={{ flex: 1, overflow: 'hidden', marginTop: 'auto' }}>
              {renderBottomPanel()}
            </div>

          </div>

          <CharacterCreator
            show={showCreator}
            userId={userId}
            onClose={() => { setShowCreator(false); loadCustomChars() }}
            onComplete={() => { setShowCreator(false); loadCustomChars() }}
          />

        </div>

        <SettingsPanel
          show={showSettings}
          onClose={() => {
            setShowSettings(false)
            const cfg = loadApiConfig()
            if (cfg?.apiKey) {
              const id = localStorage.getItem('selectedCharId')
              if (id === 'custom' && localStorage.getItem('selectedCustomCharId')) {
                router.push('/game')
              } else if (id && id !== 'custom') {
                router.push('/game')
              }
            }
          }}
        />
      </div>
    </>
  )
}