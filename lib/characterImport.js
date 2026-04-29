// ══════════════════════════════════════════════════════
//  角色导入系统（支持多角色）
// ══════════════════════════════════════════════════════

export const CHARACTER_TEMPLATE = {
  id: 'my_character',
  name: '角色名',
  englishName: 'English Name',
  playerNickname: '对她的称呼（如：你、她、姐姐、宝贝）',  // 👈 新增
  images: {
    default: '',
    shy: '',
    intense: '',
    aftercare: '',
  },
  background: '角色背景设定。他是谁，从哪来，为什么住在她家。',
  personality: '性格特点。',
  speechStyle: '说话风格。',
  intimacyDesc: [
    { upTo: 20, text: '好感度0-20时的表现' },
    { upTo: 40, text: '好感度20-40' },
    { upTo: 70, text: '好感度40-70' },
    { upTo: 999, text: '好感度70+' },
  ],
  diaryPrompt: '你是{name}，在书房独自写日记，关于她的内心独白，2-4句',
  intimatePrefix: '你是{name}，用第一人称，不出戏，简短热烈。',
  tags: [],
  tagline: '',
  themeColor: '201,169,110',
}

export function validateCharacter(json) {
  const errors = []
  if (!json.name || typeof json.name !== 'string') errors.push('缺少角色名 (name)')
  if (!json.background || typeof json.background !== 'string') errors.push('缺少背景设定 (background)')
  if (!json.personality || typeof json.personality !== 'string') errors.push('缺少性格描述 (personality)')
  if (!json.speechStyle || typeof json.speechStyle !== 'string') errors.push('缺少说话风格 (speechStyle)')
  if (!json.intimacyDesc || !Array.isArray(json.intimacyDesc) || json.intimacyDesc.length === 0) {
    errors.push('缺少好感度描述 (intimacyDesc)')
  }
  return { valid: errors.length === 0, errors }
}

export function fillDefaults(json) {
  return {
    id: json.id || 'custom_' + Date.now(),
    name: json.name || '他',
    englishName: json.englishName || '',
    playerNickname: json.playerNickname || '你',  // 👈 新增，默认"你"
    images: {
      default: json.images?.default || '',  // 改成空字符串，不要默认立绘
      shy: json.images?.shy || json.images?.default || '',
      intense: json.images?.intense || json.images?.default || '',
      aftercare: json.images?.aftercare || json.images?.default || '',
    },
    background: json.background || '一个神秘的人，住在她家。',
    personality: json.personality || '温柔但带着距离感。',
    speechStyle: json.speechStyle || '简短自然。',
    intimacyDesc: json.intimacyDesc || [
      { upTo: 20, text: '刚认识，有些生疏。' },
      { upTo: 40, text: '慢慢熟悉了。' },
      { upTo: 70, text: '开始在意她。' },
      { upTo: 999, text: '完全陷入了。' },
    ],
    diaryPrompt: json.diaryPrompt || '你是{name}，写今天的日记，关于她，2-4句',
    intimatePrefix: json.intimatePrefix || '你是{name}，用第一人称，简短热烈。',
    tags: json.tags || [],
    tagline: json.tagline || '',
    themeColor: json.themeColor || '201,169,110',
    importantMemories: json.importantMemories || [],  // 👈 加上这一行！
    intimacyLevel: json.intimacyLevel,  // 👈 也可以加上好感度
  }
}

export function downloadTemplate() {
  const blob = new Blob([JSON.stringify(CHARACTER_TEMPLATE, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'character_template.json'
  a.click()
}

export function parseCharacterJSON(text) {
  try {
    const json = JSON.parse(text)
    const validation = validateCharacter(json)
    if (!validation.valid) return { success: false, errors: validation.errors }
    return { success: true, character: fillDefaults(json) }
  } catch (e) {
    return { success: false, errors: ['JSON格式错误: ' + e.message] }
  }
}

export function readCharacterFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(parseCharacterJSON(e.target.result))
    reader.onerror = () => resolve({ success: false, errors: ['文件读取失败'] })
    reader.readAsText(file)
  })
}

// ══════════════════════════════════════════════════════
//  Supabase 存储（多角色版本）
// ══════════════════════════════════════════════════════

// 保存自定义角色
export async function saveCustomCharacter(supabase, userId, characterData) {
  const characterId = characterData.customId || characterData.id || `char_${Date.now()}`
  
  const { error } = await supabase
    .from('custom_characters')
    .upsert({
      user_id: userId,
      character_id: characterId,
      character_data: characterData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id, character_id' })

  if (error) {
    console.error('[CHAR] 保存失败:', error.message)
    return { success: false, error: error.message }
  }
  return { success: true, characterId }
}

// 获取用户所有自定义角色列表
export async function listCustomCharacters(supabase, userId) {
  const { data, error } = await supabase
    .from('custom_characters')
    .select('character_id, character_data, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return []
  
  return data.map(item => ({
    id: item.character_id,
    name: item.character_data.name,
    tagline: item.character_data.tagline || '自定义角色',
    tags: item.character_data.tags || [],
    characterData: item.character_data,
    createdAt: item.created_at,
  }))
}

// 加载指定角色
export async function loadCustomCharacter(supabase, userId, characterId) {
  const { data, error } = await supabase
    .from('custom_characters')
    .select('character_data')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .single()

  if (error || !data) return null
  return data.character_data
}
// 保存重要回忆
export async function saveCharacterMemories(supabase, userId, characterId, memories) {
  if (!memories || memories.length === 0) return { success: true }
  
  // 先删除旧的
  await supabase
    .from('character_memories')
    .delete()
    .eq('user_id', userId)
    .eq('character_id', characterId)
  
  // 插入新的
  const toInsert = memories.map(m => ({
    user_id: userId,
    character_id: characterId,
    title: m.title,
    description: m.desc || m.description,
    importance: m.importance || 3,
  }))
  
  const { error } = await supabase.from('character_memories').insert(toInsert)
  return { success: !error, error: error?.message }
}

// 加载重要回忆
export async function loadCharacterMemories(supabase, userId, characterId) {
  const { data, error } = await supabase
    .from('character_memories')
    .select('title, description, importance')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .order('importance', { ascending: false })
  
  if (error) return []
  return data || []
}

// 👆 新函数结束 ⬆️

// 删除指定角色
export async function deleteCustomCharacter(supabase, userId, characterId) {
  // 先删除关联的回忆
  await supabase
    .from('character_memories')
    .delete()
    .eq('user_id', userId)
    .eq('character_id', characterId)
  
  // 再删除存档
  await supabase
    .from('game_saves')
    .delete()
    .eq('user_id', userId)
    .eq('character_id', characterId)
  
  // 最后删除角色
  const { error } = await supabase
    .from('custom_characters')
    .delete()
    .eq('user_id', userId)
    .eq('character_id', characterId)

  return !error
}

