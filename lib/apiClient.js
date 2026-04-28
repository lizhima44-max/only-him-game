// ══════════════════════════════════════════════════════
//  AI API 统一调用层
//  支持：DeepSeek / Claude / GPT / Gemini / Kimi / 第三方中转
//  全部走 OpenAI 兼容协议（Claude走转换层）
// ══════════════════════════════════════════════════════

// ── 预设 Provider 配置 ──
const PROVIDERS = {
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    protocol: 'openai',
    keyPlaceholder: 'sk-...',
  },
  openai: {
    name: 'ChatGPT',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o4-mini'],
    defaultModel: 'gpt-4o-mini',
    protocol: 'openai',
    keyPlaceholder: 'sk-...',
  },
  claude: {
    name: 'Claude',
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001', 'claude-opus-4-20250515'],
    defaultModel: 'claude-sonnet-4-20250514',
    protocol: 'anthropic',
    keyPlaceholder: 'sk-ant-...',
  },
  gemini: {
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    defaultModel: 'gemini-2.5-flash',
    protocol: 'gemini',
    keyPlaceholder: 'AIza...',
  },
  kimi: {
    name: 'Kimi (Moonshot)',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    defaultModel: 'moonshot-v1-8k',
    protocol: 'openai',
    keyPlaceholder: 'sk-...',
  },
  custom: {
    name: '第三方中转',
    baseUrl: '',
    models: [],
    defaultModel: '',
    protocol: 'openai',  // 默认OpenAI兼容，可切换
    keyPlaceholder: 'sk-...',
  },
}

// ── 读写 localStorage ──
const STORAGE_KEY = 'onlyhim_api_config'

export function loadApiConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export function saveApiConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function getProviders() {
  return PROVIDERS
}

// ── 拉取模型列表（仅OpenAI兼容协议支持）──
export async function fetchModels(provider, apiKey, baseUrl) {
  const p = PROVIDERS[provider]
  if (!p && !baseUrl) return []

  const url = baseUrl || p?.baseUrl
  const protocol = p?.protocol || 'openai'

  // 只有OpenAI兼容协议支持 /models 端点
  if (protocol !== 'openai') {
    return p?.models || []
  }

  try {
    const res = await fetch(`${url}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    if (!res.ok) return p?.models || []
    const data = await res.json()
    const models = (data.data || [])
      .map(m => m.id)
      .filter(id => id.includes('gpt') || id.includes('deepseek') || id.includes('moonshot') || id.includes('o1') || id.includes('o3') || id.includes('o4') || !p) // 中转的话全部显示
      .sort()
    return models.length > 0 ? models : (p?.models || [])
  } catch {
    return p?.models || []
  }
}

// ── 统一调用 ──
export async function callAI(systemPrompt, messages, config) {
  if (!config?.apiKey) {
    throw new Error('请先在设置中配置API Key')
  }

  const provider = PROVIDERS[config.provider]
  const protocol = config.protocol || provider?.protocol || 'openai'
  const baseUrl = config.baseUrl || provider?.baseUrl
  const model = config.model || provider?.defaultModel
  const maxTokens = config.maxTokens || 500

  // 过滤掉系统消息
  const cleanMessages = messages.filter(m =>
    m.content && !m.content.startsWith('[SYSTEM]')
  )

  if (protocol === 'anthropic') {
    return callClaude(baseUrl, config.apiKey, model, systemPrompt, cleanMessages, maxTokens)
  } else if (protocol === 'gemini') {
    return callGemini(baseUrl, config.apiKey, model, systemPrompt, cleanMessages, maxTokens)
  } else {
    return callOpenAI(baseUrl, config.apiKey, model, systemPrompt, cleanMessages, maxTokens)
  }
}

// ── OpenAI 兼容协议（DeepSeek / GPT / Kimi / 中转）──
async function callOpenAI(baseUrl, apiKey, model, systemPrompt, messages, maxTokens) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `API错误 ${res.status}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || '···'
}

// ── Claude 原生协议 ──
async function callClaude(baseUrl, apiKey, model, systemPrompt, messages, maxTokens) {
  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Claude API错误 ${res.status}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || '···'
}

// ── Gemini 原生协议 ──
async function callGemini(baseUrl, apiKey, model, systemPrompt, messages, maxTokens) {
  // Gemini 用 generateContent 端点
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const res = await fetch(
    `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Gemini API错误 ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '···'
}

// ── Fallback：走服务端代理（无key时用项目默认key）──
export async function callFallback(systemPrompt, messages) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, messages }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content || '···'
}
