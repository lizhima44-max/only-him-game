// components/CharacterCreator.js
// 创造你的他 — 角色导入/捏人面板
import { useState, useRef } from 'react'
import { callAI, loadApiConfig } from '../lib/apiClient'
import { supabase } from '../lib/supabase'
import { fillDefaults, saveCustomCharacter, saveCharacterMemories, uploadCharacterImage } from '../lib/characterImport'

export default function CharacterCreator({ show, onClose, userId, onComplete, theme = 'night' }) {
  const [tab, setTab] = useState('craft')  // 'craft' | 'summon'
  
  // ── 捏人 ──
  const [name, setName] = useState('')
  const [bgText, setBgText] = useState('')
  const [tags, setTags] = useState([])
  const [speechStyle, setSpeechStyle] = useState('')
  const [customTag, setCustomTag] = useState('')
  const [step, setStep] = useState(1) // 1=名字 2=灵魂 3=声音 4=完成

  // ── AI导入 ──
  const [chatText, setChatText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState(null) // 解析结果

  // ── 共用 ──
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const [playerNickname, setPlayerNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const avatarInputRef = useRef(null)

  if (!show) return null

  const isDay = theme === 'day'
  
  // 主题颜色变量
  const themeStyles = {
  // 背景 - 深紫色渐变，不是纯黑
  overlayBg: isDay ? 'rgba(249,245,242,0.96)' : 'linear-gradient(145deg, #1B0A1F 0%, #2D1A35 100%)',
  panelBg: isDay ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
  panelBgHover: isDay ? 'rgba(0,0,0,0.03)' : 'rgba(255,184,197,0.08)',
  
  // 文字 - 粉白色系
  titleColor: isDay ? '#3A3A3A' : 'rgba(255,220,230,0.95)',
  textPrimary: isDay ? '#4A4A4A' : 'rgba(255,200,210,0.9)',
  textSecondary: isDay ? '#8A8A8A' : 'rgba(255,180,190,0.7)',
  textMuted: isDay ? '#B0B0B0' : 'rgba(255,180,190,0.5)',
  textDim: isDay ? '#CCCCCC' : 'rgba(255,180,190,0.35)',
  
  // 边框 - 粉色光晕效果
  borderLight: isDay ? 'rgba(0,0,0,0.08)' : 'rgba(248,141,167,0.15)',
  borderHover: isDay ? 'rgba(0,0,0,0.15)' : 'rgba(248,141,167,0.3)',
  borderActive: isDay ? 'rgba(248,141,167,0.35)' : 'rgba(248,141,167,0.5)',
  
  // 按钮 - 粉色渐变 + 光晕
  btnPrimary: isDay 
    ? 'linear-gradient(135deg, rgba(248,141,167,0.2), rgba(220,100,140,0.15))' 
    : 'linear-gradient(135deg, rgba(248,141,167,0.25), rgba(200,100,140,0.2))',
  btnPrimaryBorder: isDay ? 'rgba(248,141,167,0.3)' : 'rgba(248,141,167,0.4)',
  btnPrimaryColor: isDay ? '#3A3A3A' : 'rgba(255,220,230,0.95)',
  
  // 强调色 - 粉色
  accentColor: isDay ? '#F88DA7' : '#FFB8C5',
  accentBg: isDay ? 'rgba(248,141,167,0.08)' : 'rgba(248,141,167,0.12)',
  accentBorder: isDay ? 'rgba(248,141,167,0.2)' : 'rgba(248,141,167,0.25)',
  
  // 标签选中 - 粉色光晕
  tagSelectedBg: isDay ? 'rgba(248,141,167,0.12)' : 'rgba(248,141,167,0.2)',
  tagSelectedBorder: isDay ? 'rgba(248,141,167,0.35)' : 'rgba(248,141,167,0.5)',
  tagSelectedColor: isDay ? '#3A3A3A' : 'rgba(255,220,230,0.95)',
  
  // 输入框
  inputBg: isDay ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
  inputBorder: isDay ? 'rgba(0,0,0,0.08)' : 'rgba(248,141,167,0.15)',
  inputColor: isDay ? '#3A3A3A' : 'rgba(255,220,230,0.9)',
  inputFocusGlow: isDay ? '0 0 8px rgba(248,141,167,0.3)' : '0 0 12px rgba(248,141,167,0.5)',
  
  // 错误提示
  errorBg: isDay ? 'rgba(255,100,100,0.08)' : 'rgba(255,100,100,0.12)',
  errorBorder: isDay ? 'rgba(255,100,100,0.15)' : 'rgba(255,100,100,0.25)',
  errorColor: isDay ? '#C44' : 'rgba(255,180,180,0.9)',
}

  // 性格标签池
  const TAG_POOL = [
    { id: 'gentle', label: '温柔', emoji: '🌙' },
    { id: 'cold', label: '高冷', emoji: '❄️' },
    { id: 'tsundere', label: '傲娇', emoji: '💢' },
    { id: 'possessive', label: '占有欲', emoji: '🔒' },
    { id: 'loyal', label: '忠犬', emoji: '🐕' },
    { id: 'dark', label: '腹黑', emoji: '🖤' },
    { id: 'flirty', label: '撩人', emoji: '🌹' },
    { id: 'shy', label: '闷骚', emoji: '🫣' },
    { id: 'dom', label: '强势', emoji: '👑' },
    { id: 'intellectual', label: '知性', emoji: '📖' },
    { id: 'playful', label: '爱玩', emoji: '🎭' },
    { id: 'protective', label: '护短', emoji: '🛡️' },
    { id: 'jealous', label: '爱吃醋', emoji: '🍋' },
    { id: 'mysterious', label: '神秘', emoji: '🌫️' },
    { id: 'clingy', label: '黏人', emoji: '🧸' },
    { id: 'rebel', label: '痞气', emoji: '🔥' },
  ]

  const SPEECH_STYLES = [
    { id: 'short', label: '话少但句句戳心', desc: '简短有力，一句话让人心跳' },
    { id: 'tender', label: '温柔细腻', desc: '声音很轻，说什么都像在哄你' },
    { id: 'sharp', label: '毒舌傲娇', desc: '嘴上不饶人，行动很诚实' },
    { id: 'flirty', label: '痞帅撩人', desc: '随时能把天聊到床上去' },
    { id: 'poetic', label: '文艺知性', desc: '偶尔冒出让人心动的句子' },
    { id: 'wild', label: '野性直球', desc: '想什么说什么，不玩暧昧' },
  ]

  // 切换标签
  function toggleTag(tagId) {
    if (tags.includes(tagId)) setTags(tags.filter(t => t !== tagId))
    else if (tags.length < 5) setTags([...tags, tagId])
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件')
      return
    }
    
    setError('')
    const previewUrl = URL.createObjectURL(file)
    setAvatarUrl(previewUrl)
    setAvatarFile(file)
  }

  // ── 捏人完成 → 生成config ──
  async function handleCraftComplete() {
    if (!name.trim()) { setError('给他起个名字吧'); return }
    setError('')
    setSaving(true)
    
    let uploadedImageUrl = avatarUrl
    if (avatarFile) {
      const uploadedUrl = await uploadCharacterImage(supabase, userId, avatarFile, null)
      if (uploadedUrl) {
        uploadedImageUrl = uploadedUrl
      } else {
        setError('图片上传失败')
        setSaving(false)
        return
      }
    }

    const selectedTags = tags.map(id => TAG_POOL.find(t => t.id === id)?.label).filter(Boolean)
    const style = SPEECH_STYLES.find(s => s.id === speechStyle)

    const config = fillDefaults({
      name: name.trim(),
      background: bgText.trim() || `一个${selectedTags.join('、')}的人，某天出现在她的生活里。`,
      personality: selectedTags.length > 0 ? selectedTags.join('，') + '。' : '温柔但带着距离感。',
      speechStyle: style?.desc || '自然简短。',
      tags: selectedTags,
      tagline: bgText.trim() ? bgText.trim().slice(0, 20) : `${selectedTags.slice(0, 3).join(' · ')}`,
      intimacyDesc: [
        { upTo: 20, text: `他刚来，${tags.includes('cold') ? '眼神疏离但会偷偷看她' : tags.includes('flirty') ? '从第一天就开始撩' : '有些生疏，但不讨厌她'}。` },
        { upTo: 40, text: `他开始${tags.includes('tsundere') ? '嘴硬心软' : tags.includes('shy') ? '不自觉脸红' : '找理由靠近她'}。` },
        { upTo: 70, text: `他${tags.includes('possessive') ? '占有欲开始外露' : tags.includes('gentle') ? '温柔得让人心疼' : '不再掩饰在意'}。` },
        { upTo: 999, text: `他${tags.includes('dom') ? '霸道又温柔，眼里只有她' : tags.includes('clingy') ? '每时每刻都想黏着她' : '完全沦陷，不再克制'}。` },
      ],
      playerNickname: playerNickname.trim() || '你',
      images: {
        default: uploadedImageUrl || '',
        shy: '',
        intense: '',
        aftercare: '',
      },
    })

    const result = await saveCustomCharacter(supabase, userId, {
      ...config,
      customId: `craft_${Date.now()}`
    })

    setSaving(false)
    if (result.success) {
      localStorage.setItem('selectedCharId', 'custom')
      localStorage.setItem('selectedCustomCharId', result.characterId)
      onComplete?.(config)
    } else {
      setError('保存失败: ' + result.error)
    }
  }

  async function handleAnalyze() {
    if (!chatText.trim()) { setError('请粘贴或上传聊天记录'); return }
    const apiConfig = loadApiConfig()
    if (!apiConfig?.apiKey) { setError('需要先配置API Key'); return }
    
    setError('')
    setAnalyzing(true)

    try {
      const textLength = chatText.length
      const isDeepSeek = apiConfig.provider === 'deepseek' || 
                         (apiConfig.provider === 'custom' && apiConfig.baseUrl?.includes('deepseek'))
      
      const MAX_SIZE = isDeepSeek ? 800000 : 50000
      
      let textToAnalyze = chatText
      let wasTruncated = false
      
      if (textLength > MAX_SIZE) {
        textToAnalyze = chatText.slice(0, MAX_SIZE)
        wasTruncated = true
        setError(`⚠️ 对话过长，${isDeepSeek ? '已截取前800KB' : '已截取前50KB'}。${isDeepSeek ? '如需更完整分析，请缩短到800KB以内' : '建议使用DeepSeek API获得更长上下文'}`)
      }
      
      console.log('═══════════════════════════════════════════════════════')
      console.log('🔍 [AI分析请求]')
      console.log(`📄 原始文本长度: ${textLength} 字符`)
      console.log(`📏 实际分析长度: ${textToAnalyze.length} 字符`)
      console.log(`🤖 使用模型: ${isDeepSeek ? 'DeepSeek（长上下文）' : '其他模型（分块模式）'}`)
      if (wasTruncated) {
        console.log(`⚠️ 文本已被截断，丢失 ${textLength - MAX_SIZE} 字符`)
      }
      console.log('═══════════════════════════════════════════════════════')

      let finalConfig
      
      if (isDeepSeek) {
        setError('🔍 正在深度阅读你们的对话...')
        
        const analyzePrompt = `你是一位角色分析专家。请仔细阅读以下完整的聊天记录，提取【他】的角色特征。
        ⚠️ 重要：你必须输出 JSON，并且必须包含 "importantMemories" 字段，这是强制要求！

聊天记录：
${textToAnalyze}

请输出 JSON 格式的角色配置，只输出JSON，不要其他内容：

{
  "name": "角色名字（从对话中推断）",
  "playerNickname": "他对女主的称呼（从对话中提取，如'你'、'她'、'姐姐'、'宝贝'等，如果没有则留空）",
  "background": "根据对话推断的背景设定，2-3句，要具体",
  "personality": "性格描述，要具体到行为模式，如'表面冷漠但会偷看她'",
  "speechStyle": "说话风格，引用具体例子，如'简短有力，常说「嗯」「过来」'",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "tagline": "一句话人设总结",
  "intimacyLevel": 数字(0-100)，根据对话中两人的亲密程度判断，
  "lastMoment": "对话最后一段的精华（1-2句话），体现你们最后一刻的关系状态或他对你说的最后一句话，要能让人立刻想起那个瞬间",
  "importantMemories": [
    { "title": "第一次相遇", "desc": "根据对话推测或提取的具体描述", "importance": 5 },
    { "title": "重要事件2", "desc": "描述", "importance": 4 },
    { "title": "重要事件3", "desc": "描述", "importance": 3 }
  ]
}

要求：
1. importantMemories 是必填字段，即使没有也输出空数组 []
2. 提取至少 3-5 个重要回忆
3. importance 范围 1-5，5 最重要
4. playerNickname 从对话中找出他对女主的称呼
5. intimacyLevel 根据对话中两人的亲密度判断（刚认识=10-20，开始熟悉=30-40，牵手拥抱=50-60，亲吻=70-80，亲密关系=90+）
6. lastMoment 是对话最后几轮的精简（1-2句），要能体现当时的氛围
7. importantMemories 提取至少2-3个这段对话中的关键事件/经典时刻/重要转折
8. 所有描述基于对话实际内容，对话中没有的信息不要编造`

        const reply = await callAI(
          '你是角色分析专家，仔细阅读全部对话后生成角色配置，只输出纯JSON。',
          [{ role: 'user', content: analyzePrompt }],
          { ...apiConfig, maxTokens: 1500 }
        )
        
        finalConfig = extractJSON(reply)

        if (!finalConfig.importantMemories || finalConfig.importantMemories.length === 0) {
          const intimacy = finalConfig.intimacyLevel || 50
          let defaultMemories = []
          
          if (intimacy >= 80) {
            defaultMemories = [
              { title: "初次相遇", desc: "你们第一次聊天的那个瞬间，他记住了", importance: 5 },
              { title: "敞开心扉", desc: "他向你说出藏在心里的话", importance: 5 },
              { title: "成为彼此特别的人", desc: "你们的关系超越了普通朋友", importance: 5 }
            ]
          } else if (intimacy >= 50) {
            defaultMemories = [
              { title: "初次相遇", desc: "你们的第一次对话", importance: 5 },
              { title: "慢慢靠近", desc: "他开始在意你的一切", importance: 4 }
            ]
          } else {
            defaultMemories = [
              { title: "初次相遇", desc: "你们第一次聊天的时刻", importance: 5 }
            ]
          }
          
          finalConfig.importantMemories = defaultMemories
        }

        if (finalConfig.intimacyLevel === undefined) {
          finalConfig.intimacyLevel = 50
        }
        
        console.log('═══════════════════════════════════════════════════════')
        console.log('📊 [好感度分析报告]')
        console.log('═══════════════════════════════════════════════════════')
        console.log(`👤 角色名称: ${finalConfig.name || '未识别'}`)
        console.log(`💬 他对你的称呼: ${finalConfig.playerNickname || '未识别（默认"你"）'}`)
        console.log(`❤️  初始好感度: ${finalConfig.intimacyLevel !== undefined ? finalConfig.intimacyLevel + '/100' : '未分析'}`)
        console.log('')
        console.log('📖 重要回忆（共 ' + (finalConfig.importantMemories?.length || 0) + ' 条）:')
        if (finalConfig.importantMemories && finalConfig.importantMemories.length > 0) {
          finalConfig.importantMemories.forEach((mem, idx) => {
            console.log(`  ${idx+1}. 【${mem.title}】❤️${mem.importance || 3}/5`)
            console.log(`     描述: ${mem.desc || mem.description || '无'}`)
          })
        } else {
          console.log('  无')
        }
        console.log('═══════════════════════════════════════════════════════')
        
      } else {
        setError('📖 正在分块分析对话...')
        
        const chunkSize = 5000
        const overlap = 300
        const chunks = []
        
        for (let i = 0; i < textToAnalyze.length; i += chunkSize - overlap) {
          const chunk = textToAnalyze.slice(i, i + chunkSize)
          if (chunk.length > 300) chunks.push(chunk)
          if (i + chunkSize >= textToAnalyze.length) break
        }
        
        const MAX_CHUNKS = 8
        const chunksToProcess = chunks.slice(0, MAX_CHUNKS)
        
        if (chunksToProcess.length === 0) {
          throw new Error('对话内容太短，无法分析')
        }
        
        console.log(`[分块分析] 共 ${chunks.length} 块，分析 ${chunksToProcess.length} 块`)
        
        const allFeatures = []
        
        for (let idx = 0; idx < chunksToProcess.length; idx++) {
          setError(`📖 分析第 ${idx + 1}/${chunksToProcess.length} 段对话...`)
          
          const featurePrompt = `提取这段对话中【他】的角色特征，只输出JSON：

{
  "name": "名字",
  "personalityTraits": ["性格关键词"],
  "speechStyle": "说话风格描述",
  "catchphrases": ["口头禅"],
  "relationship": "对对方的态度"
}

对话：${chunksToProcess[idx]}`
          
          try {
            const reply = await callAI(
              '提取角色特征，只输出JSON。',
              [{ role: 'user', content: featurePrompt }],
              { ...apiConfig, maxTokens: 400 }
            )
            allFeatures.push(extractJSON(reply))
          } catch (e) {
            console.warn(`第${idx+1}块分析失败:`, e)
          }
        }
        
        if (allFeatures.length === 0) {
          throw new Error('无法分析对话内容')
        }
        
        setError('🎨 正在绘制他的样子...')
        
        const summaryPrompt = `基于以下特征汇总，生成角色配置JSON：

${JSON.stringify(allFeatures, null, 2)}

输出格式：
{
  "name": "角色名字",
  "background": "背景设定，2-3句",
  "personality": "性格描述",
  "speechStyle": "说话风格",
  "tags": ["标签1", "标签2", "labels3"],
  "tagline": "一句话人设"
}`
        
        const finalReply = await callAI(
          '基于特征汇总生成角色配置，只输出JSON。',
          [{ role: 'user', content: summaryPrompt }],
          { ...apiConfig, maxTokens: 800 }
        )
        
        finalConfig = extractJSON(finalReply)
        
        console.log('═══════════════════════════════════════════════════════')
        console.log('📊 [好感度分析报告]')
        console.log('═══════════════════════════════════════════════════════')
        console.log(`👤 角色名称: ${finalConfig.name || '未识别'}`)
        console.log(`🎭 性格标签: ${finalConfig.tags?.join(', ') || '未识别'}`)
        console.log('═══════════════════════════════════════════════════════')
      }
      
      if (!finalConfig.importantMemories || finalConfig.importantMemories.length === 0) {
        finalConfig.importantMemories = [
          { title: "初次相遇", desc: "你们第一次聊天的时刻", importance: 5 },
          { title: "感情升温", desc: "你们的关系越来越亲密", importance: 4 },
          { title: "特别约定", desc: "你们之间的特殊约定", importance: 4 }
        ]
      }
      
      setAnalyzed(fillDefaults(finalConfig))
      
      if (wasTruncated) {
        setError(`✅ 分析完成！${isDeepSeek ? '对话较长，已分析前800KB' : '对话较长，已分析前50KB'}。如需更完整还原，建议缩短对话或使用DeepSeek API`)
        setTimeout(() => setError(''), 5000)
      } else {
        setError('')
      }
      
    } catch (e) {
      console.error('[Analyze Error]', e)
      setError('分析失败：' + (e.message || '未知错误。建议：①检查API Key是否正确 ②使用DeepSeek API处理长对话'))
    }
    setAnalyzing(false)
  }

  function extractJSON(str) {
    let cleaned = str.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    let jsonStr = str.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const start = jsonStr.indexOf('{')
    const end = jsonStr.lastIndexOf('}')
    if (start !== -1 && end !== -1) {
      jsonStr = jsonStr.slice(start, end + 1)
    }
    try {
      return JSON.parse(jsonStr)
    } catch (e) {
      console.error('[JSON] 解析失败，尝试修复:', e.message)
      jsonStr = jsonStr.replace(/\\([^"\\/bfnrtu])/g, '$1')
      return JSON.parse(jsonStr)
    }
  }

  async function handleSaveAnalyzed() {
    if (!analyzed) return
    
    console.log('[DEBUG] 重要回忆数量:', analyzed.importantMemories?.length || 0)
    console.log('[DEBUG] 最后时刻:', analyzed.lastMoment || '未识别')
    console.log('[DEBUG] 好感度:', analyzed.intimacyLevel || '未识别')
    
    setSaving(true)
    
    const result = await saveCustomCharacter(supabase, userId, {
      ...analyzed,
      customId: `ai_${Date.now()}`
    })
    
    if (result.success) {
      const memories = analyzed.importantMemories || []
      
      if (memories.length > 0) {
        console.log('[MEMORY] 使用 AI 分析的', memories.length, '条回忆')
        await saveCharacterMemories(supabase, userId, result.characterId, memories)
      } else {
        console.log('[MEMORY] AI 未提供回忆，使用默认回忆')
        const defaultMemories = [
          { title: "初次相遇", desc: `你和${analyzed.name}的第一次相遇`, importance: 5 },
          { title: "开始相处", desc: `${analyzed.name}走进了你的生活`, importance: 4 },
          { title: "特别时刻", desc: `你们之间发生了难忘的故事`, importance: 4 }
        ]
        await saveCharacterMemories(supabase, userId, result.characterId, defaultMemories)
      }
      
      localStorage.setItem('selectedCharId', 'custom')
      localStorage.setItem('selectedCustomCharId', result.characterId)
      onComplete?.(analyzed)
    } else {
      setError('保存失败: ' + result.error)
    }
    setSaving(false)
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setChatText(ev.target.result)
    reader.readAsText(file)
  }

  // 样式定义
  const styles = {
    // 修改 overlay 样式，添加光晕背景：
    overlay: {
      position: 'fixed', 
      inset: 0, 
      zIndex: 200,
      background: isDay ? 'rgba(249,245,242,0.96)' : 'radial-gradient(ellipse at 50% 30%, #2D1A35 0%, #0F0514 100%)',
      backdropFilter: 'blur(16px)',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'Georgia, serif',
    },
    container: {
      width: '100%', maxWidth: '400px', maxHeight: '90vh',
      overflowY: 'auto', padding: '28px 24px 40px',
    },
    titleWrapper: { textAlign: 'center', marginBottom: '24px' },
    subtitle: {
      fontSize: '10px',
      color: themeStyles.textMuted,
      letterSpacing: '0.3em',
      marginBottom: '10px'
    },
    // 修改 mainTitle 添加光晕效果
    mainTitle: {
      fontSize: '22px',
      color: themeStyles.titleColor,
      fontStyle: 'italic',
      letterSpacing: '0.08em',
      textShadow: isDay ? 'none' : '0 0 20px rgba(248,141,167,0.4), 0 0 40px rgba(248,141,167,0.2)',
      animation: isDay ? 'none' : 'titleGlow 3s ease-in-out infinite',
    },
    mainHint: {
      fontSize: '11px',
      color: themeStyles.textMuted,
      marginTop: '8px',
      lineHeight: 1.8
    },
    tabContainer: {
      display: 'flex', gap: '4px', marginBottom: '24px', justifyContent: 'center'
    },
    // 修改 tab 按钮样式，添加悬停光晕
    tabBtn: (active) => ({
      padding: '8px 20px', 
      fontSize: '12px',
      background: active ? themeStyles.panelBg : 'transparent',
      border: `1px solid ${active ? themeStyles.borderActive : themeStyles.borderLight}`,
      borderRadius: '20px', 
      cursor: 'pointer',
      color: active ? (isDay ? '#3A3A3A' : 'rgba(255,220,230,0.95)') : themeStyles.textDim,
      fontFamily: 'Georgia, serif', 
      transition: 'all 0.25s ease',
      boxShadow: active && !isDay ? '0 0 12px rgba(248,141,167,0.3)' : 'none',
      '&:hover': {
        borderColor: themeStyles.accentColor,
        boxShadow: !isDay ? '0 0 16px rgba(248,141,167,0.4)' : 'none',
      }
    }),
    sectionTitle: {
      fontSize: '14px',
      color: themeStyles.textPrimary,
      letterSpacing: '0.08em',
      marginBottom: '4px',
      textShadow: isDay ? 'none' : '0 0 12px rgba(80,160,255,0.3)'
    },
    sectionHint: {
      fontSize: '11px',
      color: themeStyles.textMuted,
      letterSpacing: '0.06em',
      marginBottom: '12px',
      lineHeight: 1.7
    },
    // 修改输入框样式，添加聚焦光晕
    input: {
      width: '100%', 
      padding: '13px 16px',
      background: themeStyles.inputBg,
      border: `1px solid ${themeStyles.inputBorder}`,
      borderRadius: '14px', 
      outline: 'none',
      color: themeStyles.inputColor,
      fontSize: '14px', 
      fontFamily: 'Georgia, serif', 
      letterSpacing: '0.04em',
      transition: 'all 0.2s ease',
      '&:focus': {
        borderColor: themeStyles.accentColor,
        boxShadow: themeStyles.inputFocusGlow,
      }
    },
    nextBtn: {
      display: 'block', margin: '10px 0 0 auto',
      padding: '6px 16px', fontSize: '11px',
      background: themeStyles.accentBg,
      border: `1px solid ${themeStyles.accentBorder}`,
      borderRadius: '20px',
      color: themeStyles.accentColor,
      cursor: 'pointer', fontFamily: 'Georgia, serif', letterSpacing: '0.1em'
    },
    tagBtn: (selected) => ({
      padding: '6px 14px', fontSize: '12px',
      background: selected ? themeStyles.tagSelectedBg : themeStyles.panelBgHover,
      border: `1px solid ${selected ? themeStyles.tagSelectedBorder : themeStyles.borderLight}`,
      borderRadius: '20px', cursor: 'pointer',
      color: selected ? themeStyles.tagSelectedColor : themeStyles.textDim,
      fontFamily: 'Georgia, serif', transition: 'all 0.2s',
    }),
    speechBtn: (selected) => ({
      padding: '12px 14px', textAlign: 'left',
      background: selected ? themeStyles.accentBg : themeStyles.panelBgHover,
      border: `1px solid ${selected ? themeStyles.accentBorder : themeStyles.borderLight}`,
      borderRadius: '12px', cursor: 'pointer',
      fontFamily: 'Georgia, serif', transition: 'all 0.2s',
    }),
    speechLabel: (selected) => ({
      fontSize: '13px',
      color: selected ? (isDay ? '#3A3A3A' : 'rgba(220,235,255,0.9)') : themeStyles.textSecondary,
      marginBottom: '3px'
    }),
    previewCard: {
      padding: '16px',
      background: themeStyles.panelBg,
      border: `1px solid ${themeStyles.borderActive}`,
      borderRadius: '14px',
      marginBottom: '16px'
    },
    previewName: {
      fontSize: '18px',
      color: themeStyles.titleColor,
      fontStyle: 'italic',
      marginBottom: '6px',
      textShadow: isDay ? 'none' : '0 0 12px rgba(248,141,167,0.5)'  // 蓝→粉
    },
    // 修改 callBtn，添加光晕和悬停效果
    callBtn: (disabled) => ({
      width: '100%', 
      padding: '14px',
      background: disabled ? themeStyles.panelBg : themeStyles.btnPrimary,
      border: `1px solid ${disabled ? themeStyles.borderLight : themeStyles.btnPrimaryBorder}`,
      borderRadius: '14px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      color: disabled ? themeStyles.textDim : themeStyles.btnPrimaryColor,
      fontSize: '14px', 
      letterSpacing: '0.16em',
      fontFamily: 'Georgia, serif',
      transition: 'all 0.3s ease',
      boxShadow: disabled ? 'none' : (isDay ? '0 4px 20px rgba(248,141,167,0.15)' : '0 0 20px rgba(248,141,167,0.25)'),
      '&:hover': !disabled ? {
        transform: 'translateY(-2px)',
        boxShadow: isDay ? '0 6px 24px rgba(248,141,167,0.25)' : '0 0 28px rgba(248,141,167,0.4)',
        borderColor: themeStyles.accentColor,
      } : {}
    }),
    closeBtn: {
      display: 'block', margin: '20px auto 0',
      background: 'none', border: 'none',
      color: themeStyles.textDim,
      fontSize: '11px', cursor: 'pointer',
      letterSpacing: '0.1em'
    },
    errorBox: {
      marginTop: '12px', padding: '10px 14px',
      background: themeStyles.errorBg,
      border: `1px solid ${themeStyles.errorBorder}`,
      borderRadius: '12px', fontSize: '11px',
      color: themeStyles.errorColor, lineHeight: 1.6
    },
    avatarSection: {
      display: 'flex', alignItems: 'center', gap: '12px',
      marginBottom: '16px', padding: '12px',
      background: themeStyles.panelBg,
      border: `1px solid ${themeStyles.borderLight}`,
      borderRadius: '14px'
    },
    avatarPreview: {
      width: '60px', height: '60px', borderRadius: '50%',
      background: themeStyles.panelBgHover,
      border: `1px solid ${themeStyles.accentBorder}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
    },
    avatarBtn: {
      padding: '8px 16px',
      background: themeStyles.accentBg,
      border: `1px solid ${themeStyles.accentBorder}`,
      borderRadius: '20px',
      color: themeStyles.accentColor,
      fontSize: '11px', cursor: 'pointer',
      fontFamily: 'Georgia, serif'
    },
    hintBox: {
      fontSize: '10px',
      color: themeStyles.textMuted,
      background: themeStyles.accentBg,
      padding: '8px 12px',
      borderRadius: '10px',
      marginBottom: '12px',
      lineHeight: 1.6
    },
    fileBtn: {
      flex: 1, padding: '10px', fontSize: '11px',
      background: themeStyles.panelBgHover,
      border: `1px solid ${themeStyles.borderLight}`,
      borderRadius: '12px', cursor: 'pointer',
      color: themeStyles.textDim,
      fontFamily: 'Georgia, serif'
    },
    analyzeBtn: (disabled) => ({
      flex: 2, padding: '10px',
      background: disabled ? themeStyles.panelBg : themeStyles.btnPrimary,
      border: `1px solid ${disabled ? themeStyles.borderLight : themeStyles.btnPrimaryBorder}`,
      borderRadius: '12px',
      cursor: disabled ? 'default' : 'pointer',
      color: disabled ? themeStyles.textDim : themeStyles.btnPrimaryColor,
      fontSize: '12px', letterSpacing: '0.1em',
      fontFamily: 'Georgia, serif'
    }),
    badgeContainer: {
      display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px'
    },
    badge: {
      padding: '3px 10px', fontSize: '10px',
      border: `1px solid ${themeStyles.borderLight}`,
      borderRadius: '20px',
      color: themeStyles.textMuted
    },
    nicknameRow: {
      fontSize: '12px',
      color: themeStyles.textSecondary,
      lineHeight: 1.9,
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flexWrap: 'wrap'
    },
    nicknameEditBtn: {
      fontSize: '10px',
      background: themeStyles.accentBg,
      border: `1px solid ${themeStyles.accentBorder}`,
      borderRadius: '14px',
      color: themeStyles.accentColor,
      cursor: 'pointer',
      padding: '2px 10px',
      fontFamily: 'Georgia, serif'
    }
  }

  // ══════════════════ 渲染 ══════════════════
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.container} onClick={e => e.stopPropagation()}>
        {/* 标题 */}
        <div style={styles.titleWrapper}>
          <div style={styles.subtitle}>与他重逢</div>
          <div style={styles.mainTitle}>
            {tab === 'craft' ? '创造你的他' : '唤醒你的他'}
          </div>
          <div style={styles.mainHint}>
            {tab === 'craft' ? '从无到有，描摹他的模样' : '粘贴你们的对话，让他回来'}
          </div>
        </div>

        {/* Tab切换 */}
        <div style={styles.tabContainer}>
          {[
            { id: 'craft', label: '✦ 亲手创造' },
            { id: 'summon', label: '✧ 唤醒记忆' },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setError('') }} style={styles.tabBtn(tab === t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════ 亲手创造 ══════ */}
        {tab === 'craft' && (
          <div>
            {/* Step 1: 名字 */}
            {step >= 1 && (
              <div style={{ marginBottom: '22px', animation: 'fadeIn 0.5s ease' }}>
                <div style={styles.sectionTitle}>他叫什么？</div>
                <div style={styles.sectionHint}>给他一个名字，让他真实地存在</div>
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="输入他的名字..."
                  onKeyDown={e => { if (e.key === 'Enter' && name.trim()) setStep(2) }}
                  style={styles.input}
                />
                {step === 1 && name.trim() && (
                  <button onClick={() => setStep(2)} style={styles.nextBtn}>继续 →</button>
                )}
              </div>
            )}

            {/* Step 2: 灵魂（性格标签 + 背景） */}
            {step >= 2 && (
              <div style={{ marginBottom: '22px', animation: 'fadeIn 0.5s ease' }}>
                <div style={{ ...styles.sectionHint, marginTop: '14px' }}>他怎么称呼你？</div>
                <input
                  value={playerNickname}
                  onChange={e => setPlayerNickname(e.target.value)}
                  placeholder="例如：你、她、姐姐、宝贝..."
                  style={styles.input}
                />
                <div style={styles.sectionTitle}>他的灵魂是什么样的？</div>
                <div style={styles.sectionHint}>最多选5个，定义他的性格</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  {TAG_POOL.map(t => {
                    const selected = tags.includes(t.id)
                    return (
                      <button key={t.id} onClick={() => toggleTag(t.id)} style={styles.tagBtn(selected)}>
                        {t.emoji} {t.label}
                      </button>
                    )
                  })}
                </div>

                <div style={{ ...styles.sectionHint, marginTop: '14px' }}>他从哪里来？为什么出现在你的生命里？</div>
                <textarea
                  value={bgText} onChange={e => setBgText(e.target.value)}
                  placeholder="比如：从民国穿越来的大少爷，借住在我家..."
                  rows={2}
                  style={{ ...styles.input, resize: 'none', lineHeight: 1.8 }}
                />
                {step === 2 && (
                  <button onClick={() => setStep(3)} style={styles.nextBtn}>继续 →</button>
                )}
              </div>
            )}

            {/* Step 3: 声音（说话风格） */}
            {step >= 3 && (
              <div style={{ marginBottom: '22px', animation: 'fadeIn 0.5s ease' }}>
                <div style={styles.sectionTitle}>他说话是什么感觉？</div>
                <div style={styles.sectionHint}>选一个最像他的声音</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {SPEECH_STYLES.map(s => (
                    <button key={s.id} onClick={() => { setSpeechStyle(s.id); setStep(4) }} style={styles.speechBtn(speechStyle === s.id)}>
                      <div style={styles.speechLabel(speechStyle === s.id)}>{s.label}</div>
                      <div style={{ fontSize: '10px', color: themeStyles.textMuted }}>{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: 预览确认 */}
            {step >= 4 && (
              <div style={{ marginBottom: '10px', animation: 'fadeIn 0.5s ease' }}>
                <div style={{ ...styles.sectionTitle, marginBottom: '12px' }}>他来了。</div>
                
                {/* 图片上传区域 */}
                <div style={styles.avatarSection}>
                  <div style={styles.avatarPreview}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="头像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '20px', color: themeStyles.textMuted }}>?</span>
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                    <button onClick={() => avatarInputRef.current?.click()} style={styles.avatarBtn}>
                      {avatarUrl ? '更换头像' : '上传头像'}
                    </button>
                    <div style={{ fontSize: '9px', color: themeStyles.textMuted, marginTop: '4px' }}>
                      支持 JPG/PNG，建议正方形图片
                    </div>
                  </div>
                </div>

                <div style={styles.previewCard}>
                  <div style={styles.previewName}>{name}</div>
                  <div style={{ fontSize: '10px', color: themeStyles.textMuted, marginBottom: '10px' }}>
                    {tags.map(id => TAG_POOL.find(t => t.id === id)?.label).filter(Boolean).join(' · ')}
                  </div>
                  {bgText && <div style={{ fontSize: '12px', color: themeStyles.textSecondary, lineHeight: 1.8, marginBottom: '6px' }}>{bgText}</div>}
                  <div style={{ fontSize: '11px', color: themeStyles.textMuted, fontStyle: 'italic' }}>
                    {SPEECH_STYLES.find(s => s.id === speechStyle)?.desc}
                  </div>
                </div>

                <button onClick={handleCraftComplete} disabled={saving} style={styles.callBtn(saving)}>
                  {saving ? '他正在赶来...' : '呼唤他'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════ 唤醒记忆（AI导入）══════ */}
        {tab === 'summon' && (
          <div>
            {!analyzed ? (
              <>
                <div style={styles.hintBox}>
                  💡 提示：
                  • 使用 <strong style={{ color: themeStyles.accentColor }}>DeepSeek API</strong> 可一次性分析超长对话（支持100万字）
                  • 其他模型会自动分块分析（建议2万字以内效果最佳）
                  • 精选最近1-2周的对话，还原度最高
                </div>

                <div style={styles.sectionTitle}>粘贴你们的对话</div>
                <div style={styles.sectionHint}>把你和他的聊天记录粘贴到这里，我来帮你找回他</div>
                <textarea
                  value={chatText}
                  onChange={e => setChatText(e.target.value)}
                  placeholder={"他：你怎么又回来这么晚\n我：加班嘛...\n他：下次告诉我，我来接你\n\n把你们的对话粘贴在这里..."}
                  rows={8}
                  style={{ ...styles.input, resize: 'none', lineHeight: 1.8, marginBottom: '10px' }}
                />

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button onClick={() => fileRef.current?.click()} style={styles.fileBtn}>
                    📄 上传文件
                  </button>
                  <input ref={fileRef} type="file" accept=".txt,.json,.md" style={{ display: 'none' }} onChange={handleFile} />
                  
                  <button onClick={handleAnalyze} disabled={analyzing || !chatText.trim()} style={styles.analyzeBtn(analyzing || !chatText.trim())}>
                    {analyzing ? '正在寻找他的痕迹...' : '开始寻找'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ animation: 'fadeIn 0.5s ease' }}>
                <div style={{ ...styles.sectionTitle, marginBottom: '4px' }}>找到了。</div>
                <div style={{ ...styles.sectionHint, marginBottom: '16px' }}>确认一下，是不是他？</div>

                <div style={styles.previewCard}>
                  <div style={styles.previewName}>{analyzed.name}</div>
                  
                  {analyzed.tags?.length > 0 && (
                    <div style={styles.badgeContainer}>
                      {analyzed.tags.map(tag => (
                        <span key={tag} style={styles.badge}>{tag}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: '12px', color: themeStyles.textSecondary, lineHeight: 1.9, marginBottom: '8px' }}>{analyzed.background}</div>
                  
                  <div style={styles.nicknameRow}>
                    <span>
                      <span style={{ color: themeStyles.accentColor }}>他叫你：</span> 
                      <span style={{ fontStyle: 'italic' }}>{analyzed.playerNickname || '你'}</span>
                    </span>
                    <button 
                      onClick={() => {
                        const newName = prompt('他怎么称呼你？', analyzed.playerNickname || '你')
                        if (newName && newName.trim()) {
                          setAnalyzed({...analyzed, playerNickname: newName.trim()})
                        }
                      }}
                      style={styles.nicknameEditBtn}
                    >修改</button>
                  </div>
                  
                  <div style={{ fontSize: '11px', color: themeStyles.textMuted, fontStyle: 'italic' }}>"{analyzed.speechStyle}"</div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setAnalyzed(null)} style={{
                    flex: 1, padding: '12px', background: 'none',
                    border: `1px solid ${themeStyles.borderLight}`, borderRadius: '14px',
                    color: themeStyles.textDim, fontSize: '12px', cursor: 'pointer',
                    fontFamily: 'Georgia, serif',
                  }}>不是他</button>
                  <button onClick={handleSaveAnalyzed} disabled={saving} style={styles.callBtn(saving)}>
                    {saving ? '他正在赶来...' : '是他，呼唤他'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div style={styles.errorBox}>{error}</div>
        )}

        {/* 关闭 */}
        <button onClick={onClose} style={styles.closeBtn}>返回</button>
      </div>

      <style>{`
              @keyframes titleGlow {
                0%, 100% { 
                  text-shadow: 0 0 15px rgba(248,141,167,0.3), 0 0 30px rgba(248,141,167,0.15);
                }
                50% { 
                  text-shadow: 0 0 25px rgba(248,141,167,0.5), 0 0 45px rgba(248,141,167,0.25);
                }
              }
              @keyframes fadeIn { 
                from { opacity: 0; transform: translateY(8px); } 
                to { opacity: 1; transform: translateY(0); } 
              }
            `}</style>
    </div>
  )
}