// ══════════════════════════════════════════════════════
//  创造你的他 — 角色导入/捏人面板
//  components/CharacterCreator.js
// ══════════════════════════════════════════════════════
import { useState, useRef } from 'react'
import { callAI, loadApiConfig } from '../lib/apiClient'
import { supabase } from '../lib/supabase'
import { fillDefaults, saveCustomCharacter, saveCharacterMemories , uploadCharacterImage} from '../lib/characterImport'

export default function CharacterCreator({ show, onClose, userId, onComplete }) {
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
  const [avatarFile, setAvatarFile] = useState(null)  // 新增：存文件对象
  const avatarInputRef = useRef(null)

  if (!show) return null

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
  
  // 先预览（用本地 URL，不上传）
  const previewUrl = URL.createObjectURL(file)
  setAvatarUrl(previewUrl)
  setAvatarFile(file)  // 需要新增这个 state
}

  // ── 捏人完成 → 生成config ──
  async function handleCraftComplete() {
    if (!name.trim()) { setError('给他起个名字吧'); return }
    setError('')
    setSaving(true)
      // 👇 新增：先上传图片到 Storage（如果有）
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
  // 👆 新增结束

    const selectedTags = tags.map(id => TAG_POOL.find(t => t.id === id)?.label).filter(Boolean)
    const style = SPEECH_STYLES.find(s => s.id === speechStyle)

    const config = fillDefaults({
      name: name.trim(),
      background: bgText.trim() || `一个${selectedTags.join('、')}的人，某天出现在她的生活里。`,
      personality: selectedTags.length > 0
        ? selectedTags.join('，') + '。'
        : '温柔但带着距离感。',
      speechStyle: style?.desc || '自然简短。',
      tags: selectedTags,
      tagline: bgText.trim() ? bgText.trim().slice(0, 20) : `${selectedTags.slice(0, 3).join(' · ')}`,
      intimacyDesc: [
        { upTo: 20, text: `他刚来，${tags.includes('cold') ? '眼神疏离但会偷偷看她' : tags.includes('flirty') ? '从第一天就开始撩' : '有些生疏，但不讨厌她'}。` },
        { upTo: 40, text: `他开始${tags.includes('tsundere') ? '嘴硬心软' : tags.includes('shy') ? '不自觉脸红' : '找理由靠近她'}。` },
        { upTo: 70, text: `他${tags.includes('possessive') ? '占有欲开始外露' : tags.includes('gentle') ? '温柔得让人心疼' : '不再掩饰在意'}。` },
        { upTo: 999, text: `他${tags.includes('dom') ? '霸道又温柔，眼里只有她' : tags.includes('clingy') ? '每时每刻都想黏着她' : '完全沦陷，不再克制'}。` },
        
      ],
      playerNickname: playerNickname.trim() || '你',  // 👈 加这行
      images: {                    // 👈 加上整个 images 对象
        default: uploadedImageUrl || '',  // 👈 改成用上传后的 URL
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
  localStorage.setItem('selectedCustomCharId', result.characterId)  // ← 加上这行
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
    
    // ✅ 日志放在所有变量定义之后
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
      // 👇 👇 👇 在这里添加回忆补全逻辑 👇 👇 👇
console.log('[DEBUG] AI返回的原始字段:', Object.keys(finalConfig))

// 如果 AI 没输出 importantMemories，根据好感度生成默认的
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
  console.log('[WARN] AI 未返回重要回忆，使用默认值（好感度:' + intimacy + '）')
} else {
  console.log('[OK] AI 返回了 ' + finalConfig.importantMemories.length + ' 条重要回忆')
}

// 确保好感度有值
if (finalConfig.intimacyLevel === undefined) {
  finalConfig.intimacyLevel = 50
  console.log('[WARN] AI 未返回好感度，使用默认值 50')
}
// 👆 👆 👆 补全逻辑结束 👆 👆 👆
      
      // ✅ 好感度分析报告
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
      console.log('')
      console.log('🎭 性格标签:', finalConfig.tags?.join(', ') || '未识别')
      console.log('📝 说话风格:', finalConfig.speechStyle || '未识别')
      console.log('🏷️  一句话人设:', finalConfig.tagline || '未识别')
      console.log('═══════════════════════════════════════════════════════')
      
    } else {
      // 其他模型的分块分析逻辑（保持不变）
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
  console.log('[FIX] 补全了默认回忆')
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

// 辅助函数：从AI回复中提取JSON
function extractJSON(str) {
    // 先尝试清理可能损坏的字符
  let cleaned = str.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ') // 替换控制字符
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
    // 二次尝试：移除不合法转义
    jsonStr = jsonStr.replace(/\\([^"\\/bfnrtu])/g, '$1')
    return JSON.parse(jsonStr)
  }
}

  // ── AI分析结果确认保存 ──
async function handleSaveAnalyzed() {
  if (!analyzed) return
  
  console.log('[DEBUG] 重要回忆数量:', analyzed.importantMemories?.length || 0)
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

  // ── 上传文件 ──
  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setChatText(ev.target.result)
    reader.readAsText(file)
  }

  // ══════════════════ 渲染 ══════════════════
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(2,1,12,0.92)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Georgia, serif',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '400px', maxHeight: '90vh',
        overflowY: 'auto', padding: '28px 24px 40px',
      }}>
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '10px', color: 'rgba(200,220,255,0.4)', letterSpacing: '0.3em', marginBottom: '10px' }}>
            与他重逢
          </div>
          <div style={{ fontSize: '22px', color: 'rgba(230,240,255,0.95)', fontStyle: 'italic', letterSpacing: '0.08em',
            textShadow: '0 0 20px rgba(80,160,255,0.4)' }}>
            {tab === 'craft' ? '创造你的他' : '唤醒你的他'}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(180,210,255,0.45)', marginTop: '8px', lineHeight: 1.8 }}>
            {tab === 'craft' ? '从无到有，描摹他的模样' : '粘贴你们的对话，让他回来'}
          </div>
        </div>

        {/* Tab切换 */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', justifyContent: 'center' }}>
          {[
            { id: 'craft', label: '✦ 亲手创造' },
            { id: 'summon', label: '✧ 唤醒记忆' },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setError('') }} style={{
              padding: '8px 20px', fontSize: '12px',
              background: tab === t.id ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: `1px solid ${tab === t.id ? 'rgba(140,190,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '20px', cursor: 'pointer',
              color: tab === t.id ? 'rgba(220,235,255,0.9)' : 'rgba(180,210,255,0.3)',
              fontFamily: 'Georgia, serif', transition: 'all 0.25s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ══════ 亲手创造 ══════ */}
        {tab === 'craft' && (
          <div>
            {/* Step 1: 名字 */}
            {step >= 1 && (
              <div style={{ marginBottom: '22px', animation: 'fadeIn 0.5s ease' }}>
                <div style={sectionTitle}>他叫什么？</div>
                <div style={sectionHint}>给他一个名字，让他真实地存在</div>
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="输入他的名字..."
                  onKeyDown={e => { if (e.key === 'Enter' && name.trim()) setStep(2) }}
                  style={inputStyle}
                />
                {step === 1 && name.trim() && (
                  <button onClick={() => setStep(2)} style={nextBtn}>继续 →</button>
                )}
              </div>
            )}

            {/* Step 2: 灵魂（性格标签 + 背景） */}
            {step >= 2 && (
              <div style={{ marginBottom: '22px', animation: 'fadeIn 0.5s ease' }}>
                 {/* 👇 新增：他怎么称呼你 */}
    <div style={{ ...sectionHint, marginTop: '14px' }}>他怎么称呼你？</div>
    <input
      value={playerNickname}
      onChange={e => setPlayerNickname(e.target.value)}
      placeholder="例如：你、她、姐姐、宝贝..."
      style={inputStyle}
    />
                <div style={sectionTitle}>他的灵魂是什么样的？</div>
                <div style={sectionHint}>最多选5个，定义他的性格</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  {TAG_POOL.map(t => {
                    const selected = tags.includes(t.id)
                    return (
                      <button key={t.id} onClick={() => toggleTag(t.id)} style={{
                        padding: '6px 14px', fontSize: '12px',
                        background: selected ? 'rgba(140,190,255,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${selected ? 'rgba(140,190,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '20px', cursor: 'pointer',
                        color: selected ? 'rgba(200,225,255,0.9)' : 'rgba(180,210,255,0.35)',
                        fontFamily: 'Georgia, serif', transition: 'all 0.2s',
                      }}>{t.emoji} {t.label}</button>
                    )
                  })}
                </div>

                <div style={{ ...sectionHint, marginTop: '14px' }}>他从哪里来？为什么出现在你的生命里？</div>
                <textarea
                  value={bgText} onChange={e => setBgText(e.target.value)}
                  placeholder="比如：从民国穿越来的大少爷，借住在我家..."
                  rows={2}
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.8 }}
                />
                {step === 2 && (
                  <button onClick={() => setStep(3)} style={nextBtn}>继续 →</button>
                )}
              </div>
            )}

            {/* Step 3: 声音（说话风格） */}
            {step >= 3 && (
              <div style={{ marginBottom: '22px', animation: 'fadeIn 0.5s ease' }}>
                <div style={sectionTitle}>他说话是什么感觉？</div>
                <div style={sectionHint}>选一个最像他的声音</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {SPEECH_STYLES.map(s => (
                    <button key={s.id} onClick={() => { setSpeechStyle(s.id); setStep(4) }} style={{
                      padding: '12px 14px', textAlign: 'left',
                      background: speechStyle === s.id ? 'rgba(140,190,255,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${speechStyle === s.id ? 'rgba(140,190,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: '12px', cursor: 'pointer',
                      fontFamily: 'Georgia, serif', transition: 'all 0.2s',
                    }}>
                      <div style={{ fontSize: '13px', color: speechStyle === s.id ? 'rgba(220,235,255,0.9)' : 'rgba(200,220,255,0.6)', marginBottom: '3px' }}>{s.label}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(180,210,255,0.3)' }}>{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

{/* Step 4: 预览确认 */}
{step >= 4 && (
  <div style={{ marginBottom: '10px', animation: 'fadeIn 0.5s ease' }}>
    <div style={{ ...sectionTitle, marginBottom: '12px' }}>他来了。</div>
    
    {/* 图片上传区域 */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px',
      padding: '12px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(140,190,255,0.1)',
      borderRadius: '14px',
    }}>
      {/* 头像预览 */}
      <div style={{
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(201,169,110,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="头像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: '20px', color: 'rgba(201,169,110,0.3)' }}>?</span>
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
        <button onClick={() => avatarInputRef.current?.click()} style={{
          padding: '8px 16px',
          background: 'rgba(140,190,255,0.08)',
          border: '1px solid rgba(140,190,255,0.2)',
          borderRadius: '20px',
          color: 'rgba(200,225,255,0.8)',
          fontSize: '11px',
          cursor: 'pointer',
          fontFamily: 'Georgia, serif',
        }}>
          {avatarUrl ? '更换头像' : '上传头像'}
        </button>
        <div style={{ fontSize: '9px', color: 'rgba(201,169,110,0.3)', marginTop: '4px' }}>
          支持 JPG/PNG，建议正方形图片
        </div>
      </div>
    </div>

    <div style={{
      padding: '16px', background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(140,190,255,0.12)', borderRadius: '14px',
      marginBottom: '16px',
    }}>
      <div style={{ fontSize: '18px', color: 'rgba(220,235,255,0.95)', fontStyle: 'italic', marginBottom: '6px',
        textShadow: '0 0 12px rgba(80,160,255,0.4)' }}>{name}</div>
      <div style={{ fontSize: '10px', color: 'rgba(180,210,255,0.4)', marginBottom: '10px' }}>
        {tags.map(id => TAG_POOL.find(t => t.id === id)?.label).filter(Boolean).join(' · ')}
      </div>
      {bgText && <div style={{ fontSize: '12px', color: 'rgba(200,220,255,0.5)', lineHeight: 1.8, marginBottom: '6px' }}>{bgText}</div>}
      <div style={{ fontSize: '11px', color: 'rgba(180,210,255,0.35)', fontStyle: 'italic' }}>
        {SPEECH_STYLES.find(s => s.id === speechStyle)?.desc}
      </div>
    </div>

    <button onClick={handleCraftComplete} disabled={saving} style={{
      width: '100%', padding: '14px',
      background: saving ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, rgba(80,140,255,0.3), rgba(120,80,255,0.25))',
      border: '1px solid rgba(140,180,255,0.3)', borderRadius: '14px',
      cursor: saving ? 'not-allowed' : 'pointer',
      color: saving ? 'rgba(180,210,255,0.4)' : 'rgba(230,240,255,0.95)',
      fontSize: '14px', letterSpacing: '0.16em', fontFamily: 'Georgia, serif',
      boxShadow: saving ? 'none' : '0 4px 24px rgba(80,120,255,0.2)',
      textShadow: saving ? 'none' : '0 0 12px rgba(100,180,255,0.5)',
    }}>
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
        {/* 提示框 */}
        <div style={{
          fontSize: '10px',
          color: 'rgba(201,169,110,0.4)',
          background: 'rgba(201,169,110,0.05)',
          padding: '8px 12px',
          borderRadius: '10px',
          marginBottom: '12px',
          lineHeight: 1.6
        }}>
          💡 提示：
          • 使用 <strong style={{color:'#c9a96e'}}>DeepSeek API</strong> 可一次性分析超长对话（支持100万字）
          • 其他模型会自动分块分析（建议2万字以内效果最佳）
          • 精选最近1-2周的对话，还原度最高
        </div>

        <div style={sectionTitle}>粘贴你们的对话</div>
        <div style={sectionHint}>把你和他的聊天记录粘贴到这里，我来帮你找回他</div>
        <textarea
          value={chatText}
          onChange={e => setChatText(e.target.value)}
          placeholder={"他：你怎么又回来这么晚\n我：加班嘛...\n他：下次告诉我，我来接你\n\n把你们的对话粘贴在这里..."}
          rows={8}
          style={{ ...inputStyle, resize: 'none', lineHeight: 1.8, marginBottom: '10px' }}
        />

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button onClick={() => fileRef.current?.click()} style={{
            flex: 1, padding: '10px', fontSize: '11px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', cursor: 'pointer',
            color: 'rgba(180,210,255,0.4)', fontFamily: 'Georgia, serif',
          }}>📄 上传文件</button>
          <input ref={fileRef} type="file" accept=".txt,.json,.md" style={{ display: 'none' }} onChange={handleFile} />
          
          <button onClick={handleAnalyze} disabled={analyzing || !chatText.trim()} style={{
            flex: 2, padding: '10px',
            background: analyzing ? 'rgba(255,255,255,0.05)' : chatText.trim() ? 'linear-gradient(135deg, rgba(80,140,255,0.3), rgba(120,80,255,0.25))' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${chatText.trim() ? 'rgba(140,180,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: '12px', cursor: chatText.trim() ? 'pointer' : 'default',
            color: chatText.trim() ? 'rgba(230,240,255,0.9)' : 'rgba(180,210,255,0.2)',
            fontSize: '12px', letterSpacing: '0.1em', fontFamily: 'Georgia, serif',
          }}>
            {analyzing ? '正在寻找他的痕迹...' : '开始寻找'}
          </button>
        </div>
      </>
    ) : (
      /* 分析结果预览 */
      <div style={{ animation: 'fadeIn 0.5s ease' }}>
        <div style={{ ...sectionTitle, marginBottom: '4px' }}>找到了。</div>
        <div style={{ ...sectionHint, marginBottom: '16px' }}>确认一下，是不是他？</div>

        <div style={{
          padding: '16px', background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(140,190,255,0.12)', borderRadius: '14px',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: '18px', color: 'rgba(220,235,255,0.95)', fontStyle: 'italic', marginBottom: '8px',
            textShadow: '0 0 12px rgba(80,160,255,0.4)' }}>{analyzed.name}</div>
          
          {analyzed.tags?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
              {analyzed.tags.map(tag => (
                <span key={tag} style={{
                  padding: '3px 10px', fontSize: '10px',
                  border: '1px solid rgba(140,190,255,0.15)',
                  borderRadius: '20px', color: 'rgba(180,210,255,0.5)',
                }}>{tag}</span>
              ))}
            </div>
          )}

          <div style={{ fontSize: '12px', color: 'rgba(200,220,255,0.5)', lineHeight: 1.9, marginBottom: '8px' }}>{analyzed.background}</div>
          {/* 👇 新增：称呼显示 + 修改按钮 */}
<div style={{ 
  fontSize: '12px', 
  color: 'rgba(200,220,255,0.6)', 
  lineHeight: 1.9, 
  marginBottom: '8px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap'
}}>
  <span>
    <span style={{ color: '#c9a96e' }}>他叫你：</span> 
    <span style={{ fontStyle: 'italic' }}>{analyzed.playerNickname || '你'}</span>
  </span>
  <button 
    onClick={() => {
      const newName = prompt('他怎么称呼你？', analyzed.playerNickname || '你')
      if (newName && newName.trim()) {
        setAnalyzed({...analyzed, playerNickname: newName.trim()})
      }
    }}
    style={{
      fontSize: '10px',
      background: 'rgba(201,169,110,0.1)',
      border: '1px solid rgba(201,169,110,0.2)',
      borderRadius: '14px',
      color: 'rgba(201,169,110,0.6)',
      cursor: 'pointer',
      padding: '2px 10px',
      fontFamily: 'Georgia, serif',
    }}
  >修改</button>
</div>
{/* 👆 新增结束 */}
          <div style={{ fontSize: '11px', color: 'rgba(180,210,255,0.35)', fontStyle: 'italic' }}>"{analyzed.speechStyle}"</div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setAnalyzed(null)} style={{
            flex: 1, padding: '12px', background: 'none',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px',
            color: 'rgba(255,255,255,0.25)', fontSize: '12px', cursor: 'pointer',
            fontFamily: 'Georgia, serif',
          }}>不是他</button>
          <button onClick={handleSaveAnalyzed} disabled={saving} style={{
            flex: 2, padding: '12px',
            background: saving ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, rgba(80,140,255,0.3), rgba(120,80,255,0.25))',
            border: '1px solid rgba(140,180,255,0.3)', borderRadius: '14px',
            cursor: saving ? 'not-allowed' : 'pointer',
            color: saving ? 'rgba(180,210,255,0.4)' : 'rgba(230,240,255,0.95)',
            fontSize: '13px', letterSpacing: '0.12em', fontFamily: 'Georgia, serif',
            boxShadow: saving ? 'none' : '0 4px 24px rgba(80,120,255,0.2)',
          }}>
            {saving ? '他正在赶来...' : '是他，呼唤他'}
          </button>
        </div>
      </div>
    )}
  </div>
)}

        {/* 错误提示 */}
        {error && (
          <div style={{
            marginTop: '12px', padding: '10px 14px',
            background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,100,100,0.15)',
            borderRadius: '12px', fontSize: '11px', color: 'rgba(255,180,180,0.8)', lineHeight: 1.6,
          }}>{error}</div>
        )}

        {/* 关闭 */}
        <button onClick={onClose} style={{
          display: 'block', margin: '20px auto 0', background: 'none', border: 'none',
          color: 'rgba(180,210,255,0.25)', fontSize: '11px', cursor: 'pointer',
          letterSpacing: '0.1em',
        }}>返回</button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

// ── 样式 ──
const sectionTitle = {
  fontSize: '14px', color: 'rgba(220,235,255,0.85)',
  letterSpacing: '0.08em', marginBottom: '4px',
  textShadow: '0 0 12px rgba(80,160,255,0.3)',
}

const sectionHint = {
  fontSize: '11px', color: 'rgba(180,210,255,0.35)',
  letterSpacing: '0.06em', marginBottom: '12px', lineHeight: 1.7,
}

const inputStyle = {
  width: '100%', padding: '13px 16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
  outline: 'none', color: 'rgba(230,240,255,0.95)',
  fontSize: '14px', fontFamily: 'Georgia, serif', letterSpacing: '0.04em',
}

const nextBtn = {
  display: 'block', margin: '10px 0 0 auto',
  padding: '6px 16px', fontSize: '11px',
  background: 'rgba(140,190,255,0.08)',
  border: '1px solid rgba(140,190,255,0.2)', borderRadius: '20px',
  color: 'rgba(200,225,255,0.7)', cursor: 'pointer',
  fontFamily: 'Georgia, serif', letterSpacing: '0.1em',
}
