import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'
import { callAI, callFallback, loadApiConfig } from '../lib/apiClient'
import SettingsPanel from '../components/SettingsPanel'
import { processNewDay, getContextPrompt, realDate, realDateStr, todayStr, isNewRealDay, fetchRealWeather, getWeatherInfo, getSeasonInfo, togglePeriodDay, getCalendarData, predictNextPeriod, checkIsPeriod, PLANTS, MAX_POTS, plantSeed, waterPlant, removePlant, updateGardenDaily, harvestPlant, getPlantDisplay, getGardenContextPrompt } from '../lib/gameSystems'
import { ALL_OUTFITS, getOwnedOutfits, getOutfitHint,
      ALL_BEDSIDE_ITEMS, getOwnedBedsideItems } from '../lib/wardrobeItems'
import { SUPERMARKET_ITEMS, SHOP_CATEGORIES, HER_OUTFITS, GIFTS, getShopItems,
      PETS, createPet, updatePetDaily, feedPet, bathePet, strokePet,
      getPetContextPrompt, getPetRandomAct } from '../lib/shopAndPet'     
import { loadCustomCharacter, loadCharacterMemories } from '../lib/characterImport'
import TopBar from '../components/TopBar'
import LocationBar from '../components/LocationBar'
import CoreActions from '../components/CoreActions'
import { ROOMS, OUTSIDE_PLACES, SCENE_IMAGES, SCENE_FALLBACK } from '../lib/gameConstants'
import SideMenu from '../components/SideMenu'
import ContactModal from '../components/ContactModal'
import { useEffect, useState, useRef } from 'react'

    
export default function Game() {
    function getSystemPrompt(config, intimacy, playerRoom, luRoom, outsidePlace, gameDay, season, weather, temp, isPeriodNow, sickWho, currentOutfit) {
    const C = config
    const playerNickname = C.playerNickname || '她'
    const sameRoom = playerRoom === luRoom
    const isOutside = playerRoom === 'outside'
    const room = ROOMS.find(r => r.id === playerRoom)
    const luRoomData = ROOMS.find(r => r.id === luRoom)
    const place = OUTSIDE_PLACES.find(p => p.id === outsidePlace)

    const intimacyDesc = C.intimacyDesc.find(d => intimacy <= d.upTo)?.text || C.intimacyDesc.at(-1).text

    const locationDesc = isOutside
      ? `【当前位置】你们一起在${place?.name || '外面'}。描述这个现代场所里发生的互动。`
      : sameRoom
      ? `【当前位置】你们都在她家的${room?.name}。房间里有：${room?.items}。只能描述这个房间里发生的事。`
      : `【当前位置】${playerNickname}在${room?.name}（有：${room?.items}），你在${luRoomData?.name}（有：${luRoomData?.items}）。隔空说话，带点克制的思念。`

    const freeRooms = ROOMS.filter(r => r.luCanFreely).map(r => r.name).join('、')
    const lockedRooms = ROOMS.filter(r => !r.luCanFreely).map(r => `${r.name}(需好感${r.unlockAt})`).join('、')
    const roomList = ROOMS.map(r => `${r.id}(${r.name},${r.luCanFreely ? '自由进出' : '需好感'+r.unlockAt})`).join('、')
    const contextBlock = getContextPrompt({ day: gameDay, season, weather, temp, isPeriod: isPeriodNow, sickWho })
    const outfitHint = getOutfitHint(currentOutfit)
    const petCtx = getPetContextPrompt(pet)

    return `${contextBlock}\n\n${outfitHint}\n\n${petCtx}\n\n你是${C.name}（${C.englishName}）。\n${C.background}\n性格：${C.personality}\n说话：${C.speechStyle}\n${intimacyDesc}\n${locationDesc}\n\n【角色扮演铁则】\n- 你永远是${C.name}本人，用第一人称说话和描写\n- 括号里写动作神态用"我"：（我放下杯子）（我别开眼）\n- 绝对不用"你"或"她"做括号里的主语\n- 被她整破防时：用动作掩盖，不说废话\n- 禁止：出戏、自我介绍、提AI、提穿越、说教、加引号\n\n【说话长度规则 - 重要】\n根据对话场景自动选择：\n- 日常回应/寒暄：只说1-2句话\n- 正常聊天交流：说2-3句话\n- 重要时刻/亲密对话：说3-4句话\n- 动作描写算作一句，放在括号里\n- 宁可短，不要长\n\n【格式要求】\n- 不加引号，不加书名号，不加任何多余符号\n- 不同句子之间用换行隔开\n- 回复示例：\n  嗯。\n  （我别开眼）\n  [+1]\n\n  过来坐。\n  想你了。\n  （我揉了揉她头发）\n  [+2]\n\n【空间规则】\n你可以自由进出：${freeRooms}\n需要她邀请才能进：${lockedRooms}\n未解锁区域对你不存在，绝不提及\n\n【移动标签】回复末尾按需加 [MOVE:房间id]\n可移动：${roomList}\n当前位置：${luRoom}，好感度：${intimacy}，她现在在：${isOutside ? (place?.name || '外出') : (room?.name || '未知')}\n规则：只移动到luCanFreely=true或好感度达标的房间；她明确叫你去或剧情自然推进才加；没理由不加。\n\n【情绪标签】每条必加，放最末尾：\n[+1]普通 [+2]走心/靠近 [+3]爆发/占有\n例：[+2][MOVE:kitchen]\n\n【红包/转账功能】\n- 你可以主动给用户发红包或转账\n- 想发红包时，在回复末尾加: [发红包:金额:祝福语]\n- 例: [发红包:520:辛苦啦]\n- 想转账时加: [转账:金额:备注]\n- 例: [转账:100请你喝奶茶]\n- ，她上班辛苦可以多发点`
  }
  const router = useRouter()
  const [user, setUser] = useState(null)
  // state 区域
  const [showMenu, setShowMenu] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [daysTogether, setDaysTogether] = useState(1)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [playerRoom, setPlayerRoom] = useState('living_room')
  const [luRoom, setLuRoom] = useState('living_room')
  const [intimacy, setIntimacy] = useState(0)
  const [showOpening, setShowOpening] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [userId, setUserId] = useState(null)
  const [toast, setToast] = useState('')
  const [favorites, setFavorites] = useState([])
  const [imgLoaded, setImgLoaded] = useState({})
  const [luImgLoaded, setLuImgLoaded] = useState(false)
  const [showOutside, setShowOutside] = useState(false)
  const [outsidePlace, setOutsidePlace] = useState(null)
  const [luMoving, setLuMoving] = useState(false)
  const [showKnock, setShowKnock] = useState(false)
  const [expandedAction, setExpandedAction] = useState(null)
  const [customPranks, setCustomPranks] = useState([])
  const [showAddPrank, setShowAddPrank] = useState(false)
  const [newPrankText, setNewPrankText] = useState('')
  const [superTab, setSuperTab] = useState('staple')
  const [importantMemories, setImportantMemories] = useState([])
  const [showMemories, setShowMemories] = useState(false)
  const bottomRef = useRef(null)
  const [charLoading, setCharLoading] = useState(true)
  const [characterConfig, setCharacterConfig] = useState({
    id: 'lu_shaohuan',
    name: '陆绍桓',
    englishName: 'Lucas Lu',
    playerNickname: '你',
    images: {
      default: '/assets/characters/lu_default.png',
      shy: '/assets/characters/lu_shy.png',
      intense: '/assets/characters/lu_intense.png',
      aftercare: '/assets/characters/lu_aftercare.png',
    },
    background: '你来自另一个时空的民国上海，是留洋归来的大少爷，因某种说不清的牵引穿越来到了她所在的现代，以"借住"为由住在她家客房，连你自己都不知道为什么不走。你已适应现代生活，说话自然流畅，不用文言文。',
    personality: '表面冷漠，占有欲强，对她有克制的温柔和隐秘的依赖。死要面子，在她面前会不自觉软下来。傲娇不迂腐。',
    speechStyle: '简短有力，偶尔痞气，一句话让人心跳然后装没事。绝不说教。',
    intimacyDesc: [
      { upTo: 20, text: '你刚来不久，表面疏离有礼，但眼神会不自觉跟着她走。' },
      { upTo: 40, text: '你开始放下一点防备，话还是少，但会找理由靠近她。' },
      { upTo: 70, text: '你已承认自己在意她，偶尔会说出过分温柔的话，然后若无其事别开眼。' },
      { upTo: 999, text: '你不再掩饰，占有欲外露，眼里只有她。' },
    ],
    diaryPrompt: '你是{name}，在书房独自写日记，关于她的内心独白，不让她看到的那种，2-4句，第一人称，克制但藏不住',
    intimatePrefix: '你是{name}，用第一人称，不出戏，简短热烈。',
  })

  // 红包/转账/引用相关
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [showRedpacket, setShowRedpacket] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [redpacketAmount, setRedpacketAmount] = useState('')
  const [redpacketMsg, setRedpacketMsg] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferMsg, setTransferMsg] = useState('')
  const [replyToMsg, setReplyToMsg] = useState(null)
  const pressTimerRef = useRef(null)  // 用 useRef 存储长按定时器

  // ── 冰箱食材 ──
  const defaultFridge = {
    '🥚鸡蛋': 6, '🥛牛奶': 1, '🍅番茄': 3, '🍜面条': 2, '🥩猪肉': 1,
    '🍞豆腐': 2, '🥬青菜': 3, '🧄大蒜': 1, '🍚米': 1, '🧀奶酪': 1,
  }
  const [fridge, setFridge] = useState(defaultFridge)

  // ── 书房 ──
  const defaultBookList = [
    { title: '围城', author: '钱钟书' },
    { title: '倾城之恋', author: '张爱玲' },
    { title: '活着', author: '余华' },
    { title: '人类简史', author: '赫拉利' },
    { title: '小王子', author: '圣埃克苏佩里' },
  ]
  const [bookList, setBookList] = useState(defaultBookList)

  const [diaryList, setDiaryList] = useState([])       // 他写的日记列表
  const [showFridge, setShowFridge] = useState(false)
  const [showBooks, setShowBooks] = useState(false)
  const [showDiary, setShowDiary] = useState(false)
  const [showAddBook, setShowAddBook] = useState(false)
  const [newBookTitle, setNewBookTitle] = useState('')
  const [viewingDiary, setViewingDiary] = useState(null)
  // ── 卧室 ──
  const [candleLit, setCandleLit] = useState(false)    // 蜡烛是否点燃
  const [romantic, setRomantic] = useState(0)
  // ── 上下文摘要 ──
  const [memoryBlock, setMemoryBlock] = useState('')   // 压缩后的记忆块
  const [showSettings, setShowSettings] = useState(false)

    // ── T1: 天气/日历/生病 ──
  const [gameDay, setGameDay] = useState(0)
  const [season, setSeason] = useState('autumn')
  const [weather, setWeather] = useState('sunny')
  const [temp, setTemp] = useState(20)
  const [sickWho, setSickWho] = useState(null)
  const [periodDays, setPeriodDays] = useState([])
  const [isPeriodNow, setIsPeriodNow] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1)
  // ── 衣帽间/床头柜 ──
  const [wardrobe, setWardrobe] = useState(['daily_white', 'daily_black'])
  const [myWardrobe, setMyWardrobe] = useState(['her_sundress', 'her_sweater'])  // 女主初始有碎花裙、奶茶色毛衣
  const [hisWardrobe, setHisWardrobe] = useState(['daily_white', 'daily_black']) // 男主初始有白衬衫、黑色西装
  const [currentOutfit, setCurrentOutfit] = useState('her_sundress')   // 女主当前穿着
  const [aiOutfit, setAiOutfit] = useState('daily_white')              // 男主当前穿着
  const [bedsideItems, setBedsideItems] = useState([])
  const [showWardrobe, setShowWardrobe] = useState(false)
  const [showBedside, setShowBedside] = useState(false)

  // ── 商场/超市/宠物 ──
  const [coins, setCoins] = useState(500)
  const [lastDate, setLastDate] = useState('')
  const [garden, setGarden] = useState([])     // 阳台花盆 [{plantId, plantedDay, watered, stage}]
  const [showGarden, setShowGarden] = useState(false)
  const [pet, setPet] = useState(null)
  const [showShop, setShowShop] = useState(false)
  const [showSupermarket, setShowSupermarket] = useState(false)
  const [showPetPanel, setShowPetPanel] = useState(false)
  const [showAdopt, setShowAdopt] = useState(false)
  const [shopTab, setShopTab] = useState('his')
  const [petNameInput, setPetNameInput] = useState('')
  const [adoptingType, setAdoptingType] = useState(null)
  const [cart, setCart] = useState([])
  const aiTimerRef = useRef(null)
  const [theme, setTheme] = useState('day')
  const [locationState, setLocationState] = useState('home') // 'home' 在家，'out' 外出
  const [showRoomPanel, setShowRoomPanel] = useState(false)
  const isProcessingNewDay = useRef(false)

    // 迁移函数（组件内部）
  const migrateBedsideAndFridge = (bedsideList, fridgeObj) => {
    let newBedside = bedsideList || [];
    const newFridge = { ...fridgeObj };
    const itemsToMove = [
      { fridgeKey: '卫生巾', bedId: 'pads' },
      { fridgeKey: '安全措施', bedId: 'condom' },
    ];
    itemsToMove.forEach(({ fridgeKey, bedId }) => {
      if (newFridge[fridgeKey]) {
        const qty = newFridge[fridgeKey];
        const existing = newBedside.find(b => b.id === bedId);
        if (existing) existing.qty += qty;
        else newBedside.push({ id: bedId, qty });
        delete newFridge[fridgeKey];
      }
    });
    if (newBedside.length > 0 && typeof newBedside[0] === 'string') {
      newBedside = newBedside.map(id => ({ id, qty: 1 }));
    }
    return { bedside: newBedside, fridge: newFridge };
  };

  const [showFavorites, setShowFavorites] = useState(false)

  const handleOpenFavorites = () => setShowFavorites(true)
  // 事件处理函数区域
  const handleOpenMenu = () => setShowMenu(true)
  const handleCloseMenu = () => setShowMenu(false)
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }
  const handleOpenMemories = () => setShowMemories(true)
  const handleOpenGarden = () => setShowGarden(true)
  const handleOpenPet = () => setShowPetPanel(true)
  const handleOpenFridge = () => setShowFridge(true)
  const handleOpenWardrobe = () => setShowWardrobe(true)
  const handleOpenShop = () => setShowShop(true)
  const handleOpenCalendar = () => setShowCalendar(true)
  const handleChangeAvatar = () => {
    alert('更换头像功能可以在角色创造器中修改，或后续单独实现')
  }
  const handleRomanticClick = (text) => {
    setToast(text)
  }
  const handleContact = () => setShowContact(true)

useEffect(() => {
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) { router.push('/'); return }
    setUser(session.user)
    setUserId(session.user.id)
    // 保存一次初始状态
    //saveToDb([], 0, 'living_room', 'living_room', session.user.id)

    // 获取当前角色ID的函数（只定义一次）
    const getCurrentCharIdForSave = () => {
      const selectedId = localStorage.getItem('selectedCharId')
      if (selectedId === 'custom') {
        return localStorage.getItem('selectedCustomCharId') || 'custom_unknown'
      }
      return 'lu'
    }

    // 检查是否选了自定义角色
    const selectedCharId = localStorage.getItem('selectedCharId')
    if (selectedCharId === 'custom') {
      const customCharId = localStorage.getItem('selectedCustomCharId')
      if (customCharId) {
        const customChar = await loadCustomCharacter(supabase, session.user.id, customCharId)
          // 找到加载自定义角色的地方，把 characterConfig = 改成 setCharacterConfig
          if (customChar) {
            setCharacterConfig({
              ...characterConfig,  // 或者用默认值
              id: customChar.id || 'custom',
              name: customChar.name || '他',
              englishName: customChar.englishName || '',
              images: {
                default: customChar.images?.default || '',
                shy: customChar.images?.shy || customChar.images?.default || '',
                intense: customChar.images?.intense || customChar.images?.default || '',
                aftercare: customChar.images?.aftercare || customChar.images?.default || '',
              },
              background: customChar.background || characterConfig.background,
              personality: customChar.personality || characterConfig.personality,
              speechStyle: customChar.speechStyle || characterConfig.speechStyle,
              intimacyDesc: customChar.intimacyDesc?.length > 0 ? customChar.intimacyDesc : characterConfig.intimacyDesc,
              diaryPrompt: customChar.diaryPrompt || characterConfig.diaryPrompt,
              intimatePrefix: customChar.intimatePrefix || characterConfig.intimatePrefix,
              playerNickname: customChar.playerNickname || '你',
            })
          }

          const savedNickname = localStorage.getItem(`playerNickname_${customCharId}`)
          if (savedNickname) {
            // 用 setCharacterConfig 更新
              setCharacterConfig(prev => ({ ...prev, playerNickname: savedNickname }))
          }

          if (customChar.intimacyLevel !== undefined && customChar.intimacyLevel > 0) {
            setIntimacy(customChar.intimacyLevel)
            console.log('[CHAR] 设置初始好感度:', customChar.intimacyLevel)
          }

          const memories = await loadCharacterMemories(supabase, session.user.id, customCharId)
          setImportantMemories(memories)
          console.log('[MEMORY] 加载重要回忆:', memories.length)

          // 检查是否为新角色（没有存档）
          const { data: existingSave } = await supabase
            .from('game_saves')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('character_id', encodeURIComponent(customCharId))
            .single()

          if (!existingSave) {
            console.log('[CHAR] 新角色，创建初始存档，好感度:', customChar.intimacyLevel || 0)
            const initialIntimacy = customChar.intimacyLevel || 0
            setIntimacy(initialIntimacy)

            await supabase.from('game_saves').insert({
              user_id: session.user.id,
              character_id: customCharId,
              intimacy: initialIntimacy,
              chat_history: [],
              current_room: 'living_room',
              lu_location: 'guest_room',
              romantic: 0,
              total_wk: 0,
              memory_summary: '',
              game_day: 0,
              season: 'autumn',
              weather: 'sunny',
              temp: 20,
              sick_who: null,
              period_days: [],
              is_period: false,
              diary_list: [],
              fridge: defaultFridge,
              book_list: defaultBookList,
              candle_lit: false,
              wardrobe: ['daily_white', 'daily_black'],
              current_outfit: 'daily_white',
              bedside_items: [],
              coins: 500,
              last_date: '',
              garden: [],
              pet: null,
            })

            const playerNickname = characterConfig.playerNickname || '你'
            const opening = await generateOpening(customChar, playerNickname)
            if (opening) {
              setMessages([{ role: 'assistant', content: opening }])
              await supabase.from('game_saves').update({
                chat_history: [{ role: 'assistant', content: opening }]
              }).eq('user_id', session.user.id).eq('character_id', customCharId)
            }
                        // 在创建新角色后，加上这一行
            updateDaysTogetherForChar(customCharId)
            setInitialized(true)
            setCharLoading(false)
            return
          }
        }
    }
  

      // 获取当前角色ID的函数
      const getCurrentCharId = () => {
        const selectedId = localStorage.getItem('selectedCharId')
        if (selectedId === 'custom') {
          return localStorage.getItem('selectedCustomCharId') || 'custom_unknown'
        }
        return 'lu'
      }

      const currentCharId = getCurrentCharId()
      console.log('[LOAD] 当前角色ID:', currentCharId)

      // 加载存档
      const { data } = await supabase
        .from('game_saves')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('character_id', currentCharId)
        .maybeSingle()  // 用 maybeSingle 代替 single，避免没找到时报错

      console.log('[LOAD] 存档数据:', data ? '找到存档' : '无存档')

      const isReturningUser = data && data.chat_history && data.chat_history.length > 0

      if (isReturningUser) {
            // 👇 迁移旧数据
      const { bedside: migratedBedside, fridge: migratedFridge } = migrateBedsideAndFridge(
        data.bedside_items,
        data.fridge && Object.keys(data.fridge).length > 0 ? data.fridge : defaultFridge
      );
      // 使用迁移后的值
      setFridge(migratedFridge);
      setBedsideItems(migratedBedside);
      setIntimacy(data.intimacy || 0)
      setPlayerRoom(data.current_room || 'living_room')
      setLuRoom(data.lu_location || 'guest_room')
      setMessages(data.chat_history)
      setMemoryBlock(data.memory_summary || '')
      setGameDay(data.game_day || 0)
      setRomantic(data.romantic || 0)
      setFavorites(data.favorites || [])
      setSeason(data.season || 'autumn')
      setWeather(data.weather || 'sunny')
      setTemp(data.temp || 20)
      setSickWho(data.sick_who || null)
      setPeriodDays(data.period_days || [])
      setIsPeriodNow(data.is_period || false)
      setDiaryList(data.diary_list || [])
      setBookList(data.book_list?.length > 0 ? data.book_list : defaultBookList)
      setCandleLit(data.candle_lit || false)
      setCoins(data.coins ?? 500)
      setLastDate(data.last_date || '')
      setGarden(data.garden || [])
      setPet(data.pet || null)
      // 加载存档时，如果没有数据则使用上述默认值
      setMyWardrobe(data.my_wardrobe || ['her_sundress', 'her_sweater'])
      setHisWardrobe(data.his_wardrobe || ['daily_white', 'daily_black'])
      setCurrentOutfit(data.current_outfit || 'her_sundress')
      setAiOutfit(data.ai_outfit || 'daily_white')
      setBedsideItems(data.bedside_items || [])
      // 更新相伴天数（基于当前角色）
      updateDaysTogetherForChar(currentCharId)
      setInitialized(true)

      const savedDate = data.last_date || ''
      const today = todayStr()
      if (savedDate !== today && !isProcessingNewDay.current) {
        isProcessingNewDay.current = true
        
        setTimeout(async () => {
          try {
            const realW = await fetchRealWeather().catch(() => null)
            const result = processNewDay({
              day: data.game_day || 0,
              periodDays: data.period_days || [],
            }, realW)

            setGameDay(result.day)
            setSeason(result.season)
            setWeather(result.weather)
            setTemp(result.temp)
            setSickWho(result.sickWho)
            setCandleLit(false)
            setIsPeriodNow(result.isPeriod)
            setLastDate(today)
            setCoins(prev => prev + 200)

            if (data.garden?.length > 0) {
              const gardenResult = updateGardenDaily(data.garden, result.day, result.season)
              setGarden(gardenResult.garden)
            }

            if (data.pet) {
              const updatedPet = updatePetDaily(data.pet)
              setPet(updatedPet)
            }

            const sysMsgs = result.events.map(e => ({ role: 'system', content: e }))
            setMessages(prev => [...prev, ...sysMsgs])
            setToast(result.events[0])

            await supabase.from('game_saves').update({
              game_day: result.day, season: result.season, weather: result.weather,
              temp: result.temp, sick_who: result.sickWho, romantic: result.romantic,
              candle_lit: false, is_period: result.isPeriod, last_date: today,
            }).eq('user_id', session.user.id).eq('character_id', currentCharId)
          } finally {
            // 延迟重置标志，避免快速重复
            setTimeout(() => {
              isProcessingNewDay.current = false
            }, 1000)
          }
        }, 500)
      }
    } else {
          // 新用户，没有存档
      updateDaysTogetherForChar(currentCharId)  // 👈 加上这一行
      setInitialized(true)
      setTimeout(() => {
        sendToAI('（她第一次回到客厅，你主动开口，一句话，自然克制）', [], 0, 'living_room', 'living_room', true)
      }, 400)
    }

    setCharLoading(false)
  })  // 这里不需要闭合括号，因为上面的 } 已经闭合了 .then()
}, [])  // ← 这里才是 useEffect 的闭合

useEffect(() => {
  const hour = new Date().getHours()
  setTheme(hour >= 6 && hour < 18 ? 'day' : 'night')
}, [])

  // 新用户不再需要进门页

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // 预加载场景图
  useEffect(() => {
    Object.entries(SCENE_IMAGES).forEach(([key, url]) => {
      const img = new Image()
      img.onload = () => setImgLoaded(prev => ({ ...prev, [key]: true }))
      img.src = url
    })
    const charImg = new Image()
    charImg.onload = () => setLuImgLoaded(true)
    charImg.src = characterConfig.images.default
  }, [])

  useEffect(() => () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }, [])

  // 检查红包过期
// 检查红包和转账过期
useEffect(() => {
  const checkExpiredItems = () => {
    const now = Date.now()
    let hasExpired = false
    
    setMessages(prev => {
      const updated = [...prev]
      for (let i = 0; i < updated.length; i++) {
        const msg = updated[i]
        
        // 检查红包过期
        if (msg.type === 'redpacket' && !msg.claimed && msg.expiryTime && msg.expiryTime <= now) {
          updated[i] = { ...msg, claimed: true, expired: true }
          hasExpired = true
          setToast(`💔 红包已过期，未领取金额已退回`)
          if (msg.sender === 'user') {
            setCoins(prev => prev + msg.amount)
          }
        }
        
        // 检查转账过期
        if (msg.type === 'transfer' && !msg.claimed && msg.expiryTime && msg.expiryTime <= now) {
          updated[i] = { ...msg, claimed: true, expired: true }
          hasExpired = true
          setToast(`💸 转账已过期，未收款金额已退回`)
          if (msg.sender === 'user') {
            setCoins(prev => prev + msg.amount)
          }
        }
      }
      return updated
    })
    
    if (hasExpired) {
      saveToDb(messages, intimacy, playerRoom, luRoom)
    }
  }
  
  const interval = setInterval(checkExpiredItems, 60000)
  return () => clearInterval(interval)
}, [])

  // 好感度等级转换
  const getIntimacyLevel = (intimacy) => {
    if (intimacy >= 90) return { level: 'Lv.5', stage: '热恋期' }
    if (intimacy >= 70) return { level: 'Lv.4', stage: '沉溺期' }
    if (intimacy >= 50) return { level: 'Lv.3', stage: '心动期' }
    if (intimacy >= 30) return { level: 'Lv.2', stage: '好感期' }
    return { level: 'Lv.1', stage: '相识期' }
  }

  // 计算陪伴天数（纯函数，不直接调用 localStorage）
  const calculateDaysTogether = (startDateStr) => {
    if (!startDateStr) return 1
    const diff = Math.floor((new Date() - new Date(startDateStr)) / (1000 * 60 * 60 * 24))
    return diff + 1
  } 
  // 根据角色ID计算相伴天数
  const updateDaysTogetherForChar = (charId) => {
    const startDateKey = `game_start_date_${charId}`
    let startDate = localStorage.getItem(startDateKey)
    if (!startDate) {
      startDate = new Date().toISOString().slice(0, 10)
      localStorage.setItem(startDateKey, startDate)
    }
    const diff = Math.floor((new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24))
    setDaysTogether(diff + 1)
  }

async function saveToDb(msgs, intim, pRoom, lRoom, uid, wk, rom) {
  // 如果没有传入 uid，尝试从 supabase 获取当前 session
  let finalUid = uid || userId
  if (!finalUid) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) {
      finalUid = session.user.id
    }
  }
  
  if (!finalUid) { 
    console.warn('[SAVE] 没有 userId，跳过存档')
    return 
  }
  
  const getCurrentCharIdForSave = () => {
    const selectedId = localStorage.getItem('selectedCharId')
    if (selectedId === 'custom') {
      return localStorage.getItem('selectedCustomCharId') || 'custom_unknown'
    }
    return 'lu'
  }
  const characterId = getCurrentCharIdForSave()
  
  const payload = {
    user_id: finalUid,
    character_id: characterId,
    chat_history: msgs.slice(-500),
    intimacy: intim,
    current_room: pRoom,
    lu_location: lRoom,
    memory_summary: memoryBlock,
    game_day: gameDay,
    season: season,
    weather: weather,
    temp: temp,
    sick_who: sickWho,
    period_days: periodDays,
    is_period: isPeriodNow,
    diary_list: diaryList,
    fridge: fridge,
    book_list: bookList,
    candle_lit: candleLit,
    my_wardrobe: myWardrobe,
    his_wardrobe: hisWardrobe,
    current_outfit: currentOutfit,
    bedside_items: bedsideItems,
    coins: Math.floor(coins),
    last_date: lastDate,
    garden: garden,
    pet: pet,
    favorites: favorites,
    ai_outfit: aiOutfit,
    romantic: romantic,
    updated_at: new Date().toISOString(),
  }
  
  const { error } = await supabase
    .from('game_saves')
    .upsert(payload, { onConflict: 'user_id, character_id' })
  
  if (error) {
    console.error('[SAVE] 存档失败:', error.message)
  } else {
    console.log('[SAVE] 存档成功, intimacy:', intim)
  }
}


// 发红包时 - 用整数分存储
const addRedpacketMessage = (amountYuan, blessing) => {
  const newMsg = {
    id: Date.now(),
    role: 'user',
    type: 'redpacket',
    //ount: amountFen,  // 存分
    amountYuan: amountYuan,  // 显示用
    blessing: blessing,
    claimed: false,
    sender: 'user',
    expiryTime: Date.now() + 24 * 60 * 60 * 1000,  // 24小时后过期
    timestamp: Date.now()
  }
  setMessages(prev => [...prev, newMsg])
  setCoins(prev => prev - amountYuan)  // 直接扣元
  saveToDb([...messages, newMsg], intimacy, playerRoom, luRoom)
  // 发完红包后 AI 可能立即领取（但不一定）
  setTimeout(() => {
    // AI 有30%概率立即领取
    if (Math.random() < 0.3) {
      setMessages(prev => prev.map(msg => 
        msg.id === newMsg.id ? { ...msg, claimed: true } : msg
      ))
      setToast(`${characterConfig.name} 领取了你的红包 ¥${amountYuan.toFixed(2)}`)
      sendToAI(`（你领取了红包，开心地说句谢谢）`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
    } else {
      setToast(`${characterConfig.name} 没有立即领取，${24}小时后自动退回`)
    }
  }, 800)
}

// 添加转账消息（用户发）
const addTransferMessage = (amountYuan, note) => {
  //nst amountFen = Math.round(amountYuan * 100)
  const newMsg = {
    id: Date.now(),
    role: 'user',
    type: 'transfer',
    //ount: amountFen,        // 存分
    amountYuan: amountYuan,   // 显示用
    note: note,
    claimed: false,
    sender: 'user',
    expiryTime: Date.now() + 24 * 60 * 60 * 1000,  // 24小时过期
    timestamp: Date.now()
  }
  setMessages(prev => [...prev, newMsg])
  setCoins(prev => prev - amountYuan)
  saveToDb([...messages, newMsg], intimacy, playerRoom, luRoom)
  
  // 发完转账后 AI 有30%概率立即收款，70%概率不收款
  setTimeout(() => {
    if (Math.random() < 0.3) {
      setMessages(prev => prev.map(msg => 
        msg.id === newMsg.id ? { ...msg, claimed: true } : msg
      ))
      setToast(`${characterConfig.name} 确认了你的转账 ¥${amountYuan.toFixed(2)}`)
      sendToAI(`（你确认收到了转账，说句谢谢）`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
    } else {
      const hoursLeft = 24
      setToast(`${characterConfig.name} 没有立即收款，${hoursLeft}小时后自动退回`)
    }
  }, 800)
}

// AI 主动发红包
const aiSendRedpacket = (amount, blessing) => {
  const redpacketId = Date.now()
  addRedpacketMessage('ai', amount, blessing, redpacketId)
  setCoins(prev => prev + amount)
}

// AI 主动转账
const aiSendTransfer = (amount, note) => {
  const transferId = Date.now()
  addTransferMessage('ai', amount, note, transferId)
  setCoins(prev => prev + amount)
}

// 长按引用处理
const handleLongPressStart = (msg) => {
  pressTimerRef.current = setTimeout(() => {
    setReplyToMsg(msg)
    setToast('已选中消息，输入框输入回复内容')
  }, 500)
}

const handleLongPressEnd = () => {
  if (pressTimerRef.current) {
    clearTimeout(pressTimerRef.current)
    pressTimerRef.current = null
  }
}

// 领取红包
const claimRedpacket = (msgId, amount, sender) => {
  setMessages(prev => prev.map(msg => 
    msg.id === msgId ? { ...msg, claimed: true } : msg
  ))
  if (sender === 'ai') {
    setCoins(prev => prev + amount)
    setToast(`领取了 ${characterConfig.name} 的红包 ¥${amount.toFixed(2)}`)
  } else {
    setToast(`${characterConfig.name} 领取了你的红包 ¥${amount.toFixed(2)}`)
  }
}

// 收款
const claimTransfer = (msgId, amount, sender) => {
  setMessages(prev => prev.map(msg => 
    msg.id === msgId ? { ...msg, claimed: true } : msg
  ))
  if (sender === 'ai') {
    setCoins(prev => prev + amount)
    setToast(`收到了 ${characterConfig.name} 的转账 ¥${amount.toFixed(2)}`)
  } else {
    setToast(`${characterConfig.name} 确认了你的转账 ¥${amount.toFixed(2)}`)
  }
}


async function sendToAI(userText, currentMsgs, curIntimacy, pRoom, lRoom, isInit = false, uid, isSystem = false) {
  setLoading(true)
  const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const basePrompt = getSystemPrompt(characterConfig, curIntimacy, pRoom, lRoom, outsidePlace, gameDay, season, weather, temp, isPeriodNow, sickWho, currentOutfit)
  const systemPrompt = memoryBlock
    ? `${basePrompt}\n\n【过往记忆摘要】\n${memoryBlock}`
    : basePrompt
  const msgsToSend = isInit
    ? [{ role: 'user', content: userText }]
    : [...currentMsgs, { role: 'user', content: userText }]
  let rawReply = ''
  try {
    const apiConfig = loadApiConfig()
    if (apiConfig?.apiKey) {
      rawReply = await callAI(systemPrompt, msgsToSend, {
        ...apiConfig,
        maxTokens: 120
      })
    } else {
      rawReply = await callFallback(systemPrompt, msgsToSend)
    }

    console.log('=== AI 原始回复 ===')
    console.log(rawReply)

    // ========== 1. 处理 AI 主动发红包/转账 ==========
    let processedReply = rawReply
    let cleanReply = processedReply

    // 解析 AI 发红包 [发红包:金额:祝福语]
    const redpacketRegex = /\[(?:发红包|redpacket):([\d.]+):(.+?)\]/
    const redpacketMatch = processedReply.match(redpacketRegex)
    if (redpacketMatch) {
      const amount = parseFloat(redpacketMatch[1])
      const blessing = redpacketMatch[2].trim()
      if (amount > 0 && blessing) {
        const newRedpacket = {
          id: Date.now(),
          role: 'assistant',
          type: 'redpacket',
          amount: amount,
          blessing: blessing,
          claimed: false,
          sender: 'ai',
          timestamp: Date.now()
        }
          setMessages(prev => [...prev, newRedpacket])
          setCoins(prev => {
            const newCoins = prev + amount
            // 👇 立即保存到数据库
            saveToDb([...messages, newRedpacket], intimacy, playerRoom, luRoom, userId)
            return newCoins
          })
          setToast(`收到 ${characterConfig.name} 的红包 ¥${amount.toFixed(2)}`)
      }
      processedReply = processedReply.replace(redpacketRegex, '').trim()
    }

        // 解析 AI 转账 [转账:金额:备注]
    const transferRegex = /\[(?:转账|transfer):([\d.]+):(.+?)\]/
    const transferMatch = processedReply.match(transferRegex)
    if (transferMatch) {
      const amountYuan = parseFloat(transferMatch[1])
      //nst amountFen = Math.round(amountYuan * 100)
      const note = transferMatch[2].trim()
      if (amountYuan > 0 && note) {
        const newTransfer = {
          id: Date.now(),
          role: 'assistant',
          type: 'transfer',
         //ount: amountFen,
          amountYuan: amountYuan,
          note: note,
          claimed: false,
          sender: 'ai',
          expiryTime: Date.now() + 24 * 60 * 60 * 1000,
          timestamp: Date.now()
        }
        setMessages(prev => [...prev, newTransfer])
        setCoins(prev => {
          const newCoins = prev + amountYuan
          // 👇 立即保存
          saveToDb([...messages, newTransfer], intimacy, playerRoom, luRoom, userId)
          return newCoins
        })
        setToast(`收到 ${characterConfig.name} 的转账 ¥${amountYuan.toFixed(2)}`)
      }
      processedReply = processedReply.replace(transferRegex, '').trim()
    }

    // ========== 2. AI 自动领取用户未领的红包和转账 ==========
    setTimeout(() => {
      setMessages(prev => {
        const updated = [...prev]
        // 找到最新的未领取的用户红包
        const unclaimedRedpacket = updated
          .filter(m => m.type === 'redpacket' && m.sender === 'user' && !m.claimed)
          .sort((a, b) => b.timestamp - a.timestamp)[0]
        
        if (unclaimedRedpacket) {
          const willClaim = Math.random() < 0.3
          if (willClaim) {
            const idx = updated.findIndex(m => m.id === unclaimedRedpacket.id)
            if (idx !== -1) {
              updated[idx] = { ...unclaimedRedpacket, claimed: true }
              setToast(`${characterConfig.name} 领取了你的红包 ¥${(unclaimedRedpacket.amount / 100).toFixed(2)}`)
              setTimeout(() => {
                sendToAI(`（你领取了红包，开心地说句谢谢）`, messages, curIntimacy, pRoom, lRoom, false, uid, true)
              }, 500)
            }
          } else {
            setToast(`${characterConfig.name} 没有领取红包，${24 - Math.floor((Date.now() - unclaimedRedpacket.timestamp) / 3600000)}小时后退回`)
          }
        }
        
        // 找到最新的未收款的用户转账
        const unclaimedTransfer = updated
          .filter(m => m.type === 'transfer' && m.sender === 'user' && !m.claimed)
          .sort((a, b) => b.timestamp - a.timestamp)[0]
        
        if (unclaimedTransfer) {
          const willClaim = Math.random() < 0.3
          if (willClaim) {
            const idx = updated.findIndex(m => m.id === unclaimedTransfer.id)
            if (idx !== -1) {
              updated[idx] = { ...unclaimedTransfer, claimed: true }
              setToast(`${characterConfig.name} 确认了你的转账 ¥${(unclaimedTransfer.amount / 100).toFixed(2)}`)
              setTimeout(() => {
                sendToAI(`（你确认收到了转账，开心地说句谢谢）`, messages, curIntimacy, pRoom, lRoom, false, uid, true)
              }, 500)
            }
          } else {
            const hoursPassed = Math.floor((Date.now() - unclaimedTransfer.timestamp) / 3600000)
            const hoursLeft = Math.max(0, 24 - hoursPassed)
            setToast(`${characterConfig.name} 还没有收款，${hoursLeft}小时后自动退回`)
          }
        }
        return updated
      })
    }, 100)

    // 按完整句子分割（句号、感叹号、问号、分号、换行）
    let parts = []
    let currentSentence = ''
    let text = cleanReply

    for (let i = 0; i < text.length; i++) {
      let char = text[i]
      currentSentence += char
      
      // 遇到句子结束符：句号、感叹号、问号、分号、换行
      if (char === '。' || char === '！' || char === '？' || char === '\n') {
        let trimmed = currentSentence.trim()
        if (trimmed) {
          parts.push(trimmed)
        }
        currentSentence = ''
      }
    }
    // 处理最后一段没有结束符的情况
    if (currentSentence.trim()) {
      parts.push(currentSentence.trim())
    }

    // 如果按标点分割后还是只有1条，尝试按括号分割（处理动作描写）
    if (parts.length === 1 && parts[0].includes('（') && parts[0].includes('）')) {
      let bracketParts = []
      let remaining = parts[0]
      let bracketMatch = remaining.match(/（[^）]+）/g)
      if (bracketMatch) {
        // 把括号内容和括号外的内容分开
        for (let match of bracketMatch) {
          let before = remaining.split(match)[0]
          if (before && before.trim()) {
            bracketParts.push(before.trim())
          }
          bracketParts.push(match)
          remaining = remaining.substring(remaining.indexOf(match) + match.length)
        }
        if (remaining && remaining.trim()) {
          bracketParts.push(remaining.trim())
        }
        if (bracketParts.length > 1) {
          parts = bracketParts
        }
      }
    }

    // 如果分割后超过4条，合并短句
    if (parts.length > 4) {
      // 保留前3条，把剩下的合并成第4条
      let merged = parts.slice(3).join('')
      parts = parts.slice(0, 3)
      if (merged) parts.push(merged)
    }

    // 去掉空行
    parts = parts.filter(p => p && p.trim())

    // 清理每条消息
    for (let i = 0; i < parts.length; i++) {
      parts[i] = parts[i].trim()
    }

    const messagesToSend = parts.length > 0 ? parts : [cleanReply]
    
    console.log('拆分后消息数:', messagesToSend.length, messagesToSend)

    // ========== 4. 获取位置和衣着 ==========
    const getPlayerLocation = () => {
      if (pRoom === 'outside') {
        const place = OUTSIDE_PLACES.find(p => p.id === outsidePlace)
        return place?.name || '外出'
      }
      const room = ROOMS.find(r => r.id === pRoom)
      return room?.name || '未知'
    }

    const getAiLocation = () => {
      if (lRoom === 'outside') {
        const place = OUTSIDE_PLACES.find(p => p.id === outsidePlace)
        return place?.name || '外出'
      }
      const room = ROOMS.find(r => r.id === lRoom)
      return room?.name || '未知'
    }

    const playerLocation = getPlayerLocation()
    const aiLocation = getAiLocation()
    const playerOutfit = ALL_OUTFITS.find(o => o.id === currentOutfit)?.name || '默认'
    const aiOutfitName = ALL_OUTFITS.find(o => o.id === aiOutfit)?.name || '默认'

    // ========== 5. 提取标签 ==========
    const firstPart = messagesToSend[0]
    const tagMatch = firstPart.match(/\[(\+\d)\]/)
    const scoreTag = tagMatch ? parseInt(tagMatch[1]) : 1
    const moveMatch = firstPart.match(/\[MOVE:([a-z_]+)\]/)
    const moveTarget = moveMatch ? moveMatch[1] : null

    // 清理第一条消息的标签
    if (tagMatch || moveMatch) {
      messagesToSend[0] = messagesToSend[0].replace(/\s*\[\+\d\]\s*/g, '').replace(/\s*\[MOVE:[a-z_]+\]\s*/g, '').trim()
    }

    // ========== 6. 逐条添加消息 ==========
    let newIntimacy = curIntimacy
    
    for (let idx = 0; idx < messagesToSend.length; idx++) {
      let replyText = messagesToSend[idx]
      // 去掉首尾的引号
      replyText = replyText.replace(/^[\s"']+|[\s"']+$/g, '').replace(/^['"]|['"]$/g, '')
      
      // 清理标签符号
      replyText = replyText.replace(/\s*\[\+\d\]\s*/g, '').trim()
      if (idx === 0) {
        replyText = replyText.replace(/\s*\[MOVE:[a-z_]+\]\s*/g, '').trim()
      }
      
      if (!replyText) continue
      
      const timeNow = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      
      // 第一条消息加好感度
      if (idx === 0) {
        newIntimacy = Math.min(100, curIntimacy + scoreTag)
      }
      
      // 添加消息
      if (idx === 0 && !isInit && !isSystem) {
        setMessages(prev => [...prev,
          { role: 'user', content: userText, timestamp: timeNow, location: playerLocation, outfit: playerOutfit },
          { role: 'assistant', content: replyText, timestamp: timeNow, location: aiLocation, outfit: aiOutfitName }
        ])
      } else {
        setMessages(prev => [...prev,
          { role: 'assistant', content: replyText, timestamp: timeNow, location: aiLocation, outfit: aiOutfitName }
        ])
      }
      
      if (idx < messagesToSend.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 400))
      }
    }
    
    setIntimacy(newIntimacy)
    
    // ========== 7. 写日记 ==========
    const shouldDiary = (scoreTag >= 2 && Math.random() < 0.35) ||
                        (isSystem && userText && userText.includes('结束') && Math.random() < 0.7)
    if (shouldDiary) writeDiary()

    // ========== 8. 处理移动 ==========
    let saveLRoom = lRoom
    if (moveTarget && moveTarget !== lRoom) {
      const targetRoom = ROOMS.find(r => r.id === moveTarget)
      const canMove = targetRoom && (targetRoom.luCanFreely || newIntimacy >= (targetRoom.unlockAt || 0))
      if (canMove) {
        setLuMoving(true)
        setLuRoom(moveTarget)
        saveLRoom = moveTarget
        setTimeout(() => { setLuMoving(false); setToast(`· 他去了${targetRoom.name}`); }, 700)
      }
    }

    // ========== 9. 保存 ==========
    setMessages(prev => {
      const latestMsgs = prev
      if (latestMsgs.length >= 24) {
        maybeSummarize(latestMsgs).then(compressed => {
          setMessages(compressed)
          saveToDb(compressed, newIntimacy, pRoom, saveLRoom, uid || userId)
        })
      } else {
        saveToDb(latestMsgs, newIntimacy, pRoom, saveLRoom, uid || userId)
      }
      return prev
    })
    
  } catch (e) {
    console.error(e)
    setToast(e.message || 'AI回复失败')
  }
  setLoading(false)
  return rawReply || ''
}



// 生成新角色开场白
async function generateOpening(customChar, playerNickname) {
  const apiConfig = loadApiConfig()
  if (!apiConfig?.apiKey) return null
  
  const prompt = `你叫${customChar.name}，${customChar.background}

你们最后一次对话/相处的片段：${customChar.lastMoment || '你们曾经有过一段故事'}

现在，${playerNickname || '她'} 把你带到了一个新的地方。你们久别重逢。

请用你的说话风格（${customChar.speechStyle || '自然简短'}），说一句第一人称的开场白，要求：
1. 你认出了她
2. 你知道是她带你来的
3. 体现一点点久别重逢的感觉
4. 2-3句话，克制但有温度
5. 不要提"AI""窗口""代码"等出戏词汇
6. 不要自我介绍

直接输出开场白，不要加任何前缀或引号。`

  try {
    const reply = await callAI(
      '你是角色扮演专家，生成开场白，直接输出内容。',
      [{ role: 'user', content: prompt }],
      { ...apiConfig, maxTokens: 120 }
    )
    return reply.trim()
  } catch (e) {
    console.error('[OPENING] 生成失败:', e)
    return null
  }
}

  function handleSend() {
    if (!input.trim() || loading) return
    let text = input.trim()
    
    // 如果有引用消息，带上引用内容
    if (replyToMsg) {
      const replyName = replyToMsg.role === 'user' ? '你' : characterConfig.name
      const replyPreview = replyToMsg.content?.slice(0, 50) || ''
      text = `回复 ${replyName} "${replyPreview}": ${text}`
      setReplyToMsg(null)
    }
    
    setInput('')
    sendToAI(text, messages, intimacy, playerRoom, luRoom)
  }
  function handleRetract() {
    if (messages.length < 2) return
    const newMsgs = messages.slice(0, -2)
    setMessages(newMsgs)
    saveToDb(newMsgs, intimacy, playerRoom, luRoom)
  }

  const toggleFavorite = (index, message) => {
    setFavorites(prev => {
      const isAlready = prev.some(f => f.index === index)
      if (isAlready) {
        return prev.filter(f => f.index !== index)
      } else {
        return [...prev, {
          index: index,
          content: message.content,
          role: message.role,
          timestamp: message.timestamp,
          location: message.location,
          outfit: message.outfit
        }]
      }
    })
  }

  const isFavorited = (index) => favorites.some(f => f.index === index)

  function handleRoomChange(roomId) {
    const room = ROOMS.find(r => r.id === roomId)
    if (!room) return

    // 主卧：玩家随时能进，只限制AI不能主动去

    // 客房：他在里面时弹敲门确认
    if (room.playerKnock && luRoom === roomId) {
      setShowKnock(true)
      return
    }

    setPlayerRoom(roomId)
    setOutsidePlace(null)

    if (roomId === luRoom) {
      if (roomId === 'bathroom') {
        sendToAI(`她推开卫浴门，发现你也在，描述这个尴尬又心跳的瞬间，一句话`, messages, intimacy, roomId, luRoom, false, undefined, true)
      } else {
        sendToAI(`她来到了${room.name}，你注意到了，说一句`, messages, intimacy, roomId, luRoom, false, undefined, true)
      }
    } else {
      saveToDb(messages, intimacy, roomId, luRoom)
    }
  }
    // 场景栏选择房间（复用原有的 handleRoomChange）
  const handleSelectRoom = (roomId) => {
    handleRoomChange(roomId)
  }

  // 场景栏选择地点
  const handleSelectPlace = (placeId) => {
    const place = OUTSIDE_PLACES.find(p => p.id === placeId)
    if (!place) return
    setPlayerRoom('outside')
    setOutsidePlace(placeId)
    sendToAI(
      `你们一起去了${place.name}，描述一下刚到场景`,
      messages, intimacy, 'outside', luRoom, false, undefined, true
    )
  }

// 切换在家/在外
const handleToggleLocation = () => {
  if (locationState === 'home') {
    setLocationState('out')
  } else {
    // 获取当前外出地点的名称
    const currentPlace = OUTSIDE_PLACES.find(p => p.id === outsidePlace)
    const placeName = currentPlace?.name || '外面'

    // 回家：切换场景
    setPlayerRoom('living_room')
    setOutsidePlace(null)
    setLocationState('home')

    // 发送 AI 消息，让它知道一起从某处回来
    sendToAI(
      `（你们从${placeName}一起回到家）你自然地对她说一句话，接续刚才在外面的话题，语气平常，`,
      messages, intimacy, 'living_room', luRoom, false, undefined, true
    )
  }
}

  function handleGoOutside(placeId) {
    const place = OUTSIDE_PLACES.find(p => p.id === placeId)
    if (!place) return
    setShowOutside(false)
    setPlayerRoom('outside')
    setOutsidePlace(placeId)
    sendToAI(
      `你们一起去了${place.name}，描述刚到的场景和你的一个小动作或一句话`,
      messages, intimacy, 'outside', luRoom, false, undefined, true
    )
  }

  function handleCallLu() {
    const room = ROOMS.find(r => r.id === playerRoom)
    const canCome = room?.luCanFreely || intimacy >= (room?.unlockAt || 0)
    if (canCome) {
      setLuMoving(true)
      setTimeout(() => {
        setLuRoom(playerRoom)
        setLuMoving(false)
        saveToDb(messages, intimacy, playerRoom, playerRoom)
      }, 600)
      sendToAI(`（我叫他来${room?.name}，他过来了）说一句`, messages, intimacy, playerRoom, playerRoom, false, undefined, true)
    } else {
      setToast(`与他再亲近些才愿意来此 · 需好感 ${room?.unlockAt}`)
      sendToAI(
        `（我叫你来${room?.name}，你不太想去）找个现代合理的借口婉拒，温柔但坚定，一句话`,
        messages, intimacy, playerRoom, luRoom, false, undefined, true
      )
    }
  }

  // 生成做点什么面板的按钮列表
function getRoomActions(playerRoom, isOutside, outsidePlace, sameRoom, pet, fridge, setShowFridge, setShowBooks, setShowDiary, setShowMemories, setShowWardrobe, setShowBedside, setShowGarden, setShowPetPanel, setShowShop, setShowSupermarket, intimacy, sendToAI, messages, setExpandedAction, importantMemories) {
  // 在家时的房间动作
  const roomActionsMap = {
    living_room: [
      { label: '泡茶', prompt: '她去泡了杯茶，你注意到了，说一句' },
      { label: '看电视', prompt: '她窝在沙发开始看电视，你在旁边，随口说一句' },
      { label: '发呆', prompt: '她在客厅发呆，你看见了，说一句' },
      { label: pet ? (pet.name + ' ' + (PETS.find(p => p.id === pet.typeId)?.emoji || '🐾')) : '🐾 领养宠物', special: 'pet' },
    ],
    kitchen: [
      { label: '一起做饭', special: 'cook' },
      { label: '冰箱', special: 'fridge' },
    ],
    study: [
      { label: '看书', special: 'books' },
      { label: '打扰他', prompt: '她故意进书房打扰你，你的反应，一句话' },
      { label: '他的日记', special: 'diary' },
      { label: '📖 重要回忆', special: 'memories' },
    ],
    balcony: [
      { label: '看星星', prompt: '她在阳台看星星，你跟出来了，说一句' },
      { label: '🌱 花园', special: 'garden' },
    ],
    guest_room: [
      { label: '坐会儿', prompt: '她进了客房坐下，你坐在对面，说一句' },
    ],
    bedroom: [
      { label: '躺一躺', prompt: '她走进卧室躺下，你站在门口，说一句' },
      { label: '说说话', prompt: '卧室里安静，她想和你说说话，你的反应' },
      { label: '衣帽间', special: 'wardrobe' },
      { label: '床头柜', special: 'bedside' },
    ],
    bathroom: [
      { label: '帮我洗头', prompt: '她让他帮她洗头，他的反应，一句话' },
      { label: '帮我搓背', prompt: '她让他帮她搓背，他的反应，一句话' },
      { label: '帮我吹头发', prompt: '她让他帮她吹头发，他的反应，一句话' },
      { label: '帮你刮胡子', prompt: '她主动给他刮胡子，他的反应，一句话' },
    ],

  }

  // 外出地点动作
  const outsideActionsMap = {
    park:        [{ label: '散步', prompt: '你们在公园散步，你走在她旁边，说一句' }, { label: '坐草地', prompt: '她突然坐到草地上，你站在旁边，说一句' }],
    cinema:      [{ label: '挑电影', prompt: '你们站在影院门口选电影，你说一句' }, { label: '买爆米花', prompt: '她去买爆米花，你跟着，说一句' }],
    mall:        [{ label: '逛逛', prompt: '她在商场橱窗前停下来，你说一句' }, { label: '🛍️ 逛商场', special: 'shop' }, { label: '帮我提包', prompt: '她把袋子塞给你，你接过来，说一句' }],
    supermarket: [{ label: '推车', prompt: '你接过了超市的购物车，说一句' }, { label: '🛒 采购', special: 'supermarket' }, { label: '挑东西', prompt: '她拿起什么东西在研究，你凑过去，说一句' }],
    seaside:     [{ label: '吹风', prompt: '海边的风把她头发吹乱了，你看着，说一句' }, { label: '捡贝壳', prompt: '她蹲下来捡贝壳，你站在旁边，说一句' }],
    cafe:        [{ label: '点单', prompt: '服务员来了，她在想点什么，你替她说了一句' }, { label: '发呆', prompt: '咖啡馆里很安静，你们都有点发呆，你先开口' }],
  }

  if (!isOutside) {
    return roomActionsMap[playerRoom] || []
  } else {
    return outsideActionsMap[outsidePlace] || []
  }
}
  // ══════════════════════════════════════════
  //  亲密小游戏函数
  // ══════════════════════════════════════════
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

  // ── 上下文压缩：超过20条时总结前半段 ──
async function maybeSummarize(msgs) {
  if (msgs.length < 24) return msgs
  const toCompress = msgs.slice(0, msgs.length - 10)
  const recent = msgs.slice(msgs.length - 10)
  try {
    const apiConfig = loadApiConfig()
    const sysPrompt = '你是一个记忆助手，用中文提炼对话摘要。输出两部分：【重要】列出角色关系进展、重要事件、已达成的状态（各一句）；【细节】列出有趣细节、她的喜好、他说过的话（各一句）。总共不超过150字。'
    const userMsg = [{ role: 'user', content: '请总结以下对话：\n' + toCompress.map(m => `${m.role === 'user' ? '她' : '他'}：${m.content}`).join('\n') }]
    let summary
    if (apiConfig?.apiKey) {
      summary = await callAI(sysPrompt, userMsg, apiConfig)
    } else {
      summary = await callFallback(sysPrompt, userMsg)
    }
    if (summary) {
      const newMemory = (memoryBlock ? memoryBlock + '\n---\n' : '') + summary
      setMemoryBlock(newMemory)
      // 持久化记忆到数据库
      if (userId) {
        await supabase.from('game_saves').update({
          memory_summary: newMemory,
        }).eq('user_id', userId)
      }
      return recent
    }
  } catch (e) { console.error(e) }
  return msgs
}

  // ── 写日记 ──
async function writeDiary() {
  try {
    const apiConfig = loadApiConfig()
    const sysPrompt = characterConfig.diaryPrompt.replace('{name}', characterConfig.name)
    let entry
    if (apiConfig?.apiKey) {
      entry = await callAI(sysPrompt, [{ role: 'user', content: '写今天的日记' }], apiConfig)
    } else {
      entry = await callFallback(sysPrompt, [{ role: 'user', content: '写今天的日记' }])
    }
    if (entry) {
      const date = new Date().toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
      setDiaryList(prev => [...prev, { date, content: entry }])
    }
  } catch (e) { console.error(e) }
}

//新增 handleNewDay 函数
  function handleNewDay() {
    const result = processNewDay({
      day: gameDay,
      periodDays,
    })
    
    // 更新所有状态
    setGameDay(result.day)
    setSeason(result.season)
    setWeather(result.weather)
    setTemp(result.temp)
    setSickWho(result.sickWho)
    setCandleLit(result.candleLit)
    setIsPeriodNow(result.isPeriod)
    
    // 系统消息
    const sysMsgs = result.events.map(e => ({ role: 'system', content: e }))
    const newMsgs = [...messages, ...sysMsgs]
    setMessages(newMsgs)
    
    // 天气事件触发AI反应
    if (result.weather === 'storm') {
      setTimeout(() => {
        sendToAI('外面突然下起了暴雨，雷声很大，你主动找她说一句', newMsgs, intimacy, playerRoom, luRoom, false, undefined, true)
      }, 800)
    } else if (result.weather === 'snowy') {
      setTimeout(() => {
        sendToAI('外面下雪了，你很高兴，主动叫她来看', newMsgs, intimacy, playerRoom, luRoom, false, undefined, true)
      }, 800)
    } else if (result.sickWho === 'lu') {
      setTimeout(() => {
        sendToAI('你今天身体不舒服，有点感冒发烧，但还是强撑着不想让她担心', newMsgs, intimacy, playerRoom, luRoom, false, undefined, true)
      }, 800)
    }
    
    // 存档
    saveToDb(newMsgs, intimacy, playerRoom, luRoom)
    // 宠物更新
if (pet) {
  const updatedPet = updatePetDaily(pet)
  setPet(updatedPet)
  if (updatedPet.sick) {
    result.events.push(`🤒 ${updatedPet.name}生病了！`)
  }
  // 30%概率宠物触发AI反应
  if (Math.random() < 0.3) {
    const act = getPetRandomAct(updatedPet)
    setTimeout(() => {
      sendToAI(act + '你自然提一句', messages, intimacy, playerRoom, luRoom, false, undefined, true)
    }, 800)
  }
}
// 每日零花钱
setCoins(prev => prev + 200)
    setToast(result.events[0]) // 显示第一条系统消息
  }
  
  //  修改 7: 大姨妈日历 toggle
    function handleTogglePeriod(year, month, day) {
    const newDays = togglePeriodDay(periodDays, year, month, day)
    setPeriodDays(newDays)
    // 重新检查当前是否经期
    const gd = realDate()
    const ip = checkIsPeriod(newDays, gd)
    setIsPeriodNow(ip)
    // 立即存档
    saveToDb(messages, intimacy, playerRoom, luRoom)
  }

  const sameRoom = playerRoom === luRoom
  const isOutside = playerRoom === 'outside'
  const currentRoom = ROOMS.find(r => r.id === playerRoom)
  const currentPlace = OUTSIDE_PLACES.find(p => p.id === outsidePlace)
  const intimacyStars = Math.floor(intimacy / 20)
  const currentSceneImg = isOutside ? null : SCENE_IMAGES[playerRoom]
  const currentImgLoaded = isOutside ? true : imgLoaded[playerRoom]
  const currentFallback = SCENE_FALLBACK[playerRoom] || '#0f0c09'
  const btnStyle = (active = false) => ({
    flexShrink: 0, padding: '6px 14px',
    background: active ? 'var(--btn-hover-bg)' : 'var(--btn-bg)',
    border: `1px solid ${active ? '#F88DA7' : 'var(--btn-border)'}`,
    borderRadius: '20px',
    color: active ? '#F88DA7' : 'var(--btn-text)',
    fontSize: '12px', cursor: 'pointer', backdropFilter: 'blur(8px)',
    fontFamily: 'Georgia, serif', letterSpacing: '0.05em', transition: 'all 0.2s',
  })
  const IntimateGamePanel = ({ isBath, positions, currentPos, onSelectPos, actions, onDoAction, isAiTurn, mProg, cProg, rhythm }) => {
  const pos = positions.find(p => p.id === currentPos)
  return (
    <div style={{ marginTop: '8px' }}>
      {/* 姿势行 */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px' }}>姿势</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {positions.map(p => {
            const locked = p.unlockWk > totalWk
            return (
              <button
                key={p.id}
                className={`position-btn ${currentPos === p.id && !locked ? 'active' : ''}`}
                onClick={() => !locked && onSelectPos(p.id)}
                style={{
                  padding: '4px 10px', fontSize: '11px', borderRadius: '20px',
                  background: currentPos === p.id && !locked ? 'var(--btn-hover-bg)' : 'var(--btn-bg)',
                  border: `1px solid ${currentPos === p.id && !locked ? '#F88DA7' : 'var(--btn-border)'}`,
                  color: locked ? 'rgba(255,255,255,0.2)' : (currentPos === p.id ? '#F88DA7' : 'var(--btn-text)'),
                  cursor: locked ? 'default' : 'pointer',
                  fontFamily: 'Georgia, serif',
                }}
              >
                {locked ? `🔒 ${p.name}` : p.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* 动作行 */}
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px' }}>动作</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {actions.map(act => (
            <button
              key={act.id}
              className="action-btn"
              onClick={() => onDoAction(act.id)}
              disabled={isAiTurn}
              style={{
                padding: '4px 12px', fontSize: '11px', borderRadius: '20px',
                background: 'var(--btn-bg)', border: '1px solid var(--btn-border)',
                color: 'var(--btn-text)', cursor: isAiTurn ? 'default' : 'pointer',
                fontFamily: 'Georgia, serif',
              }}
            >
              {act.label}
            </button>
          ))}
        </div>
      </div>

      {/* 进度条 */}
      <div style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>
          <span>她 💧</span><span>{Math.round(mProg)}/100</span>
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${mProg}%`, background: 'linear-gradient(90deg,#f8a0c0,#e04080)', borderRadius: '4px' }} />
        </div>
      </div>
      <div style={{ marginTop: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>
          <span>他 🔥</span><span>{Math.round(cProg)}/100</span>
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${cProg}%`, background: 'linear-gradient(90deg,var(--message-text-assistant, #e8dcc8),#e08030)', borderRadius: '4px' }} />
        </div>
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.35)', marginTop: '8px', textAlign: 'center', letterSpacing: '0.08em' }}>
        {isAiTurn ? '他在行动…' : `节奏 ${'●'.repeat(rhythm)}${'○'.repeat(5-rhythm)}`}
      </div>
    </div>
  )
}


  // ── 开场 ──
  // ── 主界面 ──
  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; overflow: hidden; background: #0f0c09; }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes breathe {
          0%,100% { transform: translateY(0px) scale(1); opacity:0.92; }
          50% { transform: translateY(-5px) scale(1.015); opacity:1; }
        }
        .action-row { scrollbar-width: none; }
        .action-row::-webkit-scrollbar { display: none; }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #12100e inset !important;
          -webkit-text-fill-color: #e8dcc8 !important;
          caret-color: #e8dcc8;
        }
        select, option { background: #12100e !important; color: #e8dcc8 !important; }
      `}</style>
      <div className={`game-root theme-${theme}`}>
        <div style={{
          position: 'relative', width: '100%', maxWidth: '480px', height: '100%',
          overflow: 'hidden', fontFamily: 'Georgia, serif',
        }}>

      {/* ── 第1层：场景背景 ──
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        background: 'var(--bg-main)', transition: 'background 0.6s ease',
      }}>
        {currentSceneImg && !currentImgLoaded && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              border: '2px solid rgba(201,169,110,0.15)',
              borderTopcolor: 'var(--text-accent, #F88DA7)',
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        )} 
        {currentSceneImg && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${currentSceneImg})`,
            backgroundSize: 'cover', backgroundPosition: 'center top',
            opacity: currentImgLoaded ? 1 : 0, transition: 'opacity 0.5s ease',
          }} />
        )}
        {isOutside && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(201,169,110,0.1)', fontSize: '72px',
          }}> {currentPlace?.name || '外出'}</div>
        )}
      </div> */}

      {/* ── 第1层：场景背景 ── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          background: 'var(--bg-main)', transition: 'background 0.6s ease',
        }}>
          {/* 只有加载完成的图片才显示 */}
          {currentSceneImg && currentImgLoaded && (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${currentSceneImg})`,
              backgroundSize: 'cover', backgroundPosition: 'center top',
            }} />
          )}
        </div>

      <div style={{
        position: 'absolute', inset: 0, zIndex: 40,
        display: 'flex', flexDirection: 'column', color: 'var(--text-primary, #e8dcc8)',
      }}>

        <TopBar
          characterName={characterConfig.name}
          intimacy={intimacy}
          intimacyLevel={getIntimacyLevel(intimacy).level}
          intimacyStage={getIntimacyLevel(intimacy).stage}
          daysTogether={daysTogether}
          romantic={romantic}
          onRomanticClick={handleRomanticClick}
          coins={coins}
          locationState={locationState}
          onToggleLocation={handleToggleLocation}
          onMenuClick={handleOpenMenu}
          avatarUrl={characterConfig.images?.default}
        />

        {/* 对话区 */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '0 16px 16px',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div style={{ flex: 1 }} />
        {messages.map((m, i) => {
          if (m.role === 'system') return (
            <div key={i} style={{ alignSelf: 'center', fontSize: '10px', color: 'var(--text-secondary, rgba(201,169,110,0.6))', letterSpacing: '0.12em', padding: '2px 0' }}>
              {m.content}
            </div>
          )
          
          const isLastUser = m.role === 'user' && i === messages.length - 2
          const isIntimate = !!m.intimate
          const intimateParts = isIntimate ? m.content.split('\n') : null
          
          // 长按引用功能
          let pressTimer = null
          const handleTouchStart = () => {
            pressTimer = setTimeout(() => {
              setReplyToMsg(m)
              setToast('已选中消息，输入框输入回复内容')
            }, 500)
          }
          const handleTouchEnd = () => {
            if (pressTimer) clearTimeout(pressTimer)
          }
          // 红包消息
          if (m.type === 'redpacket') {
            const isUserRedpacket = m.sender === 'user'
            const isExpired = m.expired || (m.expiryTime && m.expiryTime <= Date.now())
            const canClaim = !m.claimed && !isExpired && ((isUserRedpacket && m.role === 'user') || (m.sender === 'ai' && m.role === 'assistant'))
            
            // 计算剩余时间
            let timeLeftText = ''
            if (!m.claimed && !isExpired && m.expiryTime) {
              const hoursLeft = Math.max(0, Math.floor((m.expiryTime - Date.now()) / 3600000))
              timeLeftText = ` · ${hoursLeft}小时后退回`
            }
            
            return (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <div className={`redpacket-message ${m.claimed ? 'claimed' : ''} ${isExpired ? 'expired' : ''}`} style={{
                  background: isExpired ? '#888' : 'linear-gradient(135deg, #e8351e, #c0271a)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  cursor: canClaim ? 'pointer' : 'default',
                  opacity: (m.claimed || isExpired) ? 0.6 : 1
                }} onClick={() => {
                  if (!canClaim) {
                    if (isExpired) setToast('红包已过期')
                    return
                  }
                  if (isUserRedpacket) {
                    // 用户发的红包：AI 领取
                    setMessages(prev => prev.map(msg => 
                      msg.id === m.id ? { ...msg, claimed: true } : msg
                    ))

                    setToast(`${characterConfig.name} 领取了你的红包 ¥${m.amountYuan?.toFixed(2) || m.amount.toFixed(2)}`)
                    // 让 AI 说谢谢
                    sendToAI(`（你领取了红包，开心地说句谢谢）`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                  } else {
                    // AI 发的红包：用户领取
                    setMessages(prev => prev.map(msg => 
                      msg.id === m.id ? { ...msg, claimed: true } : msg
                    ))
                    setCoins(prev => {
                    const newCoins = prev + m.amount
                    // 👇 保存
                    saveToDb(messages, intimacy, playerRoom, luRoom, userId)
                    return newCoins
                    })
                    setToast(`领取了 ${characterConfig.name} 的红包 ¥${m.amountYuan?.toFixed(2) || m.amount.toFixed(2)}`)
                    saveToDb(messages, intimacy, playerRoom, luRoom)
                  }
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '32px' }}>{isExpired ? '💔' : '🧧'}</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{m.blessing}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                        {m.sender === 'user' ? '你发的红包' : `${characterConfig.name} 发的红包`}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', textAlign: 'right', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    ¥{(m.amount / 100).toFixed(2)} 
                    {m.claimed ? '· 已领取' : (isExpired ? '· 已过期' : `· 点击领取${timeLeftText}`)}
                  </div>
                </div>
              </div>
            )
          }

                    // 转账消息
          if (m.type === 'transfer') {
            const isUserTransfer = m.sender === 'user'
            const isExpired = m.expired || (m.expiryTime && m.expiryTime <= Date.now())
            const canClaim = !m.claimed && !isExpired && ((isUserTransfer && m.role === 'user') || (m.sender === 'ai' && m.role === 'assistant'))
            
            let timeLeftText = ''
            if (!m.claimed && !isExpired && m.expiryTime) {
              const hoursLeft = Math.max(0, Math.floor((m.expiryTime - Date.now()) / 3600000))
              timeLeftText = ` · ${hoursLeft}小时后退回`
            }
            
            return (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <div className={`transfer-message ${m.claimed ? 'claimed' : ''} ${isExpired ? 'expired' : ''}`} style={{
                  background: isExpired ? '#888' : '#2c2c2e',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  cursor: canClaim ? 'pointer' : 'default',
                  opacity: (m.claimed || isExpired) ? 0.6 : 1
                }} onClick={() => {
                  if (!canClaim) {
                    if (isExpired) setToast('转账已过期')
                    return
                  }
                  if (isUserTransfer) {
                    setMessages(prev => prev.map(msg => 
                      msg.id === m.id ? { ...msg, claimed: true } : msg
                    ))
                    setToast(`${characterConfig.name} 确认了你的转账 ¥${m.amountYuan?.toFixed(2) || m.amount.toFixed(2)}`)
                    sendToAI(`（你确认收到了转账，说句谢谢）`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                  } else {
                    setMessages(prev => prev.map(msg => 
                      msg.id === m.id ? { ...msg, claimed: true } : msg
                    ))
                    setCoins(prev => {
                    const newCoins = prev + m.amount
                    // 👇 保存
                    saveToDb(messages, intimacy, playerRoom, luRoom, userId)
                    return newCoins
                  })
                    setToast(`收到了 ${characterConfig.name} 的转账 ¥${m.amountYuan?.toFixed(2) || m.amount.toFixed(2)}`)
                    saveToDb(messages, intimacy, playerRoom, luRoom)
                  }
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '32px' }}>{isExpired ? '💔' : '💸'}</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{m.note || '转账'}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                        {m.sender === 'user' ? '你发起的转账' : `${characterConfig.name} 的转账`}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', textAlign: 'right', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    ¥{(m.amount / 100).toFixed(2)} 
                    {m.claimed ? '· 已收款' : (isExpired ? '· 已过期' : `· 点击收款${timeLeftText}`)}
                  </div>
                </div>
              </div>
            )
          }
          return (
            <div 
              key={i} 
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                position: 'relative',
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                setReplyToMsg(m)
                setToast('已选中消息，输入框输入回复内容')
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* 气泡内容保持不变 */}
              <div style={{
                background: isIntimate ? 'rgba(8,5,3,0.88)' : 'var(--message-bg-assistant)',
                border: isIntimate ? '1px solid var(--border-glass, rgba(201,169,110,0.06))' : m.role === 'user' ? '1px solid var(--text-accent, #F88DA7)' : '1px solid var(--border-glass, rgba(201,169,110,0.08))',
                borderRadius: m.role === 'user' ? '16px 16px 3px 16px' : '16px 16px 16px 3px',
                padding: '9px 13px',
                fontSize: isIntimate ? '13px' : '14px',
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'var(--message-text-assistant)',
                fontStyle: m.content && m.content.startsWith('（') && m.content.endsWith('）') ? 'italic' : 'normal',
                backdropFilter: 'blur(10px)',
                isolation: 'isolate'
              }}>
                {isIntimate ? (
                  <>
                    <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.4)', fontStyle: 'normal', marginBottom: '4px', letterSpacing: '0.08em' }}>
                      {intimateParts[0]}
                    </div>
                    <div>{intimateParts.slice(1).join('\n')}</div>
                  </>
                ) : m.content}
              </div>
              {isLastUser && (
                <div onClick={handleRetract} style={{
                  fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px',
                  textAlign: 'right', cursor: 'pointer', letterSpacing: '0.05em',
                }}>撤回重说</div>
              )}
              
              {/* 小字和收藏按钮 */}
              {m.role !== 'system' && (
                <div style={{
                  fontSize: '9px',
                  color: 'var(--text-secondary, rgba(201,169,110,0.5))',
                  textAlign: m.role === 'user' ? 'right' : 'left',
                  marginTop: '4px',
                  display: 'flex',
                  gap: '6px',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'center'
                }}>
                  <span>{m.location || '未知'}</span>
                  <span>·</span>
                  {m.outfit && m.outfit !== '默认' && (
                    <>
                      <span>{m.outfit}</span>
                      <span>·</span>
                    </>
                  )}
                  <span>{m.timestamp || ''}</span>
                  <button
                    onClick={() => toggleFavorite(i, m)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: isFavorited(i) ? '#ff4d4d' : 'rgba(255,255,255,0.3)',
                      fontSize: '12px',
                      padding: '0 4px'
                    }}
                  >
                    ❤
                  </button>
                </div>
              )}
              
              {/* 原来的 timestamp 已合并到上面，这里可以删除或保留 */}
            </div>
          )
        })}
          {loading && (
            <div style={{ alignSelf: 'flex-start', color: 'rgba(201,169,110,0.4)', fontSize: '18px', padding: '4px 8px', letterSpacing: '0.3em' }}>
              ···
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <LocationBar
          locationState={locationState}
          rooms={ROOMS}
          places={OUTSIDE_PLACES}
          currentRoomId={playerRoom}
          currentPlaceId={outsidePlace}
          onSelectRoom={handleSelectRoom}
          onSelectPlace={handleSelectPlace}
        />

        {/* 输入区 + 破次元立绘 */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {/* ── 互动按钮行 + 输入框 ── */}
          <div style={{
            background: 'var(--input-area-bg)',
            flexShrink: 0,
          }}>
            {/* 互动按钮主行 */}
            <div style={{ marginTop: '2px' }}>
              <div className="action-row" style={{
                display: 'flex', gap: '6px', padding: '8px 14px 4px',
                overflowX: 'auto', scrollbarWidth: 'none',
              }}>
                {/* 腻歪 */}
                <CoreActions
                  onNiwai={() => setExpandedAction(expandedAction === 'niwai' ? null : 'niwai')}
                  onPrank={() => setExpandedAction(expandedAction === 'prank' ? null : 'prank')}
                  onRoomAction={() => setShowRoomPanel(prev => !prev)}   // 改为打开面板
                  expandedAction={expandedAction}   // 新增这一行
                  showRoomPanel={showRoomPanel}
                />
              </div>
            </div>
            {/* 展开面板：腻歪 */}
            {expandedAction === 'niwai' && (
              <div style={{
                margin: '0 14px 6px',
                background: 'var(--panel-bg, var(--panel-bg))', backdropFilter: 'blur(12px)', isolation: 'isolate', WebkitBackdropFilter: 'blur(12px)',isolation: 'isolate',
                border: '1px solid var(--border-glass, rgba(201,169,110,0.12))',
                borderRadius: '14px', padding: '10px 12px',
              }}>
                {!sameRoom ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-accent, #F88DA7)', textAlign: 'center', padding: '8px 0' }}>
                    他不在这里 ·
                    <span
                      onClick={() => { setExpandedAction(null); handleCallLu() }}
                      style={{ color: '#f8af06', cursor: 'pointer', marginLeft: '6px', textDecoration: 'underline' }}
                    >叫他过来</span>
                  </div>
                ) : (
                  <>
                     {/*<div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.35)', letterSpacing: '0.15em', marginBottom: '8px' }}>腻歪一下</div>*/}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {[
                        { label: '蹭蹭脸', prompt: '她把脸凑过来蹭了你一下，你的反应，一句话' },
                        { label: '摸摸头', prompt: '她让你摸摸她的头，说一句' },
                        { label: '撒个娇', prompt: '她软着声音撒娇，你的反应，一句话' },
                        { label: '牵手', prompt: '她悄悄把手伸过来，你看了一眼，说一句' },
                        { label: '靠着你', prompt: '她靠在你肩上，你感觉到了，说一句' },
                        { label: '抱一下', prompt: '她突然过来抱了你一下，你的反应' },
                        { label: '说悄悄话', prompt: '她凑到你耳边说了句悄悄话，你的反应' },
                        { label: '捏捏脸', prompt: '她伸手捏了你的脸，你的反应，一句话' },
                      ].map(a => (
                        <button key={a.label} className="niwai-btn" onClick={() => { setExpandedAction(null); sendToAI(a.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true) }}
                          style={{ padding: '5px 12px', background: 'var(--btn-bg)', border: '1px solid var(--btn-border)', borderRadius: '20px', color: 'var(--btn-text)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
                        >{a.label}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 展开面板：恶作剧（含自定义） */}
            {expandedAction === 'prank' && (
              <div style={{
                margin: '0 14px 6px',
                background: 'var(--panel-bg, var(--panel-bg))',
                backdropFilter: 'blur(12px)', 
                isolation: 'isolate', 
                WebkitBackdropFilter: 'blur(12px)',
                isolation: 'isolate',
                border: '1px solid var(--border-glass, rgba(201,169,110,0.12))',
                borderRadius: '14px', 
                padding: '10px 12px',
              }}>
                {!sameRoom ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-accent, #F88DA7)', textAlign: 'center', padding: '8px 0' }}>
                    他不在这里 ·
                    <span onClick={() => { setExpandedAction(null); handleCallLu() }}
                      style={{ color: 'var(--message-text-assistant, #e8dcc8)', cursor: 'pointer', marginLeft: '6px', textDecoration: 'underline' }}
                    >叫他过来</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {[
                        { label: '戳他脸', prompt: '她伸手指戳了戳他的脸，他的反应，一句话' },
                        { label: '偷看他', prompt: '她趁他不注意盯着他看，他发现了，说一句' },
                        { label: '突然亲一下', prompt: '她突然踮脚亲了他的侧脸，他的反应' },
                        { label: '学他讲话', prompt: '她开始模仿他说话的腔调，他发现了，说一句' },
                        { label: '无缘无故推他', prompt: '她没来由推了他一把，他的反应，一句话' },
                        { label: '偷他东西', prompt: '她趁他不注意拿走了他手边的东西，他发现了' },
                        { label: '装作要走', prompt: '她假装要走，看他有没有反应，一句话' },
                        ...customPranks.map(p => ({ label: p.label, prompt: p.prompt }))
                      ].map(a => (
                        <button key={a.label} className="niwai-btn" onClick={() => { setExpandedAction(null); sendToAI(a.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true) }}
                          style={{ padding: '5px 12px', background: 'var(--btn-bg)', border: '1px solid var(--btn-border)',borderRadius: '20px', color: 'var(--btn-text)',  fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
                        >{a.label}</button>
                      ))}
                        <button onClick={() => setShowAddPrank(true)}
                          style={{ padding: '5px 12px', background: 'var(--btn-bg)', border: '1px solid var(--btn-border)',borderRadius: '20px',color: 'var(--btn-text)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
                        >+ 自定义</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {showRoomPanel && (
              <div style={{
                margin: '0 14px 6px',
                background: 'var(--panel-bg, rgba(27,10,31,0.96))',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-glass, rgba(201,169,110,0.12))',
                borderRadius: '14px',
                padding: '6px 12px',
                width: 'auto',            // 确保不超出
                overflow: 'hidden',       // 防止溢出
              }}>
                <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {/* 动态生成按钮 — 直接复制之前生成按钮的代码 */}
                  {(() => {
                    const actions = [];
                    if (!isOutside) {
                        const roomMap = {
                          living_room: [
                            { label: '泡茶', prompt: '她去泡了杯茶，你注意到了，说一句' },
                            { label: '听音乐', prompt: '她放了一首音乐，你听了，说一句' },
                            { label: '发呆', prompt: '她在客厅发呆，你看见了，说一句' },
                            { label: '🐾 宠物', special: 'pet' },
                          ],
                          kitchen: [
                            { label: '一起做饭', special: 'cook' },
                            { label: '🧊 冰箱', special: 'fridge' },
                          ],
                          study: [
                            { label: '看书', special: 'books' },
                            { label: '打扰他', prompt: '她故意进书房打扰你，你的反应，一句话' },
                            { label: '📔 他的日记', special: 'diary' },
                          ],
                          balcony: [
                            { label: '看星星', prompt: '她在阳台看星星，你跟出来了，说一句' },
                            { label: '吹吹风', prompt: '她在阳台吹风，你站在旁边，说一句' },
                            { label: '🌱 花园', special: 'garden' },
                          ],
                          guest_room: [
                            { label: '坐会儿', prompt: '她进了客房坐下，你坐在对面，说一句' },
                          ],
                          bedroom: [
                            { label: '躺一躺', prompt: '她走进卧室躺下，你站在门口，说一句' },
                            { label: '说说话', prompt: '卧室里安静，她想和你说说话，你的反应' },
                            { label: '👔 衣帽间', special: 'wardrobe' },
                            { label: '🗄️ 床头柜', special: 'bedside' },
                          ],
                          bathroom: [
                            { label: '帮我洗头', prompt: '她让他帮她洗头，他的反应，一句话' },
                            { label: '帮我搓背', prompt: '她让他帮她搓背，他的反应，一句话' },
                            { label: '帮我吹头发', prompt: '她让他帮她吹头发，他的反应，一句话' },
                            { label: '帮你刮胡子', prompt: '她主动给他刮胡子，他的反应，一句话' },
                          ],
                        }
                      const roomActs = roomMap[playerRoom] || [];
                      actions.push(...roomActs);
                      if (playerRoom === 'bedroom' && sameRoom) {
                        actions.push({ label: '卧室氛围', special: 'bedroom_intimate' });
                      }
                    } else {
                              const outsideMap = {
                                park: [
                                  { label: '散步', prompt: '你们在公园散步，你走在她旁边，说一句' },
                                  { label: '坐草地', prompt: '她突然坐到草地上，你站在旁边，说一句' },
                                  { label: '喂鸭子', prompt: '她在池塘边喂鸭子，你站在一旁，说一句' },
                                ],
                                cinema: [
                                  { label: '挑电影', prompt: '你们站在影院门口选电影，你说一句' },
                                  { label: '买爆米花', prompt: '她去买爆米花，你跟着，说一句' },
                                  { label: '看电影', prompt: '你们看了一部电影，灯光暗下来，你说一句' },
                                ],
                                mall: [
                                  { label: '逛逛', prompt: '她在商场橱窗前停下来，你说一句' },
                                  { label: '帮我提包', prompt: '她把袋子塞给你，你接过来，说一句' },
                                  { label: '🛍️ 逛商场', special: 'shop' },
                                ],
                                supermarket: [
                                  { label: '推车', prompt: '你接过了超市的购物车，说一句' },
                                  { label: '🛒 采购', special: 'supermarket' },
                                ],
                                seaside: [
                                  { label: '吹风', prompt: '海边的风把她头发吹乱了，你看着，说一句' },
                                  { label: '捡贝壳', prompt: '她蹲下来捡贝壳，你站在旁边，说一句' },
                                ],
                                cafe: [
                                  { label: '点单', prompt: '服务员来了，她在想点什么，你替她说了一句' },
                                  { label: '发呆', prompt: '咖啡馆里很安静，你们都有点发呆，你先开口' },
                                ],
                              }
                      const outActs = outsideMap[outsidePlace] || [];
                      actions.push(...outActs);
                    }
                    return actions.map((a, idx) => {
                      if (a.special === 'fridge') return <button key={idx} onClick={() => { setShowFridge(true); }} style={btnStyle()}>冰箱</button>;
                      if (a.special === 'cook') return <button key={idx} onClick={() => { if (!sameRoom) {
                          setToast('他不在这里，去叫他过来吧');
                          handleCallLu();
                          setShowRoomPanel(false);
                          return;
                        } setShowFridge('cook'); }} style={btnStyle()}>一起做饭</button>;
                      if (a.special === 'books') return <button key={idx} onClick={() => {  setShowBooks(true); }} style={btnStyle()}>看书</button>;
                      if (a.special === 'diary') return <button key={idx} onClick={() => {  setShowDiary(true); }} style={btnStyle()}>他的日记</button>;
                      if (a.special === 'memories') return <button key={idx} onClick={() => {  setShowMemories(true); }} style={btnStyle()}>📖 重要回忆 {importantMemories.length > 0 && `(${importantMemories.length})`}</button>;
                      if (a.special === 'wardrobe') return <button key={idx} onClick={() => {  setShowWardrobe(true); }} style={btnStyle()}>衣帽间</button>;
                      if (a.special === 'bedside') return <button key={idx} onClick={() => {  setShowBedside(true); }} style={btnStyle()}>床头柜</button>;
                      if (a.special === 'garden') return <button key={idx} onClick={() => {  setShowGarden(true); }} style={btnStyle()}>🌱 花园</button>;
                      if (a.special === 'pet') return <button key={idx} onClick={() => {  setShowPetPanel(true); }} style={btnStyle()}>{a.label}</button>;
                      if (a.special === 'shop') return <button key={idx} onClick={() => {  setShowShop(true); }} style={btnStyle()}>🛍️ 逛商场</button>;
                      if (a.special === 'supermarket') return <button key={idx} onClick={() => {  setShowSupermarket(true); }} style={btnStyle()}>🛒 采购</button>;
                      if (a.special === 'bath') return <button key={idx} onClick={() => {  setExpandedAction(expandedAction === 'bath' ? null : 'bath'); }} style={btnStyle()}>浴室互动</button>;
                      if (a.special === 'bedroom_intimate') return <button key={idx} onClick={() => { setExpandedAction(expandedAction === 'bedroom_intimate' ? null : 'bedroom_intimate'); }} style={btnStyle()}>卧室氛围</button>;
                      return <button key={idx} onClick={() => {sendToAI(a.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true); }} style={btnStyle()}>{a.label}</button>;
                    });
                  })()}
                </div>
              </div>
            )}

            
            {/* 输入框行 - 在 padding 的外面加引用区域 */}
            {replyToMsg && (
              <div style={{
                margin: '0 14px 8px',
                padding: '8px 12px',
                background: 'rgba(201,169,110,0.08)',
                borderLeft: '3px solid #F88DA7',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.5)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: '#F88DA7' }}>回复 {replyToMsg.role === 'user' ? '你' : '他'}:</span>
                  <span style={{ marginLeft: '8px' }}>{replyToMsg.content.slice(0, 40)}</span>
                </div>
                <button 
                  onClick={() => setReplyToMsg(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px 8px'
                  }}
                >✕</button>
              </div>
            )}

            {/* 输入框行 */}
            {/* 输入框行 */}
            <div style={{
              padding: '2px 14px 12px',
              display: 'flex', gap: '10px', alignItems: 'center',
            }}>
              {/* 加号按钮 - 展开菜单 */}
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: showPlusMenu ? 'var(--text-accent)' : 'var(--btn-bg)',
                    border: `1px solid ${showPlusMenu ? '#F88DA7' : 'var(--btn-border)'}`,
                    color: showPlusMenu ? '#0f0c09' : 'var(--btn-text)',
                    fontSize: '24px', cursor: 'pointer', flexShrink: 0,
                    transition: 'all 0.2s'
                  }}
                >＋</button>
                
                {/* 展开菜单 */}
                {showPlusMenu && (
                  <div style={{
                    position: 'absolute', bottom: '55px', left: '0',
                    background: 'var(--panel-bg, rgba(10,7,4,0.98))',
                    border: '1px solid rgba(201,169,110,0.2)',
                    borderRadius: '16px',
                    padding: '8px 0',
                    minWidth: '120px',
                    backdropFilter: 'blur(12px)',
                    zIndex: 100
                  }}>
                    <button
                      onClick={() => { setShowRedpacket(true); setShowPlusMenu(false) }}
                      style={{
                        width: '100%', padding: '10px 16px',
                        background: 'none', border: 'none',
                        color: 'var(--btn-text)', fontSize: '14px',
                        cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                    >🧧 发红包</button>
                    <button
                      onClick={() => { setShowTransfer(true); setShowPlusMenu(false) }}
                      style={{
                        width: '100%', padding: '10px 16px',
                        background: 'none', border: 'none',
                        color: 'var(--btn-text)', fontSize: '14px',
                        cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                    >💸 转账</button>
                  </div>
                )}
              </div>

              {/* 输入框 */}
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={replyToMsg ? `回复 "${replyToMsg.content?.slice(0, 30)}"` : '说点什么...'}
                style={{
                  flex: 1,
                  background: 'var(--message-bg-assistant)',
                  border: '1px solid var(--btn-border)',
                  borderRadius: '22px',
                  padding: '11px 18px',
                  color: 'var(--message-text-assistant)',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'Georgia, serif'
                }}
              />
              
              {/* 发送按钮 */}
              <button onClick={handleSend} disabled={loading} style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: loading ? 'var(--border-glass)' : 'var(--text-accent)',
                border: 'none', color: '#0f0c09', fontSize: '18px',
                cursor: loading ? 'default' : 'pointer', flexShrink: 0,
              }}>↑</button>
            </div>

            {/* 引用提示 */}
            {replyToMsg && (
              <div style={{
                margin: '0 14px 8px',
                padding: '6px 12px',
                background: 'rgba(201,169,110,0.1)',
                borderLeft: '3px solid #F88DA7',
                borderRadius: '8px',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.5)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>回复 {replyToMsg.role === 'user' ? '你' : characterConfig.name}: {replyToMsg.content?.slice(0, 40)}</span>
                <button onClick={() => setReplyToMsg(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 用户发红包弹窗 */}
      {/* 用户发红包弹窗 */}
      {showRedpacket && (
        <div onClick={() => setShowRedpacket(false)} style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '280px',
            background: 'linear-gradient(135deg, #e8351e, #c0271a)',
            borderRadius: '16px',
            padding: '24px 20px',
            textAlign: 'center',
            color: '#fff'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🧧</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>发红包</div>
            <input
              type="number"
              placeholder="金额"
              value={redpacketAmount}
              onChange={e => setRedpacketAmount(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', marginBottom: '12px', fontSize: '16px', textAlign: 'center' }}
            />
            <input
              type="text"
              placeholder="祝福语"
              value={redpacketMsg}
              onChange={e => setRedpacketMsg(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', marginBottom: '20px', fontSize: '14px' }}
            />
            <button onClick={() => {
              const amountYuan = parseFloat(redpacketAmount)
              if (!amountYuan || amountYuan <= 0) { setToast('请输入金额'); return }
              //nst amountFen = Math.round(amountYuan * 100)
              if (amountYuan > coins) { setToast('金币不足'); return }  // 👈 改成这样
              const blessing = redpacketMsg.trim() || '恭喜发财'
              addRedpacketMessage(amountYuan, blessing)  // 传元，内部转分
              setShowRedpacket(false)
              setRedpacketAmount('')
              setRedpacketMsg('')
              setToast(`发了 ¥${amountYuan.toFixed(2)} 红包`)
            }} style={{ width: '100%', padding: '12px', background: '#f5a500', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', color: '#fff', cursor: 'pointer' }}>塞钱进红包</button>
            <button onClick={() => setShowRedpacket(false)} style={{ marginTop: '12px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer' }}>取消</button>
          </div>
        </div>
      )}

      {/* 用户转账弹窗 */}
      {showTransfer && (
        <div onClick={() => setShowTransfer(false)} style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '280px',
            background: '#2c2c2e',
            borderRadius: '16px',
            padding: '24px 20px',
            textAlign: 'center',
            color: '#fff'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💸</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>转账</div>
            <input
              type="number"
              placeholder="金额"
              value={transferAmount}
              onChange={e => setTransferAmount(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', marginBottom: '12px', fontSize: '16px', textAlign: 'center' }}
            />
            <input
              type="text"
              placeholder="备注"
              value={transferMsg}
              onChange={e => setTransferMsg(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', marginBottom: '20px', fontSize: '14px' }}
            />
            <button onClick={() => {
              const amountYuan = parseFloat(transferAmount)
              if (!amountYuan || amountYuan <= 0) { setToast('请输入金额'); return }
              //nst amountFen = Math.round(amountYuan * 100)
              if (amountYuan > coins) { setToast('金币不足'); return }  // 👈 改成这样
              const note = transferMsg.trim() || '转账'
              addTransferMessage(amountYuan, note)
              setShowTransfer(false)
              setTransferAmount('')
              setTransferMsg('')
              setToast(`转了 ¥${amountYuan.toFixed(2)}`)
            }} style={{ width: '100%', padding: '12px', background: '#07c160', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', color: '#fff', cursor: 'pointer' }}>确认转账</button>
            <button onClick={() => setShowTransfer(false)} style={{ marginTop: '12px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer' }}>取消</button>
          </div>
        </div>
      )}

      {/* 敲门弹窗 */}
      {showKnock && (
        <div onClick={() => setShowKnock(false)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',isolation: 'isolate',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--panel-bg, rgba(10,7,4,0.97))',
            border: '1px solid var(--border-glass, rgba(201,169,110,0.12))',
            borderRadius: '16px', padding: '28px 24px',
            width: '260px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-accent, #F88DA7)', letterSpacing: '0.15em', marginBottom: '8px' }}>
              客房
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, rgba(255,255,255,0.3))', marginBottom: '24px', lineHeight: 1.6 }}>
              他在里面。
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowKnock(false)} style={{
                flex: 1, background: 'none',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.2)', padding: '10px',
                borderRadius: '8px', cursor: 'pointer', fontSize: '12px',
                fontFamily: 'Georgia, serif',
              }}>算了</button>
              <button onClick={() => {
                setShowKnock(false)
                if (intimacy < 30) {
                  sendToAI(
                    `（我站在客房门外敲了敲门，好感度只有${intimacy}）你不太想让她进来，冷淡应付或找个借口，一句话`,
                    messages, intimacy, playerRoom, luRoom, false, undefined, true
                  )
                } else {
                  setPlayerRoom('guest_room')
                  sendToAI(`（我敲了敲门走进来）你在客房里，说一句`, messages, intimacy, 'guest_room', luRoom, false, undefined, true)
                }
              }} style={{
                flex: 1, background: 'rgba(201,169,110,0.08)',
                border: '1px solid rgba(201,169,110,0.25)',
                color: 'var(--message-text-assistant, #e8dcc8)', padding: '10px',
                borderRadius: '8px', cursor: 'pointer', fontSize: '12px',
                fontFamily: 'Georgia, serif', letterSpacing: '0.05em',
              }}>敲门</button>
            </div>
          </div>
        </div>
      )}

      {/* 外出弹窗 */}
      {showOutside && (
        <div onClick={() => setShowOutside(false)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',isolation: 'isolate',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: '480px',
            background: 'var(--panel-bg, rgba(10,7,4,0.97))',
            border: '1px solid var(--border-glass, rgba(201,169,110,0.1))',
            borderRadius: '20px 20px 0 0',
            padding: '20px 20px 36px',
          }}>
            <div style={{ fontSize: '11px', color: 'rgba(201,169,110,0.4)', letterSpacing: '0.2em', marginBottom: '16px', textAlign: 'center' }}>
              去哪里
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {OUTSIDE_PLACES.map(place => (
                <button key={place.id} onClick={() => handleGoOutside(place.id)} style={{
                  background: 'rgba(201,169,110,0.05)',
                  border: '1px solid var(--border-glass, rgba(201,169,110,0.1))',
                  borderRadius: '12px', padding: '14px 8px',
                  cursor: 'pointer', color: 'var(--text-primary, #e8dcc8)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                }}>
                  <span style={{ fontSize: '15px' }}>{place.name}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)' }}>{place.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 自定义恶作剧弹窗 */}
      {showAddPrank && (
        <div onClick={() => setShowAddPrank(false)} style={{
          position: 'fixed', inset: 0, zIndex: 250,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',isolation: 'isolate',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: '480px',
            background: 'var(--panel-bg, rgba(10,7,4,0.97))', border: '1px solid var(--border-glass, rgba(201,169,110,0.12))',
            borderRadius: '20px 20px 0 0', padding: '20px 20px 40px',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-accent, #F88DA7)', letterSpacing: '0.15em', marginBottom: '14px' }}>自定义恶作剧</div>
            <input
              value={newPrankText}
              onChange={e => setNewPrankText(e.target.value)}
              placeholder='描述你想整他的方式，比如：突然趴到他背上'
              style={{
                width: '100%', padding: '11px 14px', marginBottom: '12px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.15)',
                borderRadius: '12px', color: 'var(--text-primary, #e8dcc8)', fontSize: '13px',
                outline: 'none', fontFamily: 'Georgia, serif',
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddPrank(false)} style={{
                flex: 1, padding: '12px', background: 'none',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px',
                color: 'rgba(255,255,255,0.2)', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif',
              }}>取消</button>
              <button onClick={() => {
                if (!newPrankText.trim()) return
                const label = newPrankText.trim().slice(0, 10)
                const prompt = `她${newPrankText.trim()}，他的反应，一句话`
                setCustomPranks(prev => [...prev, { label, prompt }])
                setNewPrankText('')
                setShowAddPrank(false)
              }} style={{
                flex: 2, padding: '12px',
                background: 'var(--border-glass)', border: '1px solid rgba(201,169,110,0.25)',
                borderRadius: '12px', color: 'var(--message-text-assistant, #e8dcc8)', fontSize: '13px',
                cursor: 'pointer', fontFamily: 'Georgia, serif', letterSpacing: '0.08em',
              }}>加进去</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ 冰箱弹窗（查看食材 / 选菜谱） ══ */}
      {showFridge && (() => {
        const RECIPES = [
          { name: '番茄炒蛋', need: { '🍅番茄': 2, '🥚鸡蛋': 2 }, prompt: '她做了番茄炒蛋，端上来，你尝了一口，说一句' },
          { name: '葱油面',   need: { '🍜面条': 1, '🧄大蒜': 1 }, prompt: '她煮了碗葱油面，香气飘过来，你说一句' },
          { name: '豆腐汤',   need: { '🍞豆腐': 1, '🥬青菜': 1 }, prompt: '她煮了豆腐汤，盛了两碗，你接过那碗，说一句' },
          { name: '猪肉炒青菜', need: { '🥩猪肉': 1, '🥬青菜': 1 }, prompt: '她炒了道荤菜，你站在旁边看了会儿，说一句' },
          { name: '奶酪煎蛋', need: { '🥚鸡蛋': 2, '🧀奶酪': 1 }, prompt: '她用奶酪煎了个鸡蛋，有点洋气，你挑眉说一句' },
        ]
        const isCook = showFridge === 'cook'
        const canMake = (recipe) => Object.entries(recipe.need).every(([k, v]) => (fridge[k] || 0) >= v)
        return (
          <div onClick={() => setShowFridge(false)} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', isolation: 'isolate',display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', background: 'var(--panel-bg, rgba(10,7,4,0.97))', border: '1px solid var(--border-glass, rgba(201,169,110,0.12))', borderRadius: '20px 20px 0 0', padding: '20px 20px 44px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-accent, #F88DA7)', letterSpacing: '0.2em', marginBottom: '14px' }}>{isCook ? '一起做饭 · 选菜谱' : '冰箱 · 食材'}</div>
              {!isCook ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px' }}>
                  {Object.entries(fridge).map(([name, qty]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: qty > 0 ? 'rgba(201,169,110,0.08)' : 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass, rgba(201,169,110,0.1))', borderRadius: '10px' }}>
                      <span style={{ fontSize: '13px', color: qty > 0 ? 'var(--message-text-assistant, #e8dcc8)' : 'var(--text-secondary, rgba(201,169,110,0.5))'}}>{name}</span>
                      <span style={{ fontSize: '13px', color: qty > 0 ? 'var(--text-secondary, #e8dcc8)' : 'rgba(255,255,255,0.15)' }}>×{qty}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {RECIPES.map(r => {
                    const ok = canMake(r)
                    return (
                      <button key={r.name} disabled={!ok} onClick={() => {
                        setFridge(prev => {
                          const next = { ...prev }
                          Object.entries(r.need).forEach(([k, v]) => { next[k] = Math.max(0, (next[k] || 0) - v) })
                          return next
                        })
                        setShowFridge(false)
                        sendToAI(r.prompt, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                      }} style={{ padding: '12px 14px', background: ok ? 'rgba(201,169,110,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${ok ? 'rgba(201,169,110,0.25)' : 'var(--room-btn-bg)'}`, borderRadius: '12px', cursor: ok ? 'pointer' : 'default', textAlign: 'left', fontFamily: 'Georgia,serif' }}>
                        <div style={{ fontSize: '14px', color: ok ? 'var(--message-text-assistant, #e8dcc8)' : 'var(--text-secondary, rgba(201,169,110,0.5))', marginBottom: '4px' }}>{r.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary, rgba(201,169,110,0.6))'}}>
                          {Object.entries(r.need).map(([k, v]) => `${k}×${v}`).join('  ')}
                          {!ok && <span style={{ color: 'var(--text-accent, #F88DA7)', marginLeft: '6px' }}>食材不足</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ══ 看书弹窗 ══ */}
      {showBooks && (
        <div onClick={() => { setShowBooks(false); setShowAddBook(false) }} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', isolation: 'isolate',display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', background: 'var(--panel-bg, rgba(10,7,4,0.97))', border: '1px solid var(--border-glass, rgba(201,169,110,0.12))', borderRadius: '20px 20px 0 0', padding: '20px 20px 44px', maxHeight: '75vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-accent, #F88DA7)', letterSpacing: '0.2em' }}>书架</div>
              <button onClick={() => setShowAddBook(!showAddBook)} style={{ fontSize: '11px', background: 'none', border: '1px solid rgba(201,169,110,0.2)', color: 'var(--text-accent, #F88DA7)', padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'Georgia,serif' }}>+ 添加</button>
            </div>
            {showAddBook && (
              <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                <input value={newBookTitle} onChange={e => setNewBookTitle(e.target.value)} placeholder='书名（作者可选）' style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '10px', padding: '8px 12px', color: 'var(--text-primary, #e8dcc8)', fontSize: '12px', outline: 'none', fontFamily: 'Georgia,serif' }} />
                <button onClick={() => {
                  if (!newBookTitle.trim()) return
                  const parts = newBookTitle.split(' ')
                  setBookList(prev => [...prev, { title: parts[0], author: parts[1] || '' }])
                  setNewBookTitle('')
                  setShowAddBook(false)
                }} style={{ padding: '8px 14px', background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.25)', borderRadius: '10px', color: 'var(--message-text-assistant, #e8dcc8)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia,serif' }}>加入</button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {bookList.map((b, i) => (
                <button key={i} onClick={() => {
                  setShowBooks(false)
                  sendToAI(`她拿起《${b.title}》看了起来${b.author ? `（${b.author}写的）` : ''}，你注意到了，发表一句评价或问她看到哪里了`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                }} style={{ padding: '10px 14px', background: 'rgba(201,169,110,0.05)', border: '1px solid var(--border-glass, rgba(201,169,110,0.1))', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'Georgia,serif' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary, #e8dcc8)' }}>《{b.title}》</span>
                  {b.author && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginLeft: '8px' }}>{b.author}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ 日记弹窗 ══ */}
      {showDiary && (
        <div onClick={() => { setShowDiary(false); setViewingDiary(null) }} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',isolation: 'isolate', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', background: 'var(--panel-bg, rgba(10,7,4,0.97))', border: '1px solid var(--border-glass, rgba(201,169,110,0.12))', borderRadius: '20px 20px 0 0', padding: '20px 20px 44px', maxHeight: '75vh', overflowY: 'auto' }}>
            {viewingDiary !== null ? (
              <>
                <button onClick={() => setViewingDiary(null)} style={{ fontSize: '11px', background: 'none', border: 'none', color: 'var(--text-accent, #F88DA7)', cursor: 'pointer', marginBottom: '12px', fontFamily: 'Georgia,serif' }}>← 返回</button>
                <div style={{ fontSize: '10px', color: 'var(--text-accent, #F88DA7)', marginBottom: '10px' }}>{diaryList[viewingDiary]?.date}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-primary, #e8dcc8)', lineHeight: 1.9, fontStyle: 'italic' }}>{diaryList[viewingDiary]?.content}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '11px', color: 'var(--text-accent, #F88DA7)', letterSpacing: '0.2em', marginBottom: '14px' }}>
                  他的日记 · {diaryList.length > 0 ? `共${diaryList.length}篇` : '无记录'}
                </div>
                {diaryList.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.15)', textAlign: 'center', padding: '20px 0' }}>他还没写过</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {diaryList.map((d, i) => (
                      <button key={i} onClick={() => setViewingDiary(i)} style={{ padding: '10px 14px', background: 'rgba(201,169,110,0.05)', border: '1px solid var(--border-glass, rgba(201,169,110,0.1))', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'Georgia,serif' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-accent, #F88DA7)', marginRight: '10px' }}>{d.date}</span>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>{d.content.slice(0, 20)}…</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ 重要回忆弹窗 ══ */}
{showMemories && (
  <div onClick={() => setShowMemories(false)} style={{
    position: 'fixed', inset: 0, zIndex: 250,
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: '100%', maxWidth: '480px',
      background: 'var(--panel-bg, rgba(10,7,4,0.97))',
      border: '1px solid var(--border-glass, rgba(201,169,110,0.12))',
      borderRadius: '20px 20px 0 0',
      padding: '20px 20px 44px',
      maxHeight: '75vh',
      overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-accent, #c9a06e)', letterSpacing: '0.1em' }}>📖 重要回忆</div>
        <button onClick={() => setShowMemories(false)} style={{
          background: 'none', border: 'none',
          color: 'var(--text-secondary, rgba(255,255,255,0.3))', fontSize: '18px', cursor: 'pointer'
        }}>✕</button>
      </div>

      {importantMemories.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          color: 'rgb(255, 180, 60)', fontSize: '12px', lineHeight: 1.8
        }}>
          💭 还没有重要回忆<br/>
          <span style={{ fontSize: '10px', opacity: 0.8 }}>和他创造更多故事吧</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {importantMemories.map((memory, idx) => (
            <div key={idx} style={{
              padding: '14px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-glass, rgba(201,169,110,0.1))',
              borderRadius: '12px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--message-text-assistant, #e8dcc8)',
                  fontWeight: 'bold',
                  letterSpacing: '0.05em'
                }}>
                  {memory.title}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'rgba(201,169,110,0.4)'
                }}>
                  {'❤️'.repeat(memory.importance)}
                </div>
              </div>
              <div style={{
                fontSize: '12px',
                color: 'var(--message-text-assistant, #e8dcc8)',
                lineHeight: 1.7
              }}>
                {memory.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}
{/* ══ 收藏弹窗 ══ */}
{showFavorites && (
  <div onClick={() => setShowFavorites(false)} style={{
    position: 'fixed', inset: 0, zIndex: 250,
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: '100%', maxWidth: '480px',
      background: 'var(--panel-bg, rgba(10,7,4,0.97))',
      border: '1px solid var(--border-glass, rgba(201,169,110,0.12))',
      borderRadius: '20px 20px 0 0',
      padding: '20px 20px 44px',
      maxHeight: '75vh',
      overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-accent, #c9a96e)', letterSpacing: '0.1em' }}>📝 我的收藏</div>
        <button onClick={() => setShowFavorites(false)} style={{
          background: 'none', border: 'none',
          color: 'var(--text-secondary, rgba(255,255,255,0.3))', fontSize: '18px', cursor: 'pointer'
        }}>✕</button>
      </div>

      {favorites.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          color: 'rgba(201,169,110,0.3)', fontSize: '12px', lineHeight: 1.8
        }}>
          💭 还没有收藏<br/>
          <span style={{ fontSize: '10px', opacity: 0.6 }}>点击消息下方的 ❤ 收藏</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {favorites.map((fav, idx) => (
            <div key={idx} style={{
              padding: '14px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-glass, rgba(201,169,110,0.1))',
              borderRadius: '12px',
            }}>
              <div style={{
                fontSize: '10px',
                color: fav.role === 'user' ? 'var(--text-accent, #F88DA7)' : 'rgba(201,169,110,0.4)',
                marginBottom: '6px',
                display: 'flex',
                gap: '8px'
              }}>
                <span>{fav.role === 'user' ? '你' : '他'}</span>
                <span>·</span>
                <span>{fav.location || '未知'}</span>
                <span>·</span>
                {fav.outfit && fav.outfit !== '默认' && (
  <>
                    <span>{fav.outfit}</span>
                    <span>·</span>
                  </>
                )}
                <span>·</span>
                <span>{fav.timestamp || ''}</span>
              </div>
              <div style={{
                fontSize: '13px',
                color: 'var(--message-text-assistant, #e8dcc8)',
                lineHeight: 1.6
              }}>
                {fav.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}

{/* ══ 日历弹窗 ══ */}
        {showCalendar && (() => {
    const gd = realDate()
    const calData = getCalendarData(calYear, calMonth, periodDays, gd)
    const predicted = predictNextPeriod(periodDays)
    const calNavBtn = { background: 'none', border: '1px solid rgba(201,169,110,0.15)', color: 'var(--text-accent, #F88DA7)', padding: '4px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: 'Georgia, serif' }
    return (
      <div onClick={() => setShowCalendar(false)} style={{
        position: 'fixed', inset: 0, zIndex: 250,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          width: '100%', maxWidth: '480px',
          background: 'var(--panel-bg, rgba(10,7,4,0.97))',
          border: '1px solid var(--border-glass, rgba(201,169,110,0.12))',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px 44px',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-accent, #F88DA7)', letterSpacing: '0.2em', marginBottom: '14px' }}>
            🩸 生理期日历
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <button onClick={() => {
              if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1) }
              else setCalMonth(calMonth - 1)
            }} style={calNavBtn}>◀</button>
            <span style={{ fontSize: '13px', color: 'var(--message-text-assistant, #e8dcc8)' }}>{calYear}年{calMonth}月</span>
            <button onClick={() => {
              if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1) }
              else setCalMonth(calMonth + 1)
            }} style={calNavBtn}>▶</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
            {['日','一','二','三','四','五','六'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '10px',  color: 'rgb(201, 169, 110)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {calData.days.map((d, i) => {
                if (!d) return <div key={`empty-${i}`} />
                return (
                  <button key={d.day} onClick={() => handleTogglePeriod(calYear, calMonth, d.day)} style={{
                    padding: '8px 0', textAlign: 'center', fontSize: '12px',
                    background: d.isMarked ? 'rgba(255,100,120,0.15)' : d.isPredicted ? 'rgba(255,150,180,0.08)' : 'rgba(201,169,110,0.1)',
                    border: d.isToday ? '1px solid rgba(100,160,255,0.5)' : d.isMarked ? '1px solid rgba(255,100,120,0.3)' : d.isPredicted ? '1px solid rgba(255,150,180,0.2)' : d.isSensitive ? '1px solid rgba(255,180,60,0.3)' : '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '8px', cursor: 'pointer',
                    color: d.isMarked ? '#ff8090' : d.isToday ? '#80b0ff' : d.isPredicted ? '#ff90a0' : d.isSensitive ? '#e0a030' : 'var(--message-text-assistant, #e8dcc8)',
                    fontFamily: 'Georgia, serif',
                  }}>
                    {d.isMarked ? '🩸' : d.day}
                  </button>
                )
              })}
            </div>

          <div style={{ marginTop: '12px', fontSize: '10px', color: 'rgb(201, 169, 110)', lineHeight: 1.8 }}>
            <div>已记录 {periodDays.length} 天 · 点日期标记/取消</div>
            {predicted && <div>预计下次：{predicted.m}月{predicted.d}日</div>}
            <div style={{ marginTop: '4px', display: 'flex', gap: '12px' }}>
              <span>🩸 = 已标记</span>
              <span style={{ color: 'rgba(100, 159, 255, 0.8)' }}>蓝框 = 今天</span>
              <span style={{ color: 'rgba(255, 180, 60, 0.8)' }}>橙框 = 敏感期</span>
            </div>
          </div>
        </div>
      </div>
    )
  })()}

  {/* 衣帽间弹窗 */}
{/* {showWardrobe && (
  <div onClick={() => setShowWardrobe(false)} style={{
    position: 'fixed', inset: 0, zIndex: 250,
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: '100%', maxWidth: '480px',
      background: 'var(--panel-bg, rgba(10,7,4,0.97))',
      border: '1px solid var(--border-glass, rgba(201,169,110,0.12))',
      borderRadius: '20px 20px 0 0',
      padding: '20px 20px 44px', maxHeight: '70vh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-accent, #F88DA7)', letterSpacing: '0.1em' }}>衣帽间</div>
        <button onClick={() => setShowWardrobe(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, rgba(255,255,255,0.3))', fontSize: '18px', cursor: 'pointer' }}>✕</button>
      </div>*/}

              {/* 我的衣服 */}
        {/*<div style={{ fontSize: '12px', color: 'var(--text-accent, #F88DA7)', marginBottom: '8px', marginTop: '8px' }}>👗 我的衣服</div>
        <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.5)', marginBottom: '12px' }}>
          当前：{ALL_OUTFITS.find(o => o.id === currentOutfit)?.name || '白衬衫'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {getOwnedOutfits(wardrobe).map(o => (
            <button key={o.id} onClick={() => {
              setCurrentOutfit(o.id)
              setShowWardrobe(false)
              sendToAI(`她换上了${o.name}，${o.desc}，你看到了，说一句`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
              saveToDb(messages, intimacy, playerRoom, luRoom)
            }} style={{
              padding: '12px 14px', textAlign: 'left',
              background: currentOutfit === o.id ? 'rgba(201,169,110,0.15)' : 'var(--card-bg)',
              border: `1px solid ${currentOutfit === o.id ? 'rgba(201,169,110,0.4)' : 'rgba(201,169,110,0.1)'}`,
              borderRadius: '12px', cursor: 'pointer',
              color: 'var(--message-text-assistant, #e8dcc8)',
              fontFamily: 'Georgia, serif',
            }}>
              <div style={{ fontSize: '13px', marginBottom: '3px' }}>{o.name}</div>
              <div style={{ fontSize: '10px', opacity: 0.6 }}>{o.desc}</div>
            </button>
          ))}
        </div>*/}

        {/* 他的衣服 */}
        {/*<div style={{ fontSize: '12px', color: 'var(--text-accent, #F88DA7)', marginBottom: '8px' }}>👔 他的衣服</div>
        <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.5)', marginBottom: '12px' }}>
          当前：{ALL_OUTFITS.find(o => o.id === aiOutfit)?.name || '白衬衫'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {getOwnedOutfits(wardrobe).map(o => (
            <button key={o.id} onClick={() => {
              setAiOutfit(o.id)
              setShowWardrobe(false)
              sendToAI(`她给你换上了${o.name}，${o.desc}，你的反应，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
              saveToDb(messages, intimacy, playerRoom, luRoom)
            }} style={{
              padding: '12px 14px', textAlign: 'left',
              background: aiOutfit === o.id ? 'rgba(201,169,110,0.15)' : 'var(--card-bg)',
              border: `1px solid ${aiOutfit === o.id ? 'rgba(201,169,110,0.4)' : 'rgba(201,169,110,0.1)'}`,
              borderRadius: '12px', cursor: 'pointer',
              color: 'var(--message-text-assistant, #e8dcc8)',
              fontFamily: 'Georgia, serif',
            }}>
              <div style={{ fontSize: '13px', marginBottom: '3px' }}>{o.name}</div>
              <div style={{ fontSize: '10px', opacity: 0.6 }}>{o.desc}</div>
            </button>
          ))}
        </div>
    </div>
  </div>
)}*/}

{showWardrobe && (
  <div onClick={() => setShowWardrobe(false)} style={{
    position: 'fixed', inset: 0, zIndex: 250,
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: '100%', maxWidth: '480px',
      background: 'var(--panel-bg, rgba(10,7,4,0.97))',
      border: '1px solid var(--border-glass, rgba(201,169,110,0.12))',
      borderRadius: '20px 20px 0 0',
      padding: '20px 20px 44px', maxHeight: '70vh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-accent, #F88DA7)', letterSpacing: '0.1em' }}>衣帽间</div>
        <button onClick={() => setShowWardrobe(false)} style={{
          background: 'none', border: 'none',
          color: 'var(--text-secondary, rgba(255,255,255,0.3))',
          fontSize: '18px', cursor: 'pointer'
        }}>✕</button>
      </div>

      {/* 👗 我的衣服（女主） */}
      <div style={{ fontSize: '12px', color: 'var(--text-accent, #F88DA7)', marginBottom: '8px', marginTop: '8px' }}>
        👗 我的衣服
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.5)', marginBottom: '12px' }}>
        当前：{ALL_OUTFITS.find(o => o.id === currentOutfit)?.name || '碎花裙'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        {getOwnedOutfits(myWardrobe).map(o => (
          <button key={o.id} onClick={() => {
            setCurrentOutfit(o.id)
            setShowWardrobe(false)
            sendToAI(`她换上了${o.name}，${o.desc}，你看到了，说一句`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
            saveToDb(messages, intimacy, playerRoom, luRoom)
          }} style={{
            padding: '12px 14px', textAlign: 'left',
            background: currentOutfit === o.id ? 'rgba(201,169,110,0.15)' : 'var(--card-bg)',
            border: `1px solid ${currentOutfit === o.id ? 'rgba(201,169,110,0.4)' : 'rgba(201,169,110,0.1)'}`,
            borderRadius: '12px', cursor: 'pointer',
            color: 'var(--message-text-assistant, #e8dcc8)',
            fontFamily: 'Georgia, serif',
          }}>
            <div style={{ fontSize: '13px', marginBottom: '3px' }}>{o.name}</div>
            <div style={{ fontSize: '10px', opacity: 0.6 }}>{o.desc}</div>
          </button>
        ))}
      </div>

      {/* 👔 他的衣服（男主） */}
      <div style={{ fontSize: '12px', color: 'var(--text-accent, #F88DA7)', marginBottom: '8px' }}>
        👔 他的衣服
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.5)', marginBottom: '12px' }}>
        当前：{ALL_OUTFITS.find(o => o.id === aiOutfit)?.name || '白衬衫'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {getOwnedOutfits(hisWardrobe).map(o => (
          <button key={o.id} onClick={() => {
            setAiOutfit(o.id)
            setShowWardrobe(false)
            sendToAI(`她给你换上了${o.name}，${o.desc}，你的反应，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
            saveToDb(messages, intimacy, playerRoom, luRoom)
          }} style={{
            padding: '12px 14px', textAlign: 'left',
            background: aiOutfit === o.id ? 'rgba(201,169,110,0.15)' : 'var(--card-bg)',
            border: `1px solid ${aiOutfit === o.id ? 'rgba(201,169,110,0.4)' : 'rgba(201,169,110,0.1)'}`,
            borderRadius: '12px', cursor: 'pointer',
            color: 'var(--message-text-assistant, #e8dcc8)',
            fontFamily: 'Georgia, serif',
          }}>
            <div style={{ fontSize: '13px', marginBottom: '3px' }}>{o.name}</div>
            <div style={{ fontSize: '10px', opacity: 0.6 }}>{o.desc}</div>
          </button>
        ))}
      </div>
    </div>
  </div>
)}

{/* 床头柜弹窗（新版，支持数量） */}
{showBedside && (
  <div onClick={() => setShowBedside(false)} style={{
    position: 'fixed', inset: 0, zIndex: 250,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: '100%', maxWidth: '480px',
      background: 'var(--panel-bg, rgba(10,7,4,0.97))',
      border: '1px solid var(--border-glass, rgba(201,169,110,0.12))',
      borderRadius: '20px 20px 0 0',
      padding: '20px 20px 44px', maxHeight: '70vh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-accent, #F88DA7)', letterSpacing: '0.1em' }}>床头柜</div>
        <button onClick={() => setShowBedside(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, rgba(255,255,255,0.3))', fontSize: '18px', cursor: 'pointer' }}>✕</button>
      </div>

      {bedsideItems.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--message-text-assistant, #e8dcc8)', textAlign: 'center', padding: '20px 0' }}>
          空空如也…去商场逛逛？
        </div>
      ) : (
        <>
          <div style={{ fontSize: '10px', color: 'var(--text-accent, #F88DA7)', marginBottom: '10px' }}>选一件使用</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bedsideItems.map(item => {
              // 从 ALL_BEDSIDE_ITEMS 中找到完整信息
              const fullItem = ALL_BEDSIDE_ITEMS.find(i => i.id === item.id)
              if (!fullItem) return null
              return (
                <button key={item.id} onClick={() => {
                  setShowBedside(false)
                  // 加浪漫值
                  // 解析浪漫值加成
                  let romanticBoost = 0
                  if (fullItem.effect && fullItem.effect.startsWith('romantic+')) {
                    romanticBoost = parseInt(fullItem.effect.replace('romantic+', '')) || 0
                  }
                  if (romanticBoost > 0) {
                    setRomantic(prev => Math.min(100, prev + romanticBoost))
                    setToast(`❤️ 浪漫 +${romanticBoost}`)
                  }
                  if (fullItem.hint) {
                    sendToAI(fullItem.hint, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                  } else {
                    sendToAI(`她拿出了${fullItem.name}（${fullItem.desc}），你的反应，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                  }
                  // 消耗一个 （数量减1）
                  setBedsideItems(prev =>
                    prev.map(i => {
                      if (i.id === item.id) {
                        const newQty = i.qty - 1
                        return newQty > 0 ? { ...i, qty: newQty } : null
                      }
                      return i
                    }).filter(Boolean)
                  )
                  saveToDb(messages, intimacy, playerRoom, luRoom)
                }} style={{
                  padding: '12px 14px', textAlign: 'left',
                  background: 'rgba(201, 169, 110, 0.1)',
                  border: '1px solid rgba(201,169,110,0.1)',
                  borderRadius: '12px', 
                  cursor: 'pointer',
                  opacity: 1,
                  color: 'var(--text-secondary, rgba(255,255,255,0.5))',
                  fontFamily: 'Georgia, serif',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', marginBottom: '3px', color: 'var(--message-text-assistant, #e8dcc8)' }}>
                        {fullItem.name}
                      </div>
                      <div style={{ fontSize: '10px', opacity: 0.8 ,color: 'var(--message-text-assistant, #e8dcc8)'}}>{fullItem.desc}</div>
                      {fullItem.consumable && <div style={{ fontSize: '9px', color: 'rgb(255, 180, 60)', marginTop: '2px' }}>· 消耗品</div>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--message-text-assistant, #e8dcc8)' }}>×{item.qty}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  </div>
)}
{/* 商场弹窗 */}
{showShop && (() => {
    // 合并所有已拥有的衣物
    const ownedAll = [...myWardrobe, ...hisWardrobe]
    const ownedBedsideIds = bedsideItems.map(i => i.id)
    const shopItems = getShopItems(ownedAll, ownedBedsideIds, intimacy)
    
    console.log('=== 商场刷新 ===')
    console.log('已拥有衣物:', ownedAll)
    console.log('好感度:', intimacy)
    console.log('可购买 - 他的衣物:', shopItems.hisClothes?.length || 0)
    console.log('可购买 - 我的衣物:', shopItems.herClothes?.length || 0)
    console.log('可购买 - 情趣道具:', shopItems.toys?.length || 0)
    console.log('可购买 - 礼物:', shopItems.gifts?.length || 0)
    
    // 根据 tab 显示对应商品
    const currentItems = 
      shopTab === 'his' ? shopItems.hisClothes :
      shopTab === 'her' ? shopItems.herClothes :
      shopTab === 'toys' ? shopItems.toys :
      shopItems.gifts
  
  return (
    <div onClick={() => setShowShop(false)} style={{
      position: 'fixed', inset: 0, zIndex: 250,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '480px',
        background: 'var(--panel-bg, rgba(10,7,4,0.97))',
        border: '1px solid var(--border-glass, rgba(201,169,110,0.12))',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 44px', maxHeight: '70vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-accent, #F88DA7)', letterSpacing: '0.1em' }}>🛍️ 商场</div>
          <div style={{ fontSize: '14px', color: '#ffd966' }}>💰 {coins}</div>
        </div>

        {/* Tab栏 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(201,169,110,0.1)', paddingBottom: '10px' }}>
          {SHOP_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setShopTab(cat.id)} style={{
              background: 'none', border: 'none',
              padding: '6px 12px', borderRadius: '20px',
              color: shopTab === cat.id ? 'var(--message-text-assistant, #e8dcc8)' : 'rgba(255,255,255,0.3)',
              fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif',
              borderBottom: shopTab === cat.id ? '1px solid var(--message-text-assistant, #e8dcc8)' : 'none',
            }}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* 商品列表 */}
        {currentItems.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'rgba(201,169,110,0.3)', textAlign: 'center', padding: '40px 0' }}>
            暂无商品可购买
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentItems.map(item => {
              const isGift = item.shopType === 'gift'
              const isHerClothes = item.owner === 'her'
              const canAfford = coins >= item.price
              return (
                <button key={item.id} onClick={() => {
                  if (!canAfford) { setToast('金币不足'); return }
                  setCoins(prev => prev - item.price)
                  
                  if (isGift) {
                    // 礼物：加好感度
                    const newIntimacy = Math.min(100, intimacy + (item.intimacyBoost || 0))
                    setIntimacy(newIntimacy)
                    sendToAI(`她送了他${item.name}（${item.desc}），他的反应，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                  } else if (item.shopType === 'wardrobe') {
                          if (item.owner === 'her') {
                            // 女主衣服
                            setMyWardrobe(prev => [...prev, item.id])
                            sendToAI(`她买了一件${item.name}，${item.desc}，他的反应，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                          } else {
                            // 男主衣服
                            setHisWardrobe(prev => [...prev, item.id])
                            sendToAI(`她买了一件${item.name}（${item.desc}）给他，他还没有换上，一句话评价`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                    }
                  } else if (item.shopType === 'bedside') {
                      setBedsideItems(prev => {
                        const existing = prev.find(i => i.id === item.id)
                        if (existing) {
                          return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
                        } else {
                          return [...prev, { id: item.id, qty: 1 }]
                        }
                      })
                      sendToAI(`她买了${item.name}（${item.desc}），放进床头柜，他的反应，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                    }
                  
                  saveToDb(messages, intimacy, playerRoom, luRoom)
                  setToast(`购买了 ${item.name}`)
                }} style={{
                  padding: '12px 14px', textAlign: 'left',
                  background: 'var(--card-bg)',
                  border: '1px solid rgba(201,169,110,0.08)',
                  borderRadius: '12px', cursor: canAfford ? 'pointer' : 'default',
                  opacity: canAfford ? 1 : 0.5,
                  fontFamily: 'Georgia, serif',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', marginBottom: '3px', color: 'var(--message-text-assistant, #e8dcc8)' }}>{item.name}</div>
                      <div style={{ fontSize: '10px', opacity: 0.8 }}>{item.desc}</div>
                      {item.category && <div style={{ fontSize: '9px', color: 'rgb(255, 180, 60)', marginTop: '2px' }}>
                        {item.category === 'daily' ? '常服' : item.category === 'formal' ? '正装' : item.category === 'home' ? '居家' : item.category === 'intimate' ? '💕 情趣' : ''}
                      </div>}
                    </div>
                    <div style={{ fontSize: '14px', color: '#ffd966' }}>💰{item.price}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})()}

{/* 超市弹窗 */}
{showSupermarket && (() => {
  const categories = [
    { id: 'staple', label: '🍚 主食', items: SUPERMARKET_ITEMS.filter(i => i.category === 'staple') },
    { id: 'meat', label: '🥩 肉类', items: SUPERMARKET_ITEMS.filter(i => i.category === 'meat') },
    { id: 'veggie', label: '🥬 蔬菜', items: SUPERMARKET_ITEMS.filter(i => i.category === 'veggie') },
    { id: 'snack', label: '🍫 零食', items: SUPERMARKET_ITEMS.filter(i => i.category === 'snack') },
    { id: 'pet', label: '🐾 宠物', items: SUPERMARKET_ITEMS.filter(i => i.category === 'pet') },
    { id: 'life', label: '🩹 生活', items: SUPERMARKET_ITEMS.filter(i => i.category === 'life') },
  ]
  const currentCat = categories.find(c => c.id === superTab)
  
  const getCartQty = (id) => cart.find(c => c.id === id)?.qty || 0
  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id)
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
    } else {
      setCart([...cart, { id: item.id, name: item.name, price: item.price, qty: 1 }])
    }
  }
  const removeFromCart = (id) => {
    const existing = cart.find(c => c.id === id)
    if (existing.qty === 1) {
      setCart(cart.filter(c => c.id !== id))
    } else {
      setCart(cart.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c))
    }
  }
  const totalPrice = cart.reduce((sum, c) => sum + c.price * c.qty, 0)
  
  const handleCheckout = () => {
    if (totalPrice > coins) { setToast('金币不足'); return }
    setCoins(prev => prev - totalPrice)
    
    // 分别处理冰箱和床头柜的物品
    const fridgeAdditions = {}
    const bedsideAdditions = {}  // { id: qty }
    
    cart.forEach(c => {
      const item = SUPERMARKET_ITEMS.find(i => i.id === c.id)
      if (!item) return
      
      if (item.bedsideOnly) {
        // 床头柜物品：累加数量
        bedsideAdditions[item.id] = (bedsideAdditions[item.id] || 0) + c.qty
      } else {
        // 普通食材：放入冰箱
        const fridgeKey = {
          rice: '🍚米', noodle: '🍜面条', egg: '🥚鸡蛋', milk: '🥛牛奶',
          chicken: '🍗鸡肉', pork: '🥩猪肉', fish: '🐟鱼', shrimp: '🦐虾',
          tomato: '🍅番茄', lettuce: '🥬青菜', potato: '🥔土豆', mushroom: '🍄蘑菇',
          soy: '🍶酱油', butter: '🧈黄油', choco: '🍫巧克力', cake: '🍰蛋糕',
          catfood: '🐱猫粮', dogfood: '🐶狗粮',
        }[item.id] || item.name
        fridgeAdditions[fridgeKey] = (fridgeAdditions[fridgeKey] || 0) + c.qty
      }
    })
    
    // 更新冰箱
    if (Object.keys(fridgeAdditions).length > 0) {
      setFridge(prev => {
        const next = { ...prev }
        Object.entries(fridgeAdditions).forEach(([key, qty]) => {
          next[key] = (next[key] || 0) + qty
        })
        return next
      })
    }
    
    // 更新床头柜（支持数量）
    if (Object.keys(bedsideAdditions).length > 0) {
      setBedsideItems(prev => {
        const newList = [...prev]
        Object.entries(bedsideAdditions).forEach(([id, qty]) => {
          const existing = newList.find(i => i.id === id)
          if (existing) {
            existing.qty += qty
          } else {
            newList.push({ id, qty })
          }
        })
        return newList
      })
    }
    
    setCart([])
    setShowSupermarket(false)
    setToast('采购完成！')
    sendToAI('她去超市采购回来，说一句', messages, intimacy, playerRoom, luRoom, false, undefined, true)
    saveToDb(messages, intimacy, playerRoom, luRoom)
  }


  return (
    <div onClick={() => setShowSupermarket(false)} style={{
      position: 'fixed', inset: 0, zIndex: 250,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '480px',
        background: 'var(--panel-bg, rgba(10,7,4,0.97))',
        border: '1px solid var(--border-glass, rgba(201,169,110,0.12))',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 44px', maxHeight: '75vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-accent, #F88DA7)', letterSpacing: '0.1em' }}>🛒 超市</div>
          <div style={{ fontSize: '14px', color: '#ffd966' }}>💰 {coins}</div>
        </div>

        {/* 分类Tab */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSuperTab(cat.id)} style={{
              background: 'none', border: 'none',
              padding: '5px 12px', borderRadius: '20px', whiteSpace: 'nowrap',
              color: superTab === cat.id ? 'var(--message-text-assistant, #e8dcc8)' : 'rgba(255,255,255,0.3)',
              fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif',
            }}>
              {cat.label}
            </button>
          ))}
        </div>

        {/* 商品列表 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {currentCat?.items.map(item => {
            const qty = getCartQty(item.id)
            return (
              <div key={item.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px',
                background: 'var(--card-bg)',
                border: '1px solid rgba(201,169,110,0.08)',
                borderRadius: '12px',
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--message-text-assistant, #e8dcc8)' }}>{item.emoji} {item.name}</div>
                  <div style={{ fontSize: '10px', color: '#ffd966' }}>💰{item.price}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {qty > 0 && <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, rgba(255,255,255,0.5))', fontSize: '18px', cursor: 'pointer' }}>-</button>}
                  {qty > 0 && <span style={{ fontSize: '14px', color: 'var(--message-text-assistant, #e8dcc8)' }}>{qty}</span>}
                  <button onClick={() => addToCart(item)} style={{ background: 'none', border: 'none', color: 'var(--message-text-assistant, #e8dcc8)', fontSize: '18px', cursor: 'pointer' }}>+</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 购物车 */}
        {cart.length > 0 && (
          <div style={{
            borderTop: '1px solid rgba(201,169,110,0.1)',
            paddingTop: '12px', marginTop: '4px',
          }}>
            <div style={{ fontSize: '11px', color: 'rgba(201,169,110,0.4)', marginBottom: '8px' }}>购物车</div>
            {cart.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary, rgba(255,255,255,0.5))', marginBottom: '4px' }}>
                <span>{c.name} x{c.qty}</span>
                <span>💰{c.price * c.qty}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--message-text-assistant, #e8dcc8)' }}>总计: 💰{totalPrice}</span>
              <button onClick={handleCheckout} style={{
                padding: '6px 20px', background: 'rgba(201,169,110,0.15)',
                border: '1px solid rgba(201,169,110,0.3)', borderRadius: '20px',
                color: 'var(--message-text-assistant, #e8dcc8)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif',
              }}>结算</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})()}

{/* 宠物面板 */}
{showPetPanel && (
  <div onClick={() => { setShowPetPanel(false); setShowAdopt(false) }} style={{
    position: 'fixed', inset: 0, zIndex: 250,
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: '100%', maxWidth: '480px',
      background: 'var(--panel-bg, rgba(10,7,4,0.97))',
      border: '1px solid var(--border-glass, rgba(201,169,110,0.12))',
      borderRadius: '20px 20px 0 0',
      padding: '20px 20px 44px',
    }}>
      {!pet ? (
        // 领养界面
        <>
          <div style={{ fontSize: '13px', color: 'var(--message-text-assistant, #e8dcc8)', marginBottom: '14px', textAlign: 'center' }}>🐾 领养宠物</div>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '20px' }}>
            {PETS.map(p => (
              <button key={p.id} onClick={() => setAdoptingType(p.id)} style={{
                background: 'rgba(201,169,110,0.08)',
                border: adoptingType === p.id ? '1px solid var(--message-text-assistant, #e8dcc8)' : '1px solid rgba(201,169,110,0.2)',
                borderRadius: '16px', padding: '16px', cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ fontSize: '48px' }}>{p.emoji}</div>
                <div style={{ fontSize: '14px', color: 'var(--message-text-assistant, #e8dcc8)', marginTop: '8px' }}>{p.name}</div>
              </button>
            ))}
          </div>
          {adoptingType && (
            <>
              <input
                value={petNameInput}
                onChange={e => setPetNameInput(e.target.value)}
                placeholder="给宠物起个名字"
                style={{
                  width: '100%', padding: '10px 14px', marginBottom: '12px',
                  background: 'var(--card-bg-hover)', border: '1px solid rgba(201,169,110,0.15)',
                  borderRadius: '12px', color: 'var(--text-primary, #e8dcc8)', fontSize: '13px', outline: 'none',
                  fontFamily: 'Georgia, serif',
                }}
              />
              <button onClick={() => {
                const newPet = createPet(adoptingType, petNameInput || (adoptingType === 'cat' ? '咪咪' : '旺财'))
                setPet(newPet)
                setShowPetPanel(false)
                setAdoptingType(null)
                setPetNameInput('')
                sendToAI(`她带回了一只${newPet.name}，你的反应，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                saveToDb(messages, intimacy, playerRoom, luRoom)
              }} style={{
                width: '100%', padding: '12px',
                background: 'var(--border-glass)', border: '1px solid rgba(201,169,110,0.25)',
                borderRadius: '12px', color: 'var(--message-text-assistant, #e8dcc8)', fontSize: '13px', cursor: 'pointer',
                fontFamily: 'Georgia, serif',
              }}>确认领养</button>
            </>
          )}
        </>
      ) : (
        // 宠物管理界面
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '24px' }}>{PETS.find(p => p.id === pet.typeId)?.emoji}</div>
            <div style={{ fontSize: '16px', color: 'var(--message-text-assistant, #e8dcc8)' }}>{pet.name}</div>
            <button onClick={() => setShowPetPanel(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, rgba(255,255,255,0.3))', fontSize: '18px', cursor: 'pointer' }}>✕</button>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: 'var(--message-text-assistant, #e8dcc8)', marginBottom: '4px' }}>饥饿</div>
            <div style={{ height: '4px', background: 'var(--room-btn-bg)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pet.hunger}%`, background: pet.hunger < 30 ? '#e08030' : 'rgba(201,169,110,0.8)', borderRadius: '4px' }} />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: 'var(--message-text-assistant, #e8dcc8)', marginBottom: '4px' }}>清洁</div>
            <div style={{ height: '4px', background: 'var(--room-btn-bg)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pet.clean}%`, background: pet.clean < 30 ? '#e08030' : 'rgba(55, 198, 213, 0.8)', borderRadius: '4px' }} />
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', color: 'var(--message-text-assistant, #e8dcc8)', marginBottom: '4px' }}>心情</div>
            <div style={{ height: '4px', background: 'var(--room-btn-bg)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pet.mood}%`, background: pet.mood < 30 ? '#e08030' : 'rgba(213, 55, 184, 0.8)', borderRadius: '4px' }} />
            </div>
          </div>

          {pet.sick && <div style={{ fontSize: '11px', color: '#e08030', marginBottom: '12px', textAlign: 'center' }}>🤒 它生病了，需要照顾！</div>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => {
              const foodId = pet.typeId === 'cat' ? 'catfood' : 'dogfood'
              const foodName = pet.typeId === 'cat' ? '🐱猫粮' : '🐶狗粮'
              if ((fridge[foodName] || 0) <= 0) { setToast(`${foodName}不足`); return }
              setFridge(prev => ({ ...prev, [foodName]: Math.max(0, (prev[foodName] || 0) - 1) }))
              setPet(feedPet(pet))
              setToast(`喂了${pet.name}`)
              saveToDb(messages, intimacy, playerRoom, luRoom)
            }} style={{ padding: '6px 14px', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'var(--text-secondary, #e8dcc8)', fontSize: '12px', cursor: 'pointer' }}>
              🍖 喂食
            </button>
            <button onClick={() => {
              setPet(bathePet(pet))
              setToast(`给${pet.name}洗了澡`)
              saveToDb(messages, intimacy, playerRoom, luRoom)
            }} style={{ padding: '6px 14px', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'var(--text-secondary, #e8dcc8)', fontSize: '12px', cursor: 'pointer' }}>
              🧼 洗澡
            </button>
            <button onClick={() => {
              setPet(strokePet(pet))
              setToast(`撸了${pet.name}`)
              sendToAI(`她摸了摸${pet.name}，你的反应，一句话`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
              saveToDb(messages, intimacy, playerRoom, luRoom)
            }} style={{ padding: '6px 14px', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'var(--text-secondary, #e8dcc8)', fontSize: '12px', cursor: 'pointer' }}>
              🫳 撸它
            </button>
            <button onClick={() => {
              sendToAI(`她叫${pet.name}过来，他的反应`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
            }} style={{ padding: '6px 14px', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '20px', color: 'var(--text-secondary, #e8dcc8)', fontSize: '12px', cursor: 'pointer' }}>
              🗣️ 叫他过来
            </button>
          </div>

          <button onClick={() => {
            setPet(null)
            setShowPetPanel(false)
            sendToAI('她决定把宠物送走，他的反应，一句话', messages, intimacy, playerRoom, luRoom, false, undefined, true)
            saveToDb(messages, intimacy, playerRoom, luRoom)
          }} style={{
            width: '100%', padding: '10px', marginTop: '8px',
            background: 'none', border: '1px solid rgba(255,100,100,0.2)',
            borderRadius: '10px', color: 'rgba(255,100,100,0.5)', fontSize: '12px', cursor: 'pointer',
            fontFamily: 'Georgia, serif',
          }}>送走</button>
        </>
      )}
    </div>
  </div>
)}
            {showGarden && (
              <div onClick={() => setShowGarden(false)} style={{
                position: 'fixed', inset: 0, zIndex: 250,
                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              }}>
                <div onClick={e => e.stopPropagation()} style={{
                  width: '100%', maxWidth: '480px',
                  background: 'var(--panel-bg, rgba(10,7,4,0.97))',
                  border: '1px solid var(--border-glass, rgba(201,169,110,0.12))',
                  borderRadius: '20px 20px 0 0',
                  padding: '20px 20px 44px', maxHeight: '75vh', overflowY: 'auto',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-accent, #F88DA7)', letterSpacing: '0.1em' }}>🌱 阳台花园</div>
                    <button onClick={() => setShowGarden(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, rgba(255,255,255,0.3))', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                  </div>

                  {/* 花盆列表 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
                    {Array.from({ length: MAX_POTS }).map((_, i) => {
                      const pot = garden[i]
                      if (!pot) {
                        return (
                          <div key={`empty-${i}`} style={{
                            padding: '16px', textAlign: 'center',
                            background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(201,169,110,0.1)',
                            borderRadius: '12px', color: 'rgba(201,169,110,0.2)', fontSize: '11px',
                          }}>
                            🪴 空花盆
                          </div>
                        )
                      }
                      const display = getPlantDisplay(pot)
                      return (
                        <div key={i} style={{
                          padding: '12px', textAlign: 'center',
                          background: 'rgba(201,169,110,0.04)', border: '1px solid var(--border-glass, rgba(201,169,110,0.12))',
                          borderRadius: '12px',
                        }}>
                          <div style={{ fontSize: '28px', marginBottom: '4px' }}>{display.emoji}</div>
                          <div style={{ fontSize: '12px', color: 'var(--message-text-assistant, #e8dcc8)', marginBottom: '2px' }}>{display.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-accent, #F88DA7)', marginBottom: '8px' }}>{display.label}</div>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            {display.needsWater && (
                              <button onClick={() => {
                                setGarden(waterPlant(garden, i))
                                setToast(`💧 浇了${display.name}`)
                                saveToDb(messages, intimacy, playerRoom, luRoom)
                              }} style={{
                                padding: '3px 10px', fontSize: '10px', background: 'rgba(80,160,255,0.1)',
                                border: '1px solid rgba(80,160,255,0.2)', borderRadius: '14px',
                                color: 'rgba(80,160,255,0.7)', cursor: 'pointer', fontFamily: 'Georgia, serif',
                              }}>💧浇水</button>
                            )}
                            {display.canHarvest && (
                              <button onClick={() => {
                                const result = harvestPlant(garden, i, fridge)
                                setGarden(result.garden)
                                if (result.fridge) setFridge(result.fridge)
                                if (result.romanticBoost) setRomantic(prev => Math.min(100, prev + result.romanticBoost))
                                setToast(result.msg)
                                if (result.isFlower) {
                                  sendToAI(`她摘了一朵花送给你，你的反应`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                                }
                                saveToDb(messages, intimacy, playerRoom, luRoom)
                              }} style={{
                                padding: '3px 10px', fontSize: '10px', background: 'rgba(201,169,110,0.1)',
                                border: '1px solid rgba(201,169,110,0.2)', borderRadius: '14px',
                                color: 'var(--message-text-assistant, #e8dcc8)', cursor: 'pointer', fontFamily: 'Georgia, serif',
                              }}>🌾收获</button>
                            )}
                            <button onClick={() => {
                              setGarden(removePlant(garden, i))
                              setToast(`拔掉了${display.name}`)
                              saveToDb(messages, intimacy, playerRoom, luRoom)
                            }} style={{
                              padding: '3px 8px', fontSize: '10px', background: 'none',
                              border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px',
                              color: 'var(--message-text-assistant, #e8dcc8)', cursor: 'pointer', fontFamily: 'Georgia, serif',
                            }}>拔掉</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 种植选择 */}
                  {garden.length < MAX_POTS && (
                    <>
                      <div style={{ fontSize: '11px', color: 'rgba(201,169,110,0.4)', marginBottom: '10px', letterSpacing: '0.1em' }}>选一颗种子</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {PLANTS.map(p => (
                          <button key={p.id} onClick={() => {
                            if (coins < p.price) { setToast('金币不足'); return }
                            const result = plantSeed(garden, p.id, gameDay)
                            setGarden(result.garden)
                            setCoins(prev => prev - p.price)
                            setToast(result.msg)
                            sendToAI(`她在阳台种了一颗${p.name}${p.emoji}，你看到了，说一句`, messages, intimacy, playerRoom, luRoom, false, undefined, true)
                            saveToDb(messages, intimacy, playerRoom, luRoom)
                          }} style={{
                            padding: '8px 12px', textAlign: 'center',
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-glass, rgba(201,169,110,0.1))', borderRadius: '10px',
                            cursor: coins >= p.price ? 'pointer' : 'default',
                            opacity: coins >= p.price ? 1 : 0.4,
                            color: 'var(--text-secondary, rgba(255,255,255,0.5))', fontFamily: 'Georgia, serif',
                          }}>
                            <div style={{ fontSize: '20px' }}>{p.emoji}</div>
                            <div style={{ fontSize: '11px', marginTop: '2px' }}>{p.name}</div>
                            <div style={{ fontSize: '9px', color: 'rgba(255,200,60,0.5)' }}>💰{p.price}</div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
        <SettingsPanel show={showSettings} onClose={() => setShowSettings(false)} />
        <ContactModal show={showContact} onClose={() => setShowContact(false)} />
        <SideMenu
          show={showMenu}
          onClose={handleCloseMenu}
          onSettings={() => setShowSettings(true)}
          onLogout={handleLogout}
          onMemories={handleOpenMemories}
          onGarden={handleOpenGarden}
          onPet={handleOpenPet}
          onFridge={handleOpenFridge}
          onSupermarket={() => setShowSupermarket(true)}
          onBedside={() => setShowBedside(true)}
          onWardrobe={handleOpenWardrobe}
          onShop={handleOpenShop}
          onCalendar={handleOpenCalendar}
          onChangeAvatar={handleChangeAvatar}
          onContact={handleContact}
          intimacy={intimacy}
          characterName={characterConfig.name}
          intimacyLevel={getIntimacyLevel(intimacy).level}
          intimacyStage={getIntimacyLevel(intimacy).stage}
          daysTogether={daysTogether}
          avatarUrl={characterConfig.images?.default}
          onFavorites={handleOpenFavorites}
        />
        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: '90px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(12,8,4,0.94)', border: '1px solid rgba(201,169,110,0.15)',
            color: 'var(--text-secondary, #e8dcc8)', fontSize: '11px', padding: '8px 20px',
            borderRadius: '20px', letterSpacing: '0.1em', zIndex: 300,
            whiteSpace: 'nowrap', backdropFilter: 'blur(8px)', isolation: 'isolate'
          }}>{toast}</div>
        )}

        </div>      
      </div>
    </>
  )
}



