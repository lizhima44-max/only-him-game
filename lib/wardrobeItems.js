// ══════════════════════════════════════════════════════
//  T1-7: 衣帽间  &  T1-8: 床头柜道具
//  数据 + 逻辑 + game.js 补丁
// ══════════════════════════════════════════════════════

// ────────────────────────────────────────────
//  Supabase SQL（先跑）
// ────────────────────────────────────────────
/*
ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS wardrobe JSONB DEFAULT '["daily_white","daily_black"]';
ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS current_outfit TEXT DEFAULT 'daily_white';
ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS bedside_items JSONB DEFAULT '[]';
*/


// ══════════════════ 衣帽间 ══════════════════

// 所有可拥有的衣物
export const ALL_OUTFITS = [
  // ── 常服（初始拥有或商场买）──
  { id: 'daily_white',  name: '白衬衫',    category: 'daily',   desc: '干净利落的白衬衫，袖子随意挽着',     price: 0,   unlockAt: 0 },
  { id: 'daily_black',  name: '黑色西装',  category: 'daily',   desc: '裁剪考究的三件套，扣子只系了一半',   price: 0,   unlockAt: 0 },
  { id: 'daily_sweater', name: '灰色毛衣', category: 'daily',  desc: '柔软的羊绒衫，衬得他温和了不少',     price: 120, unlockAt: 0 },
  { id: 'daily_casual',  name: '居家T恤',  category: 'daily',   desc: '简单的深色T恤，露出锁骨线条',        price: 80,  unlockAt: 0 },
  { id: 'daily_coat',    name: '风衣',     category: 'daily',   desc: '深卡其色长风衣，系带松松垮垮',       price: 280, unlockAt: 0 },

  // ── 特殊/氛围 ──
  { id: 'suit_formal',  name: '燕尾服',    category: 'formal',  desc: '正式晚宴装，他看起来像电影男主',     price: 500, unlockAt: 40 },
  { id: 'yukata',       name: '浴衣',      category: 'home',    desc: '深蓝色浴衣，领口松散',               price: 200, unlockAt: 30 },
  { id: 'apron_only',   name: '围裙（无上衣）', category: 'home', desc: '只穿围裙做饭的样子…',             price: 150, unlockAt: 50 },

  // ── 情趣（付费/高好感解锁）──
  { id: 'silk_robe',    name: '真丝睡袍',  category: 'intimate', desc: '黑色真丝睡袍，腰带系得很松',       price: 350, unlockAt: 60 },
  { id: 'uniform_mil',  name: '民国军装',  category: 'intimate', desc: '笔挺的军装，大少爷本色',            price: 400, unlockAt: 70 },
  { id: 'shirt_wet',    name: '湿透白衬衫', category: 'intimate', desc: '淋了雨的白衬衫，贴在身上…',       price: 0,   unlockAt: 80 },
]

// 获取已拥有的衣物详情
export function getOwnedOutfits(wardrobeIds) {
  return ALL_OUTFITS.filter(o => wardrobeIds.includes(o.id))
}

// 获取可购买的衣物（商场用）
export function getShopOutfits(wardrobeIds, intimacy) {
  return ALL_OUTFITS.filter(o => !wardrobeIds.includes(o.id) && o.price > 0 && intimacy >= o.unlockAt)
}

// 穿搭对AI的hint
export function getOutfitHint(outfitId) {
  const o = ALL_OUTFITS.find(x => x.id === outfitId)
  if (!o) return ''
  return `【他现在穿着】${o.name}——${o.desc}`
}


// ══════════════════ 床头柜道具 ══════════════════

export const ALL_BEDSIDE_ITEMS = [
  // ── 浪漫氛围 ──
  { id: 'candles_rose',  name: '玫瑰蜡烛',   category: 'ambiance', desc: '带玫瑰香气的蜡烛',                price: 60,  effect: 'romantic+10' },
  { id: 'perfume',       name: '香水',        category: 'ambiance', desc: '他的古龙水，木质调',              price: 120, effect: 'romantic+15' },
  { id: 'music_box',     name: '八音盒',      category: 'ambiance', desc: '旋律轻柔的老式八音盒',           price: 180, effect: 'romantic+20' },
  { id: 'flowers',       name: '鲜花',        category: 'ambiance', desc: '一束新鲜的白百合',               price: 40,  effect: 'romantic+8',  consumable: true },

  // ── 情趣道具（付费区预留）──
  { id: 'blindfold',     name: '眼罩',        category: 'intimate', desc: '丝质眼罩',                     price: 80,  unlockAt: 50,  hint: '她拿出了眼罩——视觉被遮挡，其他感官会更加敏锐' },
  { id: 'ribbon',        name: '缎带',        category: 'intimate', desc: '一条柔软的红色缎带',             price: 80,  unlockAt: 55,  hint: '她手里拿着一条缎带，看着他的手腕' },
  { id: 'ice_cube',      name: '冰块',        category: 'intimate', desc: '冰凉的小方块',                  price: 0,   unlockAt: 45,  hint: '她把冰块含在嘴里，然后……' },
  { id: 'feather',       name: '羽毛',        category: 'intimate', desc: '柔软的鹅毛',                    price: 50,  unlockAt: 40,  hint: '她拿起一根羽毛，沿着他的轮廓慢慢划过' },
  { id: 'handcuffs_silk', name: '丝巾手铐',   category: 'intimate', desc: '用丝巾做的柔软束缚',             price: 120, unlockAt: 65,  hint: '她把他的手腕用丝巾系在床头，他没有反抗' },
  { id: 'dice',          name: '情趣骰子',    category: 'intimate', desc: '一面写着部位，一面写着动作',       price: 60,  unlockAt: 35,  hint: '她掷出了骰子——' },

  // ── Lovense 预留 ──
  { id: 'lovense',       name: '智能玩具',    category: 'lovense',  desc: 'Lovense联动设备',               price: 0,   unlockAt: 999, hint: '设备已连接', isPremium: true },
]

export function getOwnedBedsideItems(itemIds) {
  return ALL_BEDSIDE_ITEMS.filter(i => itemIds.includes(i.id))
}

export function getShopBedsideItems(itemIds, intimacy) {
  return ALL_BEDSIDE_ITEMS.filter(i => !itemIds.includes(i.id) && i.price > 0 && intimacy >= (i.unlockAt || 0) && !i.isPremium)
}


// ══════════════════════════════════════════════════════
//  game.js 补丁
// ══════════════════════════════════════════════════════

// ────────────────────────────────────────────
//  修改 1: import
// ────────────────────────────────────────────
// import { ALL_OUTFITS, getOwnedOutfits, getOutfitHint,
//          ALL_BEDSIDE_ITEMS, getOwnedBedsideItems } from '../lib/wardrobeItems'


// ────────────────────────────────────────────
//  修改 2: 加 state
// ────────────────────────────────────────────
/*
  const [wardrobe, setWardrobe] = useState(['daily_white', 'daily_black'])
  const [currentOutfit, setCurrentOutfit] = useState('daily_white')
  const [bedsideItems, setBedsideItems] = useState([])
  const [showWardrobe, setShowWardrobe] = useState(false)
  const [showBedside, setShowBedside] = useState(false)
*/


// ────────────────────────────────────────────
//  修改 3: 加载时读取
// ────────────────────────────────────────────
/*
  setWardrobe(data.wardrobe || ['daily_white', 'daily_black'])
  setCurrentOutfit(data.current_outfit || 'daily_white')
  setBedsideItems(data.bedside_items || [])
*/


// ────────────────────────────────────────────
//  修改 4: saveToDb 加字段
// ────────────────────────────────────────────
/*
  wardrobe: wardrobe,
  current_outfit: currentOutfit,
  bedside_items: bedsideItems,
*/


// ────────────────────────────────────────────
//  修改 5: getSystemPrompt 注入穿搭
// ────────────────────────────────────────────
// 在 getSystemPrompt 里加：
//   const outfitHint = getOutfitHint(currentOutfit)
// 然后在 prompt 字符串里加 ${outfitHint}


// ────────────────────────────────────────────
//  修改 6: 卧室按钮区加"衣帽间"和"床头柜"
// ────────────────────────────────────────────
// 在 game.js 第937行 bedroom 的 roomActions 里改成：

/*
  bedroom: [
    { label: '躺一躺', prompt: '她走进卧室躺下，你站在门口，说一句' },
    { label: '说说话', prompt: '卧室里安静，她想和你说说话，你的反应' },
    { label: '衣帽间', special: 'wardrobe' },
    { label: '床头柜', special: 'bedside' },
  ],
*/

// 然后在按钮渲染区（约第956行的 special 判断里）加：
/*
  if (a.special === 'wardrobe') return (
    <button key="wardrobe" onClick={() => setShowWardrobe(true)} style={btnStyle()}>衣帽间</button>
  )
  if (a.special === 'bedside') return (
    <button key="bedside" onClick={() => setShowBedside(true)} style={btnStyle()}>床头柜</button>
  )
*/


// ────────────────────────────────────────────
//  修改 7: 衣帽间弹窗
// ────────────────────────────────────────────
// 在 showDiary/showFridge 弹窗附近加：

/*
  {showWardrobe && (
    <div onClick={() => setShowWardrobe(false)} style={{
      position: 'fixed', inset: 0, zIndex: 250,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '480px',
        background: 'rgba(10,7,4,0.97)',
        border: '1px solid rgba(201,169,110,0.12)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 44px', maxHeight: '70vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', color: '#c9a96e', letterSpacing: '0.1em' }}>衣帽间</div>
          <button onClick={() => setShowWardrobe(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.35)', marginBottom: '14px' }}>
          当前：{ALL_OUTFITS.find(o => o.id === currentOutfit)?.name || '白衬衫'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {getOwnedOutfits(wardrobe).map(o => (
            <button key={o.id} onClick={() => {
              setCurrentOutfit(o.id)
              setShowWardrobe(false)
              sendToAI(`她让他换上了${o.name}，${o.desc}，他换好后的反应，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
              saveToDb(messages, intimacy, playerRoom, luRoom)
            }} style={{
              padding: '12px 14px', textAlign: 'left',
              background: currentOutfit === o.id ? 'rgba(201,169,110,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${currentOutfit === o.id ? 'rgba(201,169,110,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '12px', cursor: 'pointer',
              color: currentOutfit === o.id ? '#c9a96e' : 'rgba(255,255,255,0.5)',
              fontFamily: 'Georgia, serif',
            }}>
              <div style={{ fontSize: '13px', marginBottom: '3px' }}>{o.name}</div>
              <div style={{ fontSize: '10px', opacity: 0.5 }}>{o.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )}
*/


// ────────────────────────────────────────────
//  修改 8: 床头柜弹窗
// ────────────────────────────────────────────

/*
  {showBedside && (
    <div onClick={() => setShowBedside(false)} style={{
      position: 'fixed', inset: 0, zIndex: 250,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '480px',
        background: 'rgba(10,7,4,0.97)',
        border: '1px solid rgba(201,169,110,0.12)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 44px', maxHeight: '70vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', color: '#c9a96e', letterSpacing: '0.1em' }}>床头柜</div>
          <button onClick={() => setShowBedside(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>

        {bedsideItems.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'rgba(201,169,110,0.3)', textAlign: 'center', padding: '20px 0' }}>
            空空如也…去商场逛逛？
          </div>
        ) : (
          <>
            <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.3)', marginBottom: '10px' }}>
              {intimatePhase !== 'idle' ? '选一件使用' : '氛围道具可随时使用，情趣道具在亲密时使用'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {getOwnedBedsideItems(bedsideItems).map(item => {
                const isIntimate = item.category === 'intimate'
                const canUse = !isIntimate || (intimatePhase !== 'idle')
                return (
                  <button key={item.id} onClick={() => {
                    if (!canUse) { setToast('亲密时才能使用'); return }
                    setShowBedside(false)
                    if (item.category === 'ambiance') {
                      // 氛围道具：加浪漫值
                      const boost = parseInt(item.effect?.replace('romantic+','') || '10')
                      setRomantic(n => Math.min(100, n + boost))
                      sendToAI(`她拿出了${item.name}（${item.desc}），营造氛围，你的反应`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                    } else if (item.hint) {
                      // 情趣道具：传hint给AI
                      sendToAI(item.hint, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                    }
                    if (item.consumable) {
                      // 消耗品用完就没了
                      setBedsideItems(prev => prev.filter(id => id !== item.id))
                    }
                    saveToDb(messages, intimacy, playerRoom, luRoom)
                  }} style={{
                    padding: '12px 14px', textAlign: 'left',
                    background: isIntimate ? 'rgba(180,100,120,0.06)' : 'rgba(201,169,110,0.04)',
                    border: `1px solid ${isIntimate ? 'rgba(180,100,120,0.15)' : 'rgba(201,169,110,0.1)'}`,
                    borderRadius: '12px', cursor: canUse ? 'pointer' : 'default',
                    opacity: canUse ? 1 : 0.4,
                    color: 'rgba(255,255,255,0.5)', fontFamily: 'Georgia, serif',
                  }}>
                    <div style={{ fontSize: '13px', marginBottom: '3px', color: isIntimate ? 'rgba(200,130,150,0.8)' : 'rgba(201,169,110,0.7)' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '10px', opacity: 0.5 }}>{item.desc}</div>
                    {item.consumable && <div style={{ fontSize: '9px', color: 'rgba(255,180,60,0.4)', marginTop: '2px' }}>· 消耗品</div>}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )}
*/
