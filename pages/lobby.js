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
  },
]

export default function Lobby() {
  const router = useRouter()
  const canvasRef = useRef(null)
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

  // 星空 canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    const W = canvas.width, H = canvas.height

    const stars = Array.from({ length: 280 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.8 + 0.2,
      speed: 0.002 + Math.random() * 0.006,
      phase: Math.random() * Math.PI * 2,
    }))

    const nebulae = [
      { x: W*0.5, y: H*0.25, rx: 200, ry: 130, color: '40,100,255',  alpha: 0.07 },
      { x: W*0.2, y: H*0.55, rx: 130, ry: 90,  color: '80,140,255',  alpha: 0.05 },
      { x: W*0.8, y: H*0.65, rx: 110, ry: 80,  color: '60,120,255',  alpha: 0.04 },
      { x: W*0.6, y: H*0.12, rx: 100, ry: 65,  color: '100,160,255', alpha: 0.04 },
      { x: W*0.15, y: H*0.2, rx: 120, ry: 80,  color: '255,100,180', alpha: 0.04 },
      { x: W*0.85, y: H*0.4, rx: 90,  ry: 70,  color: '220,80,160',  alpha: 0.035 },
      { x: W*0.4,  y: H*0.8, rx: 150, ry: 90,  color: '255,120,200', alpha: 0.03 },
    ]

    const meteors = []
    let meteorTimer = 0
    function spawnMeteor() {
      meteors.push({
        x: Math.random() * (W - 40) + 20,
        y: Math.random() * H * 0.4 + 10,
        vx: 1.2 + Math.random() * 1.8,
        vy: 0.4 + Math.random() * 0.8,
        len: 40 + Math.random() * 60,
        life: 1,
        decay: 0.012 + Math.random() * 0.016,
      })
    }

    let t = 0
    function draw() {
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createRadialGradient(W/2, H*0.3, 0, W/2, H*0.5, H*0.8)
      bg.addColorStop(0, 'rgba(8,10,28,1)')
      bg.addColorStop(1, 'rgba(2,1,10,1)')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

      nebulae.forEach(n => {
        const pulse = Math.sin(t * 0.25 + n.x * 0.01) * 0.35 + 0.65
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.rx)
        grad.addColorStop(0, `rgba(${n.color},${n.alpha * pulse * 2})`)
        grad.addColorStop(0.5, `rgba(${n.color},${n.alpha * pulse})`)
        grad.addColorStop(1, `rgba(${n.color},0)`)
        ctx.save(); ctx.scale(1, n.ry / n.rx); ctx.fillStyle = grad
        ctx.beginPath(); ctx.arc(n.x, n.y * (n.rx / n.ry), n.rx, 0, Math.PI * 2)
        ctx.fill(); ctx.restore()
      })

      stars.forEach(s => {
        const pulse = (Math.sin(t * s.speed * 8 + s.phase) + 1) / 2
        const a = 0.12 + pulse * 0.88
        const r = s.r * (0.75 + pulse * 0.5)
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(180,220,255,${a})`; ctx.fill()
        if (s.r > 1.2) {
          ctx.beginPath(); ctx.arc(s.x, s.y, r * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(100,180,255,${a * 0.12})`; ctx.fill()
        }
      })

      meteorTimer++
      if (meteorTimer > 90 + Math.random() * 80) { spawnMeteor(); meteorTimer = 0 }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx*(m.len/5), m.y - m.vy*(m.len/5))
        grad.addColorStop(0, `rgba(200,230,255,${m.life*0.9})`)
        grad.addColorStop(0.4, `rgba(140,200,255,${m.life*0.4})`)
        grad.addColorStop(1, 'rgba(100,180,255,0)')
        ctx.strokeStyle = grad; ctx.lineWidth = m.life * 1.5
        ctx.beginPath(); ctx.moveTo(m.x, m.y)
        ctx.lineTo(m.x - m.vx*(m.len/5), m.y - m.vy*(m.len/5)); ctx.stroke()
        m.x += m.vx; m.y += m.vy; m.life -= m.decay
        if (m.life <= 0) meteors.splice(i, 1)
      }

      t += 0.016
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
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
        html, body { margin: 0; padding: 0; overflow: hidden; background: #020108; }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }

        @keyframes titleBreathe {
          0%, 100% {
            text-shadow:
              0 0 20px rgba(80,160,255,0.5),
              0 0 40px rgba(80,160,255,0.25),
              0 0 80px rgba(60,120,255,0.1);
          }
          50% {
            text-shadow:
              0 0 32px rgba(100,180,255,0.95),
              0 0 65px rgba(80,160,255,0.5),
              0 0 110px rgba(60,140,255,0.22);
          }
        }
        .title-breathe { animation: titleBreathe 3.5s ease-in-out infinite; }

        @keyframes subtitleBreathe {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.95; }
        }
        .subtitle-breathe { animation: subtitleBreathe 4s ease-in-out infinite; }

        @keyframes plusBreathe {
          0%, 100% { box-shadow: 0 0 10px rgba(100,180,255,0.1); }
          50% { box-shadow: 0 0 24px rgba(100,180,255,0.3); }
        }
        .custom-plus-breathe { animation: plusBreathe 2.8s ease-in-out infinite; }

        @keyframes hintBreathe {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.8; }
        }
        .hint-breathe { animation: hintBreathe 3s ease-in-out infinite; }

        .card-track { scrollbar-width: none; }
        .card-track::-webkit-scrollbar { display: none; }
      `}</style>

      {/* 全屏fixed，手机不抖 */}
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
          <canvas ref={canvasRef} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0,
          }} />

          <div style={{
            position: 'relative', zIndex: 10, height: '100%',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* 顶部标题 */}
            <div style={{ textAlign: 'center', padding: '44px 20px 16px', flexShrink: 0 }}>
              <div className="subtitle-breathe" style={{
                fontSize: '10px', color: 'rgba(140,200,255,0.35)',
                letterSpacing: '0.45em', marginBottom: '12px',
              }}>ONLY HIM</div>
              <div className="title-breathe" style={{
                fontSize: '32px', color: 'rgba(210,230,255,0.95)',
                fontStyle: 'italic', letterSpacing: '0.08em',
              }}>是他</div>
              <div className="subtitle-breathe" style={{
                fontSize: '10px', color: 'rgba(120,180,255,0.25)',
                letterSpacing: '0.2em', marginTop: '10px',
                animationDelay: '0.5s',
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
                  scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
                  width: '100%',
                }}
              >
                {CHARACTERS.map((char, idx) => {
                  const isActive = activeIdx === idx
                  const isCustom = char.isCustom
                  const isPlaceholder = char.isPlaceholder
                  const theme = char.theme

                  const cardStyle = {
                    flexShrink: 0, scrollSnapAlign: 'center',
                    cursor: isPlaceholder ? 'default' : 'pointer',
                    borderRadius: '20px', overflow: 'hidden',
                    transition: 'all 0.4s cubic-bezier(0.34,1.4,0.64,1)',
                    position: 'relative',
                    width: isActive ? '185px' : '138px',
                    height: isActive ? '295px' : '215px',
                    opacity: isActive ? 1 : 0.4,
                    transform: isActive ? 'scale(1)' : 'scale(0.86)',
                    ...(isCustom ? {
                      background: 'transparent',
                      border: isActive ? '1px dashed rgba(160,210,255,0.35)' : '1px dashed rgba(140,200,255,0.12)',
                      boxShadow: isActive ? '0 0 30px rgba(100,180,255,0.12)' : 'none',
                    } : isPlaceholder ? {
                      background: 'linear-gradient(160deg, #080c18 0%, #040608 100%)',
                      border: isActive ? '1px solid rgba(100,150,255,0.18)' : '1px solid rgba(80,120,255,0.06)',
                    } : {
                      background: theme?.cardBg || '#080c18',
                      border: isActive
                        ? `1px solid ${theme?.borderActive || 'rgba(100,180,255,0.5)'}`
                        : '1px solid rgba(80,140,255,0.15)',
                      boxShadow: isActive && theme
                        ? `0 0 40px ${theme.glow}, 0 0 80px rgba(60,120,255,0.1), 0 30px 60px rgba(0,0,0,0.8)`
                        : 'none',
                    }),
                  }

                  return (
                    <div key={char.id} style={cardStyle} onClick={() => handleCardClick(char)}>
                      {/* 顶部高光线 */}
                      {!isCustom && !isPlaceholder && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, height: '1px', zIndex: 10,
                          background: `linear-gradient(to right, transparent, ${theme?.borderActive || 'rgba(140,200,255,0.5)'}, transparent)`,
                          opacity: isActive ? 1 : 0, transition: 'opacity 0.4s',
                        }} />
                      )}

                      {isCustom ? (
                        <div style={{
                          height: '100%', display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '20px',
                        }}>
                          <div className={isActive ? 'custom-plus-breathe' : ''} style={{
                            width: '48px', height: '48px', borderRadius: '50%',
                            border: isActive ? '1px solid rgba(140,200,255,0.45)' : '1px solid rgba(140,200,255,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '24px',
                            color: isActive ? 'rgba(160,210,255,0.75)' : 'rgba(140,200,255,0.2)',
                            transition: 'all 0.4s',
                          }}>+</div>
                          <div style={{
                            fontSize: isActive ? '13px' : '11px',
                            color: isActive ? 'rgba(180,220,255,0.75)' : 'rgba(140,200,255,0.22)',
                            letterSpacing: '0.1em', textAlign: 'center', lineHeight: 1.9,
                            transition: 'all 0.4s',
                          }}>
                            与他重逢<br />
                            <span style={{ fontSize: '10px', opacity: 0.65 }}>导入你们的故事</span>
                          </div>
                        </div>

                      ) : isPlaceholder ? (
                        <div style={{
                          height: '100%', display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '20px',
                        }}>
                          <div style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            border: isActive ? '1px solid rgba(120,180,255,0.3)' : '1px solid rgba(100,160,255,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '22px', opacity: isActive ? 0.6 : 0.25, transition: 'all 0.4s',
                          }}>✦</div>
                          <div style={{
                            fontSize: isActive ? '12px' : '10px',
                            color: isActive ? 'rgba(160,200,255,0.65)' : 'rgba(120,160,255,0.2)',
                            letterSpacing: '0.2em', textAlign: 'center', lineHeight: 2, transition: 'all 0.4s',
                          }}>
                            敬请期待<br />
                            <span style={{ fontSize: '9px', opacity: 0.6, letterSpacing: '0.1em' }}>COMING SOON</span>
                          </div>
                        </div>

                      ) : (
                        <>
                          {/* 卡面铺满 */}
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

                          {/* 名字+tag 叠在底部 */}
                          <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            padding: '12px 16px 16px', zIndex: 3,
                          }}>
                            <div style={{
                              fontSize: '16px', color: 'rgba(220,235,255,0.92)',
                              letterSpacing: '0.06em', marginBottom: '5px',
                              textShadow: isActive && theme ? `0 0 14px rgba(${theme.accent},0.6)` : 'none',
                              transition: 'text-shadow 0.4s',
                            }}>{char.name}</div>
                            <div style={{
                              fontSize: '9px',
                              color: isActive && theme ? `rgba(${theme.accent},0.55)` : 'rgba(120,170,255,0.3)',
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
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '0 0 16px', flexShrink: 0 }}>
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

            {/* 底部提示 */}
            <div className="hint-breathe" style={{
              textAlign: 'center', padding: '0 0 32px', flexShrink: 0,
              fontSize: '10px', letterSpacing: '0.25em', color: 'rgba(100,180,255,0.5)',
            }}>← 横滑探索 · 点卡了解 →</div>

          </div>

          {/* 弹窗：上图下文 */}
          {showModal && selectedChar && (
            <div
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute', inset: 0, zIndex: 100,
                background: 'rgba(2,1,12,0.88)', backdropFilter: 'blur(16px)',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* 上半：卡面大图 */}
              <div
                onClick={e => e.stopPropagation()}
                style={{ flex: '0 0 52%', position: 'relative', overflow: 'hidden' }}
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
                    fontSize: '48px', color: 'rgba(100,160,255,0.1)',
                  }}>✦</div>
                )}
                {/* 底部淡出 */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
                  background: 'linear-gradient(to top, rgba(6,10,28,1) 0%, transparent 100%)',
                }} />
                {/* 关闭按钮 */}
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    position: 'absolute', top: '16px', right: '16px',
                    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.35)', borderRadius: '50%',
                    width: '32px', height: '32px', fontSize: '14px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Georgia, serif',
                  }}
                >✕</button>
              </div>

              {/* 下半：文字介绍 */}
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  flex: 1, overflow: 'hidden',
                  background: 'linear-gradient(to bottom, rgba(6,10,28,1) 0%, #060c20 100%)',
                  borderTop: `1px solid ${selectedChar.theme?.borderActive || 'rgba(80,160,255,0.12)'}`,
                  padding: '20px 24px 44px',
                  display: 'flex', flexDirection: 'column',
                }}
              >
                <div style={{
                  fontSize: '24px', color: 'rgba(210,230,255,0.92)', fontStyle: 'italic',
                  letterSpacing: '0.08em', marginBottom: '3px',
                  textShadow: selectedChar.theme ? `0 0 22px rgba(${selectedChar.theme.primary},0.6)` : 'none',
                }}>{selectedChar.name}</div>

                <div style={{ fontSize: '9px', color: 'rgba(100,160,255,0.25)', letterSpacing: '0.25em', marginBottom: '12px' }}>
                  {selectedChar.en}
                </div>

                <div style={{
                  fontSize: '13px', color: 'rgba(180,210,240,0.45)', lineHeight: 2,
                  letterSpacing: '0.04em', marginBottom: '14px', flex: 1, overflow: 'hidden',
                }}>
                  {selectedChar.desc}
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {selectedChar.tags.map(tag => (
                    <span key={tag} style={{
                      padding: '5px 12px', borderRadius: '20px',
                      border: `1px solid ${selectedChar.theme?.tagBorder || 'rgba(80,160,255,0.15)'}`,
                      fontSize: '10px',
                      color: selectedChar.theme?.tagColor || 'rgba(100,170,255,0.4)',
                      letterSpacing: '0.06em',
                    }}>{tag}</span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                  <button onClick={() => setShowModal(false)} style={{
                    flex: 1, padding: '14px', background: 'none',
                    border: '1px solid rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.18)', borderRadius: '14px',
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
          )}

        </div>
      </div>
    </>
  )
}
