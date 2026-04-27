import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

const CHARACTERS = [
  {
    id: 'coming',
    name: '···',
    en: '',
    tag: '敬请期待',
    desc: '',
    tags: [],
    cardImg: null,
    isPlaceholder: true,
    theme: null,
    // placeholder 也给一个视觉 glow 色，激活时荧光
    glowColor: 'rgba(80,130,255,0.3)',
  },
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
    id: 'custom',
    name: '与他重逢',
    en: '',
    tag: '导入你们的故事',
    desc: '',
    tags: [],
    cardImg: null,
    isCustom: true,
    theme: null,
    glowColor: 'rgba(100,180,255,0.2)',
  },
]

export default function Lobby() {
  const router = useRouter()
  const trackRef = useRef(null)
  const [activeIdx, setActiveIdx] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [selectedChar, setSelectedChar] = useState(null)
  const animRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/')
    })
  }, [])

  // 滑动检测
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

  function handleCardClick(char) {
    if (char.isPlaceholder) return
    if (char.isCustom) return
    setSelectedChar(char)
    setShowModal(true)
  }

  async function handleEnter() {
    if (selectedChar?.theme) {
      localStorage.setItem('selectedCharId', selectedChar.id)
      localStorage.setItem('selectedCharTheme', JSON.stringify(selectedChar.theme))
    }
    setShowModal(false)
    router.push('/game')
  }

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; background: #020108; }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }

        @keyframes titleBreathe {
          0%, 100% {
            text-shadow: 0 0 20px rgba(80,160,255,0.5), 0 0 40px rgba(80,160,255,0.25), 0 0 80px rgba(60,120,255,0.1);
          }
          50% {
            text-shadow: 0 0 32px rgba(100,180,255,0.95), 0 0 65px rgba(80,160,255,0.5), 0 0 110px rgba(60,140,255,0.22);
          }
        }
        .title-breathe { animation: titleBreathe 3.5s ease-in-out infinite; }

        @keyframes subtitleBreathe {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.95; }
        }
        .subtitle-breathe { animation: subtitleBreathe 4s ease-in-out infinite; }

        @keyframes hintBreathe {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.8; }
        }
        .hint-breathe { animation: hintBreathe 3s ease-in-out infinite; }

        .card-track { scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .card-track::-webkit-scrollbar { display: none; }

        .modal-desc { overflow-y: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .modal-desc::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#020108',
      }}>
        <div style={{
          position: 'relative',
          width: '100%', maxWidth: '480px', height: '100%',
          overflow: 'hidden', fontFamily: 'Georgia, serif',
        }}>
          {/* 背景图 */}
          <img src="/assets/lobby/lobby_bg.png" alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center', zIndex: 0,
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'relative', zIndex: 10, height: '100%',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* 顶部标题 */}
            <div style={{ textAlign: 'center', padding: '44px 20px 16px', flexShrink: 0 }}>
              <div className="subtitle-breathe" style={{
                fontSize: '10px', color: 'rgba(180,220,255,0.7)',
                letterSpacing: '0.45em', marginBottom: '12px',
              }}>ONLY HIM</div>
              <div className="title-breathe" style={{
                fontSize: '32px', color: 'rgba(220,235,255,0.98)',
                fontStyle: 'italic', letterSpacing: '0.08em',
              }}>是他</div>
              <div className="subtitle-breathe" style={{
                fontSize: '10px', color: 'rgba(160,210,255,0.6)',
                letterSpacing: '0.2em', marginTop: '10px', animationDelay: '0.5s',
              }}>选择你的故事</div>
            </div>

            {/* 卡牌区 */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: '70px', zIndex: 5,
                background: 'linear-gradient(to right, rgba(2,1,12,0.95), transparent)',
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', right: 0, top: 0, bottom: 0, width: '70px', zIndex: 5,
                background: 'linear-gradient(to left, rgba(2,1,12,0.95), transparent)',
                pointerEvents: 'none',
              }} />

              <div
                ref={trackRef}
                className="card-track"
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '30px 95px', overflowX: 'auto',
                  scrollSnapType: 'x mandatory', width: '100%',
                }}
              >
                {CHARACTERS.map((char, idx) => {
                  const isActive = activeIdx === idx
                  const isCustom = char.isCustom
                  const isPlaceholder = char.isPlaceholder
                  const theme = char.theme
                  // 所有卡激活时都要荧光
                  const glowColor = theme?.glow || char.glowColor || 'rgba(80,130,255,0.2)'

                  const cardStyle = {
                    flexShrink: 0, scrollSnapAlign: 'center',
                    cursor: isPlaceholder ? 'default' : 'pointer',
                    borderRadius: '20px', overflow: 'hidden',
                    transition: 'all 0.4s cubic-bezier(0.34,1.4,0.64,1)',
                    position: 'relative',
                    width: isActive ? '185px' : '138px',
                    height: isActive ? '295px' : '215px',
                    opacity: isActive ? 1 : 0.38,
                    transform: isActive ? 'scale(1)' : 'scale(0.86)',
                    // 所有卡激活时都有 boxShadow 荧光
                    boxShadow: isActive
                      ? `0 0 40px ${glowColor}, 0 0 80px rgba(60,120,255,0.08), 0 20px 50px rgba(0,0,0,0.7)`
                      : 'none',
                    ...(isCustom ? {
                      background: 'transparent',
                      border: isActive ? '1px dashed rgba(160,210,255,0.4)' : '1px dashed rgba(140,200,255,0.1)',
                    } : isPlaceholder ? {
                      background: 'linear-gradient(160deg, #080c18 0%, #040608 100%)',
                      border: isActive ? '1px solid rgba(100,150,255,0.25)' : '1px solid rgba(80,120,255,0.06)',
                    } : {
                      background: theme?.cardBg || '#080c18',
                      border: isActive
                        ? `1px solid ${theme?.borderActive || 'rgba(100,180,255,0.5)'}`
                        : '1px solid rgba(80,140,255,0.12)',
                    }),
                  }

                  return (
                    <div key={char.id} style={cardStyle} onClick={() => handleCardClick(char)}>
                      {/* 顶部高光线（系统角色才有） */}
                      {!isCustom && !isPlaceholder && theme && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, height: '1px', zIndex: 10,
                          background: `linear-gradient(to right, transparent, ${theme.borderActive}, transparent)`,
                          opacity: isActive ? 1 : 0, transition: 'opacity 0.4s',
                        }} />
                      )}

                      {isCustom ? (
                        // 与他重逢
                        <div style={{
                          height: '100%', display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '20px',
                        }}>
                          <div style={{
                            width: '48px', height: '48px', borderRadius: '50%',
                            border: isActive ? '1px solid rgba(160,215,255,0.5)' : '1px solid rgba(140,200,255,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '24px',
                            color: isActive ? 'rgba(180,225,255,0.8)' : 'rgba(140,200,255,0.18)',
                            transition: 'all 0.4s',
                            textShadow: isActive ? '0 0 16px rgba(100,180,255,0.6)' : 'none',
                          }}>+</div>
                          <div style={{
                            fontSize: isActive ? '13px' : '11px',
                            color: isActive ? 'rgba(200,230,255,0.85)' : 'rgba(140,200,255,0.2)',
                            letterSpacing: '0.1em', textAlign: 'center', lineHeight: 1.9,
                            transition: 'all 0.4s',
                            textShadow: isActive ? '0 0 12px rgba(80,160,255,0.5)' : 'none',
                          }}>
                            与他重逢<br />
                            <span style={{ fontSize: '10px', opacity: 0.65 }}>导入你们的故事</span>
                          </div>
                        </div>

                      ) : isPlaceholder ? (
                        // 敬请期待
                        <div style={{
                          height: '100%', display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '20px',
                        }}>
                          <div style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            border: isActive ? '1px solid rgba(140,190,255,0.4)' : '1px solid rgba(100,160,255,0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '22px',
                            color: isActive ? 'rgba(160,210,255,0.7)' : 'rgba(100,150,255,0.2)',
                            transition: 'all 0.4s',
                            textShadow: isActive ? '0 0 14px rgba(80,160,255,0.5)' : 'none',
                          }}>✦</div>
                          <div style={{
                            fontSize: isActive ? '12px' : '10px',
                            color: isActive ? 'rgba(180,220,255,0.8)' : 'rgba(120,160,255,0.18)',
                            letterSpacing: '0.2em', textAlign: 'center', lineHeight: 2,
                            transition: 'all 0.4s',
                            textShadow: isActive ? '0 0 10px rgba(80,160,255,0.4)' : 'none',
                          }}>
                            敬请期待<br />
                            <span style={{ fontSize: '9px', opacity: 0.65, letterSpacing: '0.1em' }}>COMING SOON</span>
                          </div>
                        </div>

                      ) : (
                        // 系统角色卡（陆绍桓等）
                        <>
                          <div style={{ position: 'absolute', inset: 0, background: theme?.cardBg }}>
                            {char.cardImg && (
                              <img
                                src={char.cardImg}
                                alt={char.name}
                                onError={e => e.target.style.display = 'none'}
                                style={{
                                  width: '100%', height: '100%',
                                  objectFit: 'cover', objectPosition: 'center 8%',
                                  display: 'block',
                                }}
                              />
                            )}
                            <div style={{
                              position: 'absolute', bottom: 0, left: 0, right: 0, height: '42%',
                              background: 'linear-gradient(to top, rgba(6,10,28,0.98) 0%, rgba(6,10,28,0.6) 55%, transparent 100%)',
                              zIndex: 2,
                            }} />
                            <div style={{
                              position: 'absolute', top: 0, left: 0, right: 0, height: '22%',
                              background: 'linear-gradient(to bottom, rgba(6,10,28,0.28), transparent)',
                              zIndex: 2,
                            }} />
                          </div>
                          <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            padding: '12px 16px 16px', zIndex: 3,
                          }}>
                            <div style={{
                              fontSize: '16px', color: 'rgba(220,235,255,0.95)',
                              letterSpacing: '0.06em', marginBottom: '5px',
                              textShadow: isActive && theme ? `0 0 14px rgba(${theme.accent},0.7)` : 'none',
                              transition: 'text-shadow 0.4s',
                            }}>{char.name}</div>
                            <div style={{
                              fontSize: '9px',
                              color: isActive && theme ? `rgba(${theme.accent},0.6)` : 'rgba(120,170,255,0.28)',
                              letterSpacing: '0.1em', lineHeight: 1.8, transition: 'color 0.4s',
                            }}>{char.tag}</div>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 点导航 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '0 0 14px', flexShrink: 0 }}>
              {CHARACTERS.map((_, i) => (
                <div key={i} style={{
                  height: '4px', transition: 'all 0.3s',
                  width: activeIdx === i ? '18px' : '4px',
                  borderRadius: activeIdx === i ? '2px' : '50%',
                  background: activeIdx === i ? 'rgba(100,180,255,0.7)' : 'rgba(120,170,255,0.15)',
                  boxShadow: activeIdx === i ? '0 0 8px rgba(80,160,255,0.6)' : 'none',
                }} />
              ))}
            </div>

            <div className="hint-breathe" style={{
              textAlign: 'center', padding: '0 0 28px', flexShrink: 0,
              fontSize: '10px', letterSpacing: '0.25em', color: 'rgba(160,210,255,0.7)',
              textShadow: '0 0 10px rgba(80,160,255,0.4)',
            }}>← 横滑探索 · 点卡了解 →</div>

          </div>

          {/* ── 弹窗：上图下文，下部可滑动 ── */}
          {showModal && selectedChar && (
            <div
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute', inset: 0, zIndex: 100,
                background: 'rgba(2,1,12,0.9)', backdropFilter: 'blur(18px)',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* 上半：卡面大图，固定高度 */}
              <div
                onClick={e => e.stopPropagation()}
                style={{ flex: '0 0 50%', position: 'relative', overflow: 'hidden' }}
              >
                {selectedChar.cardImg ? (
                  <img
                    src={selectedChar.cardImg}
                    alt={selectedChar.name}
                    style={{
                      width: '100%', height: '100%',
                      objectFit: 'cover', objectPosition: 'center 10%',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    background: selectedChar.theme?.cardBg || '#080c18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '48px', color: 'rgba(100,160,255,0.12)',
                  }}>✦</div>
                )}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%',
                  background: 'linear-gradient(to top, rgba(4,7,20,1) 0%, transparent 100%)',
                }} />
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    position: 'absolute', top: '16px', right: '16px',
                    background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.45)', borderRadius: '50%',
                    width: '32px', height: '32px', fontSize: '14px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >✕</button>
              </div>

              {/* 下半：可滑动介绍区 */}
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  background: 'linear-gradient(to bottom, rgba(4,7,20,1) 0%, #060c20 100%)',
                  // 去掉大蓝边框，只留极细的线
                  borderTop: '1px solid rgba(80,160,255,0.08)',
                  overflow: 'hidden',
                }}
              >
                {/* 可滚动内容 */}
                <div
                  className="modal-desc"
                  style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 0' }}
                >
                  <div style={{
                    fontSize: '24px', color: 'rgba(215,230,255,0.95)', fontStyle: 'italic',
                    letterSpacing: '0.08em', marginBottom: '3px',
                    textShadow: selectedChar.theme ? `0 0 22px rgba(${selectedChar.theme.primary},0.6)` : 'none',
                  }}>{selectedChar.name}</div>

                  <div style={{
                    fontSize: '9px', color: 'rgba(140,190,255,0.4)',
                    letterSpacing: '0.25em', marginBottom: '14px',
                  }}>{selectedChar.en}</div>

                  <div style={{
                    fontSize: '13px', color: 'rgba(185,215,245,0.6)', lineHeight: 2,
                    letterSpacing: '0.04em', marginBottom: '16px',
                  }}>{selectedChar.desc}</div>

                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {selectedChar.tags.map(tag => (
                      <span key={tag} style={{
                        padding: '4px 10px', borderRadius: '20px',
                        border: `1px solid ${selectedChar.theme?.tagBorder || 'rgba(80,160,255,0.15)'}`,
                        // 标签字小一点
                        fontSize: '9px',
                        color: selectedChar.theme?.tagColor || 'rgba(100,170,255,0.45)',
                        letterSpacing: '0.06em',
                      }}>{tag}</span>
                    ))}
                  </div>
                </div>

                {/* 底部按钮 固定不动 */}
                <div style={{
                  padding: '14px 24px 40px', flexShrink: 0,
                  background: 'linear-gradient(to bottom, transparent, rgba(6,10,28,0.95) 30%)',
                }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowModal(false)} style={{
                      flex: 1, padding: '14px', background: 'none',
                      border: '1px solid rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.2)', borderRadius: '14px',
                      fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif',
                    }}>再想想</button>
                    <button onClick={handleEnter} style={{
                      flex: 2, padding: '14px',
                      background: selectedChar.theme?.btnBg || 'linear-gradient(135deg, rgba(60,120,255,0.25), rgba(40,80,220,0.35))',
                      border: `1px solid ${selectedChar.theme?.btnBorder || 'rgba(80,160,255,0.35)'}`,
                      color: selectedChar.theme?.btnColor || 'rgba(180,220,255,0.9)',
                      borderRadius: '14px', fontSize: '13px', cursor: 'pointer',
                      fontFamily: 'Georgia, serif', letterSpacing: '0.12em',
                      boxShadow: selectedChar.theme?.btnShadow,
                      textShadow: `0 0 10px rgba(${selectedChar.theme?.accent || '100,180,255'},0.6)`,
                    }}>呼唤他</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
