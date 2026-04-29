import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'
import { loadApiConfig } from '../lib/apiClient'
import SettingsPanel from '../components/SettingsPanel'
import CharacterCreator from '../components/CharacterCreator'
import { listCustomCharacters, deleteCustomCharacter } from '../lib/characterImport'

// 预设角色（陆绍桓）
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
]

export default function Lobby() {
  const router = useRouter()
  const trackRef = useRef(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [selectedChar, setSelectedChar] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showCreator, setShowCreator] = useState(false)
  const [showCharList, setShowCharList] = useState(false)  // 自定义角色列表弹窗
  const [customChars, setCustomChars] = useState([])
  const [userId, setUserId] = useState(null)
  
  // 合并所有卡片（预设 + 自定义入口）
  const [allCards, setAllCards] = useState([
    ...DEFAULT_CHARACTERS,
    { id: 'custom_entry', isCustomEntry: true, name: '与他重逢', tag: '创造或导入你的故事' }
  ])

  // 鼠标拖拽滑动相关
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/')
      else setUserId(session.user.id)
    })
  }, [])

  // 加载自定义角色列表
  const loadCustomChars = async () => {
    if (!userId) return
    const chars = await listCustomCharacters(supabase, userId)
    setCustomChars(chars)
  }

  useEffect(() => {
    if (userId) loadCustomChars()
  }, [userId])

  // 滑动检测（触摸）
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    function onScroll() {
      const rect = track.getBoundingClientRect()
      const center = rect.left + rect.width / 2
      let closest = 0, minDist = Infinity
      Array.from(track.children).forEach((el, i) => {
        const r = el.getBoundingClientRect()
        const dist = Math.abs(r.left + r.width / 2 - center)
        if (dist < minDist) { minDist = dist; closest = i }
      })
      setActiveIdx(closest)
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => track.removeEventListener('scroll', onScroll)
  }, [])

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

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  function handleCardClick(char, idx) {
    if (char.isPlaceholder) return
    if (char.isCustomEntry) {
      setShowCharList(true)
      loadCustomChars()
      return
    }
    setSelectedChar(char)
    setShowModal(true)
  }

  async function handleDeleteCustom(charId, e) {
    e.stopPropagation()
    if (confirm('确定要删除这个角色吗？')) {
      await deleteCustomCharacter(supabase, userId, charId)
      loadCustomChars()
    }
  }

  function handleSelectCustom(char) {
    localStorage.setItem('selectedCharId', 'custom')
    localStorage.setItem('selectedCustomCharId', char.id)
    localStorage.setItem('selectedCharTheme', JSON.stringify({
      primary: '80,140,220',
      accent: '120,180,255',
      btnBg: 'linear-gradient(135deg, rgba(80,140,255,0.25), rgba(60,100,220,0.35))',
      btnBorder: 'rgba(100,170,255,0.35)',
      btnColor: 'rgba(190,225,255,0.9)',
    }))
    setShowCharList(false)
    const cfg = loadApiConfig()
    if (!cfg?.apiKey) setShowSettings(true)
    else router.push('/game')
  }

  async function handleEnter() {
    const cfg = loadApiConfig()
    if (!cfg?.apiKey) {
      setShowModal(false)
      setShowSettings(true)
      return
    }
    if (selectedChar?.theme) {
      localStorage.setItem('selectedCharId', selectedChar.id)
      localStorage.setItem('selectedCharTheme', JSON.stringify(selectedChar.theme))
    }
    setShowModal(false)
    router.push('/game')
  }

  // 渲染单个卡片
  const renderCard = (char, idx) => {
    const isActive = activeIdx === idx
    const isCustomEntry = char.isCustomEntry
    const isPlaceholder = char.isPlaceholder
    const theme = char.theme
    const glowColor = theme?.glow || 'rgba(80,130,255,0.2)'

    const cardStyle = {
      flexShrink: 0, scrollSnapAlign: 'center',
      cursor: (isCustomEntry || isPlaceholder) ? 'pointer' : 'pointer',
      borderRadius: '20px', overflow: 'hidden',
      transition: 'all 0.4s cubic-bezier(0.34,1.4,0.64,1)',
      position: 'relative',
      width: isActive ? '185px' : '138px',
      height: isActive ? '295px' : '215px',
      opacity: isActive ? 1 : 0.38,
      transform: isActive ? 'scale(1)' : 'scale(0.86)',
      boxShadow: isActive ? `0 0 25px ${glowColor}, 0 0 50px ${glowColor}` : 'none',
      ...(isCustomEntry ? {
        background: isActive ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(18px)',
        border: isActive ? '1px solid rgba(160,210,255,0.35)' : '1px dashed rgba(140,200,255,0.1)',
      } : isPlaceholder ? {
        background: isActive ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(18px)',
        border: isActive ? '1px solid rgba(140,190,255,0.3)' : '1px solid rgba(100,150,255,0.08)',
      } : {
        background: theme?.cardBg || '#080c18',
        border: isActive ? `1px solid ${theme?.borderActive || 'rgba(100,180,255,0.5)'}` : '1px solid rgba(80,140,255,0.12)',
      }),
    }

    const glowWrapStyle = {
      flexShrink: 0, scrollSnapAlign: 'center', position: 'relative',
      borderRadius: '22px', transition: 'all 0.4s',
      boxShadow: isActive ? `0 0 30px ${glowColor}, 0 0 60px ${glowColor}` : 'none',
    }

    return (
      <div key={char.id} style={glowWrapStyle} onClick={() => handleCardClick(char, idx)}>
        <div style={{ ...cardStyle, boxShadow: 'none' }}>
          {isCustomEntry ? (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '20px',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                border: isActive ? '1px solid rgba(160,215,255,0.5)' : '1px solid rgba(140,200,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', color: isActive ? 'rgba(180,225,255,0.8)' : 'rgba(140,200,255,0.18)',
              }}>+</div>
              <div style={{
                fontSize: isActive ? '13px' : '11px',
                color: isActive ? 'rgba(200,230,255,0.85)' : 'rgba(140,200,255,0.2)',
                textAlign: 'center', lineHeight: 1.9,
              }}>{char.name}<br /><span style={{ fontSize: '10px', opacity: 0.65 }}>{char.tag}</span></div>
            </div>
          ) : (
            <>
              <div style={{ position: 'absolute', inset: 0, background: theme?.cardBg }}>
                {char.cardImg && <img src={char.cardImg} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 8%' }} />}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '42%', background: 'linear-gradient(to top, rgba(6,10,28,0.98) 0%, rgba(6,10,28,0.6) 55%, transparent 100%)' }} />
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px 16px', zIndex: 3 }}>
                <div style={{ fontSize: '16px', color: 'rgba(220,235,255,0.95)', letterSpacing: '0.06em', marginBottom: '5px' }}>{char.name}</div>
                <div style={{ fontSize: '9px', color: isActive && theme ? `rgba(${theme.accent},0.6)` : 'rgba(120,170,255,0.28)' }}>{char.tag}</div>
              </div>
            </>
          )}
        </div>
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
        .modal-desc { overflow-y: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .modal-desc::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020108' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '480px', height: '100%', overflow: 'hidden', fontFamily: 'Georgia, serif' }}>
          
          <img src="/assets/lobby/lobby_bg.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* 顶部 */}
            <div style={{ textAlign: 'center', padding: '32px 20px 8px', flexShrink: 0, position: 'relative' }}>
              <button onClick={() => setShowSettings(true)} style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '50%', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: '14px', color: 'rgba(200,220,255,0.5)',
                backdropFilter: 'blur(8px)',
              }}>⚙</button>
              <div style={{ fontSize: '12px', color: 'rgba(220,235,255,0.75)', letterSpacing: '0.45em', marginBottom: '12px' }}>ONLY HIM</div>
              <div style={{ fontSize: '32px', color: 'rgba(230,240,255,0.98)', fontStyle: 'italic', letterSpacing: '0.08em', textShadow: '0 0 24px rgba(80,160,255,0.5)' }}>是他</div>
              <div style={{ fontSize: '11px', color: 'rgba(200,225,255,0.65)', letterSpacing: '0.2em', marginTop: '10px' }}>选择你的故事</div>
            </div>

            {/* 卡片滑轨 - 支持鼠标拖拽 */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'visible' }}>
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
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '0 0 14px', flexShrink: 0 }}>
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

            <div className="shimmer" style={{ textAlign: 'center', padding: '0 0 28px', flexShrink: 0, fontSize: '11px', letterSpacing: '0.25em', color: 'rgba(200,225,255,0.7)' }}>
              ← 拖拽滑动 · 点卡了解 →
            </div>
          </div>

          {/* 自定义角色列表弹窗 */}
          {showCharList && (
            <div onClick={() => setShowCharList(false)} style={{
              position: 'absolute', inset: 0, zIndex: 100,
              background: 'rgba(2,1,12,0.95)', backdropFilter: 'blur(20px)',
              display: 'flex', flexDirection: 'column',
            }}>
              <div onClick={e => e.stopPropagation()} style={{ flex: 1, padding: '40px 24px', overflowY: 'auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '20px', color: 'rgba(230,240,255,0.95)', fontStyle: 'italic', marginBottom: '8px' }}>你的故事</div>
                  <div style={{ fontSize: '11px', color: 'rgba(180,210,255,0.45)' }}>选择一个他，或者创造新的</div>
                </div>

                {customChars.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(180,210,255,0.3)', fontSize: '13px' }}>
                    还没有属于你的故事<br />
                    点击下方按钮创造
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                    {customChars.map(char => (
                      <div key={char.id} onClick={() => handleSelectCustom(char)} style={{
                        padding: '16px', background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(140,190,255,0.12)', borderRadius: '16px',
                        cursor: 'pointer', transition: 'all 0.2s',
                        position: 'relative',
                      }}>
                        <div style={{ fontSize: '18px', color: 'rgba(220,235,255,0.95)', marginBottom: '6px' }}>{char.name}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(180,210,255,0.4)' }}>{char.tagline}</div>
                        {char.tags?.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                            {char.tags.slice(0, 3).map(tag => (
                              <span key={tag} style={{ fontSize: '9px', padding: '2px 8px', border: '1px solid rgba(140,190,255,0.15)', borderRadius: '20px', color: 'rgba(180,210,255,0.5)' }}>{tag}</span>
                            ))}
                          </div>
                        )}
                        <button onClick={(e) => handleDeleteCustom(char.id, e)} style={{
                          position: 'absolute', bottom: '12px', right: '12px',
                          background: 'none', border: 'none', color: 'rgba(255,100,100,0.4)',
                          fontSize: '12px', cursor: 'pointer',
                        }}>删除</button>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => { setShowCharList(false); setShowCreator(true) }} style={{
                  width: '100%', padding: '14px',
                  background: 'linear-gradient(135deg, rgba(80,140,255,0.2), rgba(120,80,255,0.15))',
                  border: '1px solid rgba(140,180,255,0.3)', borderRadius: '14px',
                  cursor: 'pointer', color: 'rgba(230,240,255,0.9)', fontSize: '13px',
                  fontFamily: 'Georgia, serif', letterSpacing: '0.1em',
                }}>+ 创造新的他</button>

                <button onClick={() => setShowCharList(false)} style={{
                  display: 'block', margin: '20px auto 0', background: 'none', border: 'none',
                  color: 'rgba(180,210,255,0.3)', fontSize: '12px', cursor: 'pointer',
                }}>返回</button>
              </div>
            </div>
          )}

          {/* 角色详情弹窗 */}
          {showModal && selectedChar && (
            <div onClick={() => setShowModal(false)} style={{
              position: 'absolute', inset: 0, zIndex: 100,
              background: 'rgba(2,1,12,0.9)', backdropFilter: 'blur(18px)',
              display: 'flex', flexDirection: 'column',
            }}>
              <div onClick={e => e.stopPropagation()} style={{ flex: '0 0 50%', position: 'relative', overflow: 'hidden' }}>
                {selectedChar.cardImg ? (
                  <img src={selectedChar.cardImg} alt={selectedChar.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 10%' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: selectedChar.theme?.cardBg || '#080c18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', color: 'rgba(100,160,255,0.12)' }}>✦</div>
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%', background: 'linear-gradient(to top, rgba(4,7,20,1) 0%, transparent 100%)' }} />
                <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
              </div>

              <div onClick={e => e.stopPropagation()} style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'linear-gradient(to bottom, rgba(4,7,20,1) 0%, #060c20 100%)', borderTop: '1px solid rgba(80,160,255,0.08)', overflow: 'hidden' }}>
                <div className="modal-desc" style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 0' }}>
                  <div style={{ fontSize: '24px', color: 'rgba(215,230,255,0.95)', fontStyle: 'italic', marginBottom: '3px' }}>{selectedChar.name}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(140,190,255,0.4)', letterSpacing: '0.25em', marginBottom: '14px' }}>{selectedChar.en}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(185,215,245,0.6)', lineHeight: 2, marginBottom: '16px' }}>{selectedChar.desc}</div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {selectedChar.tags?.map(tag => (
                      <span key={tag} style={{ padding: '4px 10px', borderRadius: '20px', border: `1px solid ${selectedChar.theme?.tagBorder || 'rgba(80,160,255,0.15)'}`, fontSize: '9px', color: selectedChar.theme?.tagColor || 'rgba(100,170,255,0.45)' }}>{tag}</span>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '14px 24px 40px', flexShrink: 0, background: 'linear-gradient(to bottom, transparent, rgba(6,10,28,0.95) 30%)' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '14px', background: 'none', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)', borderRadius: '14px', fontSize: '13px', cursor: 'pointer' }}>再想想</button>
                                        <button onClick={handleEnter} style={{ flex: 2, padding: '14px', background: selectedChar.theme?.btnBg || 'linear-gradient(135deg, rgba(60,120,255,0.25), rgba(40,80,220,0.35))', border: `1px solid ${selectedChar.theme?.btnBorder || 'rgba(80,160,255,0.35)'}`, color: selectedChar.theme?.btnColor || 'rgba(180,220,255,0.9)', borderRadius: '14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', letterSpacing: '0.12em', boxShadow: selectedChar.theme?.btnShadow, textShadow: `0 0 10px rgba(${selectedChar.theme?.accent || '100,180,255'},0.6)` }}>呼唤他</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        <SettingsPanel
          show={showSettings}
          onClose={() => {
            setShowSettings(false)
            const cfg = loadApiConfig()
            if (cfg?.apiKey && selectedChar) {
              if (selectedChar.theme) {
                localStorage.setItem('selectedCharId', selectedChar.id)
                localStorage.setItem('selectedCharTheme', JSON.stringify(selectedChar.theme))
              }
              router.push('/game')
            }
          }}
        />

        <CharacterCreator
          show={showCreator}
          userId={userId}
          onClose={() => {
            setShowCreator(false)
            loadCustomChars()  // 刷新列表
          }}
          onComplete={(config) => {
            setShowCreator(false)
            loadCustomChars()  // 刷新列表
            const cfg = loadApiConfig()
            if (!cfg?.apiKey) setShowSettings(true)
            else router.push('/game')
          }}
        />
      </div>
    </>
  )
}