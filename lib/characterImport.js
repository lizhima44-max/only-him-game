// ══════════════════════════════════════════════════════
//  角色导入系统
//  支持：JSON上传/粘贴 → 验证 → 存Supabase → 游戏读取
// ══════════════════════════════════════════════════════

// ── 角色JSON模板（供用户参考和下载）──
export const CHARACTER_TEMPLATE = {
  id: 'my_character',
  name: '角色名',
  englishName: 'English Name',
  images: {
    default: '',    // 主立绘URL（必填）
    shy: '',        // 腼腆/害羞（选填，没有就用default）
    intense: '',    // 亲密中（选填）
    aftercare: '',  // 余温（选填）
  },
  background: '角色背景设定。他是谁，从哪来，为什么住在她家。',
  personality: '性格特点。例如：温柔体贴/高冷傲娇/腹黑占有欲强...',
  speechStyle: '说话风格。例如：简短有力/温柔啰嗦/毒舌傲娇...',
  intimacyDesc: [
    { upTo: 20,  text: '好感度0-20时的表现，例如：刚认识，有些疏离' },
    { upTo: 40,  text: '好感度20-40，开始放下防备' },
    { upTo: 70,  text: '好感度40-70，承认在意她' },
    { upTo: 999, text: '好感度70+，完全不掩饰' },
  ],
  diaryPrompt: '你是{name}，在书房独自写日记，关于她的内心独白，2-4句',
  intimatePrefix: '你是{name}，用第一人称，不出戏，简短热烈。',
  // 可选扩展
  tags: ['标签1', '标签2'],        // 角色标签（lobby卡片显示）
  tagline: '一句话介绍',           // lobby卡片副标题
  themeColor: '201,169,110',       // RGB主题色
}

// ── 验证 ──
export function validateCharacter(json) {
  const errors = []

  if (!json.name || typeof json.name !== 'string') {
    errors.push('缺少角色名 (name)')
  }
  if (!json.background || typeof json.background !== 'string') {
    errors.push('缺少背景设定 (background)')
  }
  if (!json.personality || typeof json.personality !== 'string') {
    errors.push('缺少性格描述 (personality)')
  }
  if (!json.speechStyle || typeof json.speechStyle !== 'string') {
    errors.push('缺少说话风格 (speechStyle)')
  }
  if (!json.images || !json.images.default) {
    // 立绘可以没有，用占位符
    // errors.push('缺少立绘图片 (images.default)')
  }
  if (!json.intimacyDesc || !Array.isArray(json.intimacyDesc) || json.intimacyDesc.length === 0) {
    errors.push('缺少好感度描述 (intimacyDesc)')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ── 填充默认值 ──
export function fillDefaults(json) {
  return {
    id: json.id || 'custom_' + Date.now(),
    name: json.name || '他',
    englishName: json.englishName || '',
    images: {
      default: json.images?.default || '',
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
  }
}

// ── 导出模板JSON文件 ──
export function downloadTemplate() {
  const blob = new Blob([JSON.stringify(CHARACTER_TEMPLATE, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'character_template.json'
  a.click()
}

// ── 从JSON字符串解析 ──
export function parseCharacterJSON(text) {
  try {
    const json = JSON.parse(text)
    const validation = validateCharacter(json)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }
    return { success: true, character: fillDefaults(json) }
  } catch (e) {
    return { success: false, errors: ['JSON格式错误: ' + e.message] }
  }
}

// ── 从文件读取 ──
export function readCharacterFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      resolve(parseCharacterJSON(e.target.result))
    }
    reader.onerror = () => {
      resolve({ success: false, errors: ['文件读取失败'] })
    }
    reader.readAsText(file)
  })
}


// ══════════════════════════════════════════════════════
//  Supabase 存储
// ══════════════════════════════════════════════════════

// Supabase SQL:
/*
CREATE TABLE IF NOT EXISTS custom_characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  character_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE custom_characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own characters" ON custom_characters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own characters" ON custom_characters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own characters" ON custom_characters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own characters" ON custom_characters FOR DELETE USING (auth.uid() = user_id);
*/

export async function saveCustomCharacter(supabase, userId, characterData) {
  const { data, error } = await supabase
    .from('custom_characters')
    .upsert({
      user_id: userId,
      character_data: characterData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()

  if (error) {
    console.error('[CHAR] 保存失败:', error.message)
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function loadCustomCharacter(supabase, userId) {
  const { data, error } = await supabase
    .from('custom_characters')
    .select('character_data')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data.character_data
}

export async function deleteCustomCharacter(supabase, userId) {
  const { error } = await supabase
    .from('custom_characters')
    .delete()
    .eq('user_id', userId)

  return !error
}


// ══════════════════════════════════════════════════════
//  game.js 集成说明
// ══════════════════════════════════════════════════════
//
// 1. lobby.js 的"与他重逢"卡片 → 点击后弹出导入面板
//    - 上传JSON文件 或 粘贴JSON文本
//    - 预览角色信息（名字/标签/背景/立绘）
//    - 确认导入 → saveCustomCharacter 存库
//    - 跳转 game 页面，带 ?char=custom 参数
//
// 2. game.js 初始化时：
//    - 检查 URL 参数或 localStorage 有没有 selectedCharId === 'custom'
//    - 如果是自定义角色 → loadCustomCharacter 从库读
//    - 用读到的JSON覆盖 CHARACTER_CONFIG
//    - 其他逻辑不变
//
// 3. game.js 顶部改成动态 CONFIG：
//    let CHARACTER_CONFIG = { ... 默认陆绍桓 ... }
//    // 初始化时可能被覆盖：
//    // CHARACTER_CONFIG = loadedCustomCharacter
