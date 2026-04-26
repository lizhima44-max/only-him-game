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
  },
  {
    id: 'custom',
    name: '成与他重逢',
    en: '',
    tag: '导入你们的故事',
    desc: '',
    tags: [],
    cardImg: null,
    isCustom: true,
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

  // 权限检查
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/')
    })
  }, [])

  // 星云Canvas
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
      { x: W*0.5, y: H*0.25, rx: 200, ry: 130, color: '40,100,255', alpha: 0.07 },
      { x: W*0.2, y: H*0.55, rx: 130, ry: 90,  color: '80,140,255', alpha: 0.05 },
      { x: W*0.8, y: H*0.65, rx: 110, ry: 80,  color: '60,120,255', alpha: 0.04 },
      { x: W*0.6, y: H*0.12, rx: 100, ry: 65,  color: '100,160,255', alpha: 0.04 },
      // 粉色星云
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
        vx: 3 + Math.random() * 4,
        vy: 1 + Math.random() * 2,
        len: 50 + Math.random() * 80,
        life: 1,
        decay: 0.03 + Math.random() * 0.04,
      })
    }

    let t = 0
    function draw() {
      ctx.clearRect(0, 0, W, H)

      // 深空
      const bg = ctx.createRadialGradient(W/2, H*0.3, 0, W/2, H*0.5, H*0.8)
      bg.addColorStop(0, 'rgba(8,10,28,1)')
      bg.addColorStop(1, 'rgba(2,1,10,1)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // 星云
      nebulae.forEach(n => {
        const pulse = Math.sin(t * 0.25 + n.x * 0.01) * 0.35 + 0.65
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.rx)
        grad.addColorStop(0, `rgba(${n.color},${n.alpha * pulse * 2})`)
        grad.addColorStop(0.5, `rgba(${n.color},${n.alpha * pulse})`)
        grad.addColorStop(1, `rgba(${n.color},0)`)
        ctx.save()
        ctx.scale(1, n.ry / n.rx)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(n.x, n.y * (n.rx / n.ry), n.rx, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      // 星星
      stars.forEach(s => {
        const pulse = (Math.sin(t * s.speed * 8 + s.phase) + 1) / 2
        const a = 0.12 + pulse * 0.88
        const r = s.r * (0.75 + pulse * 0.5)
        ctx.beginPath()
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(180,220,255,${a})`
        ctx.fill()
        if (s.r > 1.2) {
          ctx.beginPath()
          ctx.arc(s.x, s.y, r * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(100,180,255,${a * 0.12})`
          ctx.fill()
        }
      })

      // 流星
      meteorTimer++
      if (meteorTimer > 40 + Math.random() * 50) { spawnMeteor(); meteorTimer = 0 }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * (m.len / 5), m.y - m.vy * (m.len / 5))
        grad.addColorStop(0, `rgba(200,230,255,${m.life * 0.9})`)
        grad.addColorStop(0.4, `rgba(140,200,255,${m.life * 0.4})`)
        grad.addColorStop(1, 'rgba(100,180,255,0)')
        ctx.strokeStyle = grad
        ctx.lineWidth = m.life * 1.5
        ctx.beginPath()
        ctx.moveTo(m.x, m.y)
        ctx.lineTo(m.x - m.vx * (m.len / 5), m.y - m.vy * (m.len / 5))
        ctx.stroke()
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

  function handleCardClick(char, idx) {
    if (char.isPlaceholder) return
    if (char.isCustom) {
      // 后期：跳转自定义重逢页
      return
    }
    setSelectedChar(char)
    setShowModal(true)
  }

  async function handleEnter() {
    setShowModal(false)
    router.push('/game')
  }

  return (
    <div style={{
      width: '100%', maxWidth: '480px', margin: '0 auto',
      height: '100dvh', position: 'relative', overflow: 'hidden',
      fontFamily: 'Georgia, serif', background: '#020108',
    }}>
      {/* 星云背景 */}
      <canvas ref={canvasRef} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* 顶部标题 */}
        <div style={{ textAlign: 'center', padding: '44px 20px 16px', flexShrink: 0 }}>
          <div style={{ fontSize: '10px', color: 'rgba(140,200,255,0.35)', letterSpacing: '0.45em', marginBottom: '12px' }}>
            ONLY HIM
          </div>
          <div style={{
            fontSize: '30px', color: 'rgba(210,230,255,0.95)', fontStyle: 'italic', letterSpacing: '0.08em',
            textShadow: '0 0 30px rgba(80,160,255,0.7), 0 0 60px rgba(80,160,255,0.3)',
          }}>是他</div>
          <div style={{ fontSize: '10px', color: 'rgba(120,180,255,0.2)', letterSpacing: '0.2em', marginTop: '10px' }}>
            选择你的故事
          </div>
        </div>

        {/* 卡牌区 */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          {/* 左右渐隐 */}
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

          <div ref={trackRef} style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '30px 95px', overflowX: 'auto',
            scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none', width: '100%',
          }}>
            {CHARACTERS.map((char, idx) => {
              const isActive = activeIdx === idx
              const isLu = char.id === 'lu'
              const isCustom = char.isCustom

              const cardStyle = {
                flexShrink: 0, scrollSnapAlign: 'center',
                cursor: char.isPlaceholder ? 'default' : 'pointer',
                borderRadius: '20px', overflow: 'hidden',
                transition: 'all 0.4s cubic-bezier(0.34,1.4,0.64,1)',
                position: 'relative',
                width: isActive ? '168px' : '138px',
                height: isActive ? '268px' : '215px',
                opacity: isActive ? 1 : 0.4,
                transform: isActive ? 'scale(1)' : 'scale(0.86)',
                ...(isCustom ? {
                  background: 'transparent',
                  border: isActive ? '1px dashed rgba(160,210,255,0.25)' : '1px dashed rgba(140,200,255,0.1)',
                  boxShadow: isActive ? '0 0 25px rgba(100,180,255,0.1)' : 'none',
                } : isLu ? {
                  background: 'linear-gradient(160deg, #0e1830 0%, #060c1e 60%, #0a1228 100%)',
                  border: isActive ? '1px solid rgba(100,180,255,0.5)' : '1px solid rgba(80,140,255,0.15)',
                  boxShadow: isActive
                    ? '0 0 40px rgba(60,140,255,0.4), 0 0 80px rgba(60,120,255,0.15), 0 30px 60px rgba(0,0,0,0.8)'
                    : 'none',
                } : {
                  background: 'linear-gradient(160deg, #080c18 0%, #040608 100%)',
                  border: isActive ? '1px solid rgba(100,150,255,0.18)' : '1px solid rgba(80,120,255,0.06)',
                }),
              }

              return (
                <div key={char.id} style={cardStyle} onClick={() => handleCardClick(char, idx)}>
                  {/* 顶部光线 */}
                  {!isCustom && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                      background: 'linear-gradient(to right, transparent, rgba(140,200,255,0.5), transparent)',
                      opacity: isActive ? 1 : 0, transition: 'opacity 0.4s',
                    }} />
                  )}

                  {isCustom ? (
                    <div style={{
                      height: '100%', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: '12px',
                    }}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '50%',
                        border: '1px solid rgba(140,200,255,0.18)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px', color: 'rgba(140,200,255,0.25)',
                      }}>+</div>
                      <div style={{ fontSize: '11px', color: 'rgba(140,200,255,0.22)', letterSpacing: '0.1em', textAlign: 'center', lineHeight: 1.7 }}>
                        成与他重逢<br />
                        <span style={{ fontSize: '9px', opacity: 0.6 }}>导入你们的故事</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 图片区 */}
                      <div style={{ width: '100%', height: '62%', position: 'relative', overflow: 'hidden', borderRadius: '18px 18px 0 0' }}>
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(180deg, rgba(60,120,255,0.05) 0%, rgba(40,80,200,0.1) 100%)',
                        }} />
                        {char.cardImg && (
                          <img
                            src={char.cardImg}
                            alt={char.name}
                            onError={e => e.target.style.display = 'none'}
                            style={{
                              width: '100%', height: '100%',
                              objectFit: 'cover', objectPosition: 'center 15%',
                              position: 'relative', zIndex: 1,
                            }}
                          />
                        )}
                        {/* 占位文字（图片加载失败时） */}
                        {!char.cardImg && (
                          <div style={{
                            position: 'absolute', inset: 0, zIndex: 2,
                            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                            paddingBottom: '10px',
                            fontSize: '10px', color: 'rgba(140,180,255,0.18)', letterSpacing: '0.1em',
                          }}>
                            {char.isPlaceholder ? '即将到来' : '立绘位'}
                          </div>
                        )}
                        {/* 底部渐变 */}
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
                          background: 'linear-gradient(to top, rgba(8,12,28,1), transparent)',
                          zIndex: 3,
                        }} />
                      </div>

                      {/* 信息区 */}
                      <div style={{ padding: '10px 14px 14px' }}>
                        <div style={{
                          fontSize: char.isPlaceholder ? '11px' : '15px',
                          color: char.isPlaceholder ? 'rgba(120,160,255,0.2)' : 'rgba(210,230,255,0.85)',
                          letterSpacing: '0.06em', marginBottom: '5px',
                          textShadow: isActive && !char.isPlaceholder ? '0 0 12px rgba(80,160,255,0.5)' : 'none',
                        }}>
                          {char.name}
                        </div>
                        <div style={{ fontSize: '9px', color: 'rgba(120,170,255,0.3)', letterSpacing: '0.1em', lineHeight: 1.7 }}>
                          {char.tag}
                        </div>
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
              height: '4px', borderRadius: '2px',
              transition: 'all 0.3s',
              width: activeIdx === i ? '18px' : '4px',
              borderRadius: activeIdx === i ? '2px' : '50%',
              background: activeIdx === i ? 'rgba(100,180,255,0.7)' : 'rgba(120,170,255,0.15)',
              boxShadow: activeIdx === i ? '0 0 8px rgba(80,160,255,0.6)' : 'none',
            }} />
          ))}
        </div>

        {/* 底部提示 */}
        <div style={{
          textAlign: 'center', padding: '0 0 32px', flexShrink: 0,
          fontSize: '10px', letterSpacing: '0.25em',
          color: 'rgba(100,180,255,0.55)',
          textShadow: '0 0 8px rgba(80,160,255,0.8), 0 0 20px rgba(80,160,255,0.4)',
          animation: 'none',
        }}>← 横滑探索 · 点卡了解 →</div>

      </div>

      {/* 简介弹窗 */}
      {showModal && selectedChar && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'absolute', inset: 0, zIndex: 100,
            background: 'rgba(2,1,12,0.8)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              background: 'linear-gradient(to top, #060c20 0%, #0a1028 100%)',
              borderTop: '1px solid rgba(80,160,255,0.12)',
              borderRadius: '28px 28px 0 0',
              padding: '10px 24px 44px',
            }}
          >
            <div style={{ width: '32px', height: '3px', background: 'rgba(80,160,255,0.2)', borderRadius: '2px', margin: '10px auto 22px' }} />
            <div style={{
              fontSize: '24px', color: 'rgba(210,230,255,0.92)', fontStyle: 'italic',
              letterSpacing: '0.08em', marginBottom: '3px',
              textShadow: '0 0 20px rgba(80,160,255,0.6)',
            }}>{selectedChar.name}</div>
            <div style={{ fontSize: '9px', color: 'rgba(100,160,255,0.25)', letterSpacing: '0.25em', marginBottom: '16px' }}>
              {selectedChar.en}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(180,210,240,0.38)', lineHeight: 2, letterSpacing: '0.04em', marginBottom: '18px' }}>
              {selectedChar.desc}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '24px' }}>
              {selectedChar.tags.map(tag => (
                <span key={tag} style={{
                  padding: '4px 10px', borderRadius: '20px',
                  border: '1px solid rgba(80,160,255,0.15)',
                  fontSize: '9px', color: 'rgba(100,170,255,0.4)', letterSpacing: '0.06em',
                }}>{tag}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowModal(false)} style={{
                flex: 1, padding: '13px', background: 'none',
                border: '1px solid rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.18)', borderRadius: '14px',
                fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif',
              }}>再想想</button>
              <button onClick={handleEnter} style={{
                flex: 2, padding: '13px',
                background: 'linear-gradient(135deg, rgba(60,120,255,0.25), rgba(40,80,220,0.35))',
                border: '1px solid rgba(80,160,255,0.35)',
                color: 'rgba(180,220,255,0.9)', borderRadius: '14px',
                fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif',
                letterSpacing: '0.12em',
                boxShadow: '0 0 20px rgba(60,140,255,0.25)',
                textShadow: '0 0 10px rgba(100,180,255,0.6)',
              }}>呼唤他</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        div[style*="overflow-x: auto"] { scrollbar-width: none; }
        div[style*="overflow-x: auto"]::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
