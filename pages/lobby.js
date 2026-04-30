import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
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
      primary: '60,140,255',
      accent: '100,180,255',
      glow: 'rgba(60,120,255,0.45)',
      cardBg: 'linear-gradient(160deg, #0e1830 0%, #060c1e 60%, #0a1228 100%)',
      borderActive: 'rgba(100,180,255,0.5)',
      btnBg: 'linear-gradient(135deg, rgba(60,120,255,0.25), rgba(40,80,220,0.35))',
      btnBorder: 'rgba(80,160,255,0.35)',
      btnColor: 'rgba(180,220,255,0.9)',
      btnShadow: '0 0 20px rgba(60,140,255,0.25)',
      tagBorder: 'rgba(80,160,255,0.2)',
      tagColor: 'rgba(100,170,255,0.5)',
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
    glowColor: 'rgba(80,130,255,0.3)',
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

  // 鼠标拖拽滑动
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

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
        primary: '80,140,220',
        accent: '120,180,255',
        glow: 'rgba(100,160,255,0.35)',
        cardBg: 'linear-gradient(160deg, #0e1830 0%, #060c1e 60%, #0a1228 100%)',
        borderActive: 'rgba(120,180,255,0.4)',
        btnBg: 'linear-gradient(135deg, rgba(80,140,255,0.25), rgba(60,100,220,0.35))',
        btnBorder: 'rgba(100,170,255,0.35)',
        btnColor: 'rgba(190,225,255,0.9)',
        tagBorder: 'rgba(100,170,255,0.2)',
        tagColor: 'rgba(120,180,255,0.5)',
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
    // 默认选中第一个非占位角色（陆绍桓）
    const firstRealChar = cards.find(c => !c.isPlaceholder && !c.isCustomEntry)
    if (firstRealChar) setSelectedChar(firstRealChar)
  }

  useEffect(() => {
    if (userId) loadCustomChars()
  }, [userId])

  // 滚动检测高亮中间卡片 + 更新底部选中内容
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
      
      // 更新底部选中的卡片
      const newSelectedCard = allCards[closest]
      if (newSelectedCard) setSelectedChar(newSelectedCard)
    }
    
    track.addEventListener('scroll', onScroll, { passive: true })
    // 初始调用一次
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
    // 从入口列表选择自定义角色
    setSelectedChar(char)
    // 滚动到该卡片位置（可选）
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
    
    // 如果是入口卡片，不应该进入游戏
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
          return // 用户取消
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

  // ═══════════════════════════════════════════════════════════
  //  渲染单张卡片
  // ═══════════════════════════════════════════════════════════
  const renderCard = (char, idx) => {
    const isActive = activeIdx === idx
    const isPlaceholder = char.isPlaceholder
    const isCustomEntry = char.isCustomEntry
    const theme = char.theme
    const glowColor = theme?.glow || char.glowColor || 'rgba(80,130,255,0.2)'

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
      opacity: isActive ? 1 : 0.38,
      transform: isActive ? 'scale(1)' : 'scale(0.86)',
      boxShadow: isActive ? `0 0 25px ${glowColor}, 0 0 50px ${glowColor}` : 'none',
    }

    if (isPlaceholder) {
      cardStyle = {
        ...cardStyle,
        background: isActive ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(18px)',
        border: isActive ? '1px solid rgba(140,190,255,0.3)' : '1px solid rgba(100,150,255,0.08)',
      }
    } else if (isCustomEntry) {
      cardStyle = {
        ...cardStyle,
        background: isActive ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(18px)',
        border: isActive ? '1px solid rgba(160,210,255,0.35)' : '1px dashed rgba(140,200,255,0.1)',
      }
    } else {
      cardStyle = {
        ...cardStyle,
        background: theme?.cardBg || '#080c18',
        border: isActive ? `1px solid ${theme?.borderActive || 'rgba(100,180,255,0.5)'}` : '1px solid rgba(80,140,255,0.12)',
      }
    }

    const glowWrapStyle = {
      flexShrink: 0,
      scrollSnapAlign: 'center',
      position: 'relative',
      borderRadius: '22px',
      transition: 'all 0.4s',
      boxShadow: isActive ? `0 0 30px ${glowColor}, 0 0 60px ${glowColor}` : 'none',
    }

    return (
      <div key={char.id} style={glowWrapStyle}>
        <div style={{ ...cardStyle, boxShadow: 'none' }}>
          
          {/* 占位卡片：敬请期待 */}
          {isPlaceholder && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '20px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                border: isActive ? '1px solid rgba(140,190,255,0.4)' : '1px solid rgba(100,160,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px',
                color: isActive ? 'rgba(160,210,255,0.7)' : 'rgba(100,150,255,0.2)',
                transition: 'all 0.4s',
              }}>✦</div>
              <div style={{
                fontSize: isActive ? '12px' : '10px',
                color: isActive ? 'rgba(180,220,255,0.8)' : 'rgba(120,160,255,0.18)',
                textAlign: 'center', lineHeight: 2,
                transition: 'all 0.4s',
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
                border: isActive ? '1px solid rgba(160,215,255,0.5)' : '1px solid rgba(140,200,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px',
                color: isActive ? 'rgba(180,225,255,0.8)' : 'rgba(140,200,255,0.18)',
              }}>+</div>
              <div style={{
                fontSize: isActive ? '13px' : '11px',
                color: isActive ? 'rgba(200,230,255,0.85)' : 'rgba(140,200,255,0.2)',
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
              <div style={{ position: 'absolute', inset: 0, background: theme?.cardBg }}>
                {char.cardImg && (
                  <img src={char.cardImg} alt={char.name} style={{
                    width: '100%', height: '100%',
                    objectFit: 'cover', objectPosition: 'center 8%',
                  }} />
                )}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '42%',
                  background: 'linear-gradient(to top, rgba(6,10,28,0.98) 0%, rgba(6,10,28,0.6) 55%, transparent 100%)',
                }} />
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '22%',
                  background: 'linear-gradient(to bottom, rgba(6,10,28,0.28), transparent)',
                }} />
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px 16px', zIndex: 3 }}>
                <div style={{
                  fontSize: '16px', color: 'rgba(220,235,255,0.95)',
                  letterSpacing: '0.06em', marginBottom: '5px',
                  textShadow: isActive && theme ? `0 0 14px rgba(${theme.accent},0.7)` : 'none',
                }}>{char.name}</div>
                <div style={{
                  fontSize: '9px',
                  color: isActive && theme ? `rgba(${theme.accent},0.6)` : 'rgba(120,170,255,0.28)',
                  letterSpacing: '0.1em',
                }}>{char.tag}</div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════
  //  渲染底部详情面板
  // ═══════════════════════════════════════════════════════════
  const renderBottomPanel = () => {
    if (!selectedChar) return null

    // 占位卡底部
    if (selectedChar.isPlaceholder) {
      return (
        <div style={{
          padding: '24px 20px 40px',
          textAlign: 'center',
          background: 'linear-gradient(to top, rgba(2,1,12,0.95) 0%, rgba(2,1,12,0.6) 100%)',
        }}>
          <div style={{ fontSize: '32px', color: 'rgba(140,190,255,0.3)', marginBottom: '16px' }}>✦</div>
          <div style={{ fontSize: '18px', color: 'rgba(200,225,255,0.6)', marginBottom: '8px' }}>敬请期待</div>
          <div style={{ fontSize: '12px', color: 'rgba(160,200,255,0.35)' }}>COMING SOON</div>
        </div>
      )
    }

    // 自定义入口卡片底部
    if (selectedChar.isCustomEntry) {
      return (
        <div style={{
          padding: '24px 20px 40px',
          background: 'linear-gradient(to top, rgba(2,1,12,0.98) 0%, rgba(2,1,12,0.5) 100%)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '16px', color: 'rgba(180,210,255,0.5)', marginBottom: '8px' }}>还没有属于你的故事？</div>
            <div style={{ fontSize: '12px', color: 'rgba(160,200,255,0.35)' }}>创造属于你的独特角色</div>
          </div>

          {/* 已有自定义角色列表 */}
          {customChars.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(160,200,255,0.4)', marginBottom: '12px', letterSpacing: '0.1em' }}>你的故事集</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                {customChars.map(char => (
                  <div key={char.id} onClick={() => handleSelectCustomFromEntry(char)} style={{
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(140,190,255,0.1)',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    position: 'relative',
                  }}>
                    <div style={{ fontSize: '15px', color: 'rgba(220,235,255,0.9)', marginBottom: '4px' }}>{char.name}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(160,200,255,0.4)' }}>{char.tagline}</div>
                    <button onClick={(e) => handleDeleteCustom(char.id, e)} style={{
                      position: 'absolute', bottom: '10px', right: '12px',
                      background: 'none', border: 'none', color: 'rgba(255,100,100,0.35)',
                      fontSize: '11px', cursor: 'pointer',
                    }}>删除</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => setShowCreator(true)} style={{
            width: '100%', padding: '14px',
            background: 'linear-gradient(135deg, rgba(80,140,255,0.2), rgba(120,80,255,0.15))',
            border: '1px solid rgba(140,180,255,0.3)', borderRadius: '14px',
            cursor: 'pointer', color: 'rgba(230,240,255,0.9)', fontSize: '13px',
            fontFamily: 'Georgia, serif', letterSpacing: '0.1em',
          }}>
            + 创造新的他
          </button>
        </div>
      )
    }

    // 正常角色卡片底部
    const theme = selectedChar.theme
    return (
      <div style={{
        padding: '20px 24px 34px',
        background: 'linear-gradient(to top, rgba(2,1,12,0.98) 0%, rgba(2,1,12,0.7) 100%)',
      }}>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '24px', color: 'rgba(215,230,255,0.95)', fontStyle: 'italic', marginBottom: '2px' }}>{selectedChar.name}</div>
          {selectedChar.en && (
            <div style={{ fontSize: '9px', color: 'rgba(140,190,255,0.4)', letterSpacing: '0.2em', marginBottom: '14px' }}>{selectedChar.en}</div>
          )}
          <div style={{ fontSize: '13px', color: 'rgba(185,215,245,0.65)', lineHeight: 1.8, marginBottom: '16px' }}>{selectedChar.desc}</div>
          
          {/* 标签 */}
          {selectedChar.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '28px' }}>
              {selectedChar.tags.map(tag => (
                <span key={tag} style={{
                  padding: '4px 12px', borderRadius: '20px',
                  border: `1px solid ${theme?.tagBorder || 'rgba(80,160,255,0.2)'}`,
                  fontSize: '10px',
                  color: theme?.tagColor || 'rgba(100,170,255,0.55)',
                }}>{tag}</span>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleEnter} style={{
          width: '100%', padding: '14px',
          background: theme?.btnBg || 'linear-gradient(135deg, rgba(60,120,255,0.25), rgba(40,80,220,0.35))',
          border: `1px solid ${theme?.btnBorder || 'rgba(80,160,255,0.35)'}`,
          color: theme?.btnColor || 'rgba(180,220,255,0.9)',
          borderRadius: '14px', fontSize: '13px', cursor: 'pointer',
          fontFamily: 'Georgia, serif', letterSpacing: '0.12em',
          boxShadow: theme?.btnShadow,
          textShadow: `0 0 10px rgba(${theme?.accent || '100,180,255'},0.6)`,
        }}>
          呼唤他
        </button>
      </div>
    )
  }

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; background: #020108; }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        @keyframes shimmer { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.95; } }
        .shimmer { animation: shimmer 4s ease-in-out infinite; }
        .card-track { scrollbar-width: none; -webkit-overflow-scrolling: touch; cursor: grab; user-select: none; }
        .card-track:active { cursor: grabbing; }
        .card-track::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020108' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '480px', height: '100%', overflow: 'hidden', fontFamily: 'Georgia, serif' }}>
          
          {/* 背景图 */}
          <img src="/assets/lobby/lobby_bg.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* 顶部标题 + 设置按钮 */}
            <div style={{ textAlign: 'center', padding: '32px 20px 8px', flexShrink: 0, position: 'relative' }}>
              <button onClick={() => setShowSettings(true)} style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '50%', width: '32px', height: '32px',
                cursor: 'pointer', fontSize: '14px', color: 'rgba(200,220,255,0.5)',
                backdropFilter: 'blur(8px)',
              }}>⚙</button>
              <div style={{ fontSize: '12px', color: 'rgba(220,235,255,0.75)', letterSpacing: '0.45em', marginBottom: '12px' }}>ONLY HIM</div>
              <div style={{ fontSize: '32px', color: 'rgba(230,240,255,0.98)', fontStyle: 'italic', letterSpacing: '0.08em', textShadow: '0 0 24px rgba(80,160,255,0.5)' }}>是他</div>
              <div style={{ fontSize: '11px', color: 'rgba(200,225,255,0.65)', letterSpacing: '0.2em', marginTop: '10px' }}>选择你的故事</div>
            </div>

            {/* 卡片滑轨 - 留出底部面板空间 */}
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
                  background: activeIdx === i ? 'rgba(100,180,255,0.7)' : 'rgba(120,170,255,0.15)',
                  boxShadow: activeIdx === i ? '0 0 8px rgba(80,160,255,0.6)' : 'none',
                }} />
              ))}
            </div>

            {/* 底部详情面板 - 主要内容区域 */}
            <div style={{ flex: 1, overflow: 'hidden', marginTop: 'auto' }}>
              {renderBottomPanel()}
            </div>

          </div>

          {/* 角色创建弹窗 */}
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