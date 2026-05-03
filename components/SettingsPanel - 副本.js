// ══════════════════════════════════════════════════════
//  设置面板 — 底部Sheet弹窗
//  T0: API配置
//  T1+: 天气/日历/大姨妈/房间装修（预留tabs）
// ══════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { loadApiConfig, saveApiConfig, getProviders, fetchModels } from '../lib/apiClient'

export default function SettingsPanel({ show, onClose }) {
  const providers = getProviders()

  // ── API 配置 State ──
  const [provider, setProvider] = useState('deepseek')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [protocol, setProtocol] = useState('openai')
  const [modelList, setModelList] = useState([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [testResult, setTestResult] = useState(null) // null | 'ok' | 'fail'
  const [testing, setTesting] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  // ── Tab ──
  const [activeTab, setActiveTab] = useState('api')
  const tabs = [
    { id: 'api', label: '🔑 AI模型' },
    // 后续扩展:
    // { id: 'weather', label: '🌤 天气' },
    // { id: 'calendar', label: '📅 日历' },
    // { id: 'period', label: '🩸 生理期' },
    // { id: 'decor', label: '🎨 装修' },
  ]

  // ── 加载已保存配置 ──
  useEffect(() => {
    if (!show) return
    const cfg = loadApiConfig()
    if (cfg) {
      setProvider(cfg.provider || 'deepseek')
      setApiKey(cfg.apiKey || '')
      setBaseUrl(cfg.baseUrl || '')
      setModel(cfg.model || '')
      setProtocol(cfg.protocol || providers[cfg.provider]?.protocol || 'openai')
    }
    setSaved(false)
    setTestResult(null)
  }, [show])

  // ── 切换 Provider 时更新默认值 ──
  useEffect(() => {
    const p = providers[provider]
    if (!p) return
    if (provider !== 'custom') {
      setBaseUrl(p.baseUrl)
      setProtocol(p.protocol)
      setModel(p.defaultModel)
      setModelList(p.models || [])
    } else {
      setProtocol('openai')
      setModelList([])
    }
    setTestResult(null)
  }, [provider])

  // ── 拉取模型列表 ──
  const handleFetchModels = useCallback(async () => {
    if (!apiKey) return
    setFetchingModels(true)
    try {
      const models = await fetchModels(provider, apiKey, baseUrl)
      if (models.length > 0) setModelList(models)
    } catch {}
    setFetchingModels(false)
  }, [provider, apiKey, baseUrl])

  // ── 测试连接 ──
  const handleTest = useCallback(async () => {
    if (!apiKey) { setTestResult('fail'); return }
    setTesting(true)
    setTestResult(null)
    try {
      const { callAI } = await import('../lib/apiClient')
      const reply = await callAI(
        '你是测试助手，用一句话回复"连接成功"',
        [{ role: 'user', content: '测试' }],
        { provider, apiKey, baseUrl, model, protocol, maxTokens: 30 }
      )
      setTestResult(reply ? 'ok' : 'fail')
    } catch (e) {
      console.error('API测试失败:', e)
      setTestResult('fail')
    }
    setTesting(false)
  }, [provider, apiKey, baseUrl, model, protocol])

  // ── 保存 ──
  function handleSave() {
    saveApiConfig({ provider, apiKey, baseUrl, model, protocol })
    setSaved(true)
    setTimeout(() => onClose(), 600)
  }

  if (!show) return null

  const p = providers[provider]
  const isCustom = provider === 'custom'

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '480px',
        background: 'rgba(10,7,4,0.97)',
        border: '1px solid rgba(201,169,110,0.12)',
        borderRadius: '20px 20px 0 0',
        padding: '16px 20px 40px',
        maxHeight: '85vh', overflowY: 'auto',
        fontFamily: 'Georgia, serif',
      }}>
        {/* 标题 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '14px', color: '#c9a96e', letterSpacing: '0.1em' }}>设置</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
            fontSize: '18px', cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* Tabs（目前只有API，后续扩展） */}
        {tabs.length > 1 && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: '6px 14px', fontSize: '11px',
                background: activeTab === t.id ? 'rgba(201,169,110,0.1)' : 'transparent',
                border: `1px solid ${activeTab === t.id ? 'rgba(201,169,110,0.25)' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '20px', cursor: 'pointer',
                color: activeTab === t.id ? '#c9a96e' : 'rgba(255,255,255,0.3)',
                fontFamily: 'Georgia, serif',
              }}>{t.label}</button>
            ))}
          </div>
        )}

        {/* ══ API 配置 ══ */}
        {activeTab === 'api' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Provider 选择 */}
            <div>
              <div style={labelStyle}>AI 服务商</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(providers).map(([key, val]) => (
                  <button key={key} onClick={() => setProvider(key)} style={{
                    padding: '7px 14px', fontSize: '12px',
                    background: provider === key ? 'rgba(201,169,110,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${provider === key ? 'rgba(201,169,110,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '10px', cursor: 'pointer',
                    color: provider === key ? '#c9a96e' : 'rgba(255,255,255,0.35)',
                    fontFamily: 'Georgia, serif', transition: 'all 0.2s',
                  }}>{val.name}</button>
                ))}
              </div>
            </div>

            {/* API Key */}
            <div>
              <div style={labelStyle}>API Key</div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setTestResult(null) }}
                  placeholder={p?.keyPlaceholder || 'sk-...'}
                  style={inputStyle}
                />
                <button onClick={() => setShowKey(!showKey)} style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(201,169,110,0.4)',
                  fontSize: '12px', cursor: 'pointer',
                }}>{showKey ? '隐藏' : '显示'}</button>
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.3)', marginTop: '4px', lineHeight: 1.6 }}>
                Key 仅存储在你的浏览器本地，不会上传服务器
              </div>
            </div>

            {/* 自定义URL（中转或高级用户） */}
            {(isCustom || baseUrl !== p?.baseUrl) && (
              <div>
                <div style={labelStyle}>API 地址</div>
                <input
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder="https://your-proxy.com/v1"
                  style={inputStyle}
                />
              </div>
            )}
            {!isCustom && (
              <button onClick={() => {
                if (baseUrl === p?.baseUrl) setBaseUrl('')
                else setBaseUrl(p?.baseUrl || '')
              }} style={{
                alignSelf: 'flex-start', fontSize: '10px', background: 'none',
                border: 'none', color: 'rgba(201,169,110,0.35)', cursor: 'pointer',
                textDecoration: 'underline', padding: 0,
              }}>{baseUrl !== p?.baseUrl ? '恢复默认地址' : '自定义API地址'}</button>
            )}

            {/* 中转协议选择 */}
            {isCustom && (
              <div>
                <div style={labelStyle}>协议类型</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'openai', label: 'OpenAI兼容' },
                    { id: 'anthropic', label: 'Claude原生' },
                    { id: 'gemini', label: 'Gemini原生' },
                  ].map(pr => (
                    <button key={pr.id} onClick={() => setProtocol(pr.id)} style={{
                      padding: '6px 12px', fontSize: '11px',
                      background: protocol === pr.id ? 'rgba(201,169,110,0.1)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${protocol === pr.id ? 'rgba(201,169,110,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: '8px', cursor: 'pointer',
                      color: protocol === pr.id ? '#c9a96e' : 'rgba(255,255,255,0.25)',
                      fontFamily: 'Georgia, serif',
                    }}>{pr.label}</button>
                  ))}
                </div>
              </div>
            )}

            {/* 模型选择 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={labelStyle}>模型</span>
                <button onClick={handleFetchModels} disabled={fetchingModels || !apiKey} style={{
                  fontSize: '10px', background: 'none', border: '1px solid rgba(201,169,110,0.15)',
                  color: fetchingModels ? 'rgba(201,169,110,0.3)' : 'rgba(201,169,110,0.5)',
                  padding: '2px 10px', borderRadius: '12px', cursor: apiKey ? 'pointer' : 'default',
                  fontFamily: 'Georgia, serif',
                }}>{fetchingModels ? '拉取中…' : '刷新列表'}</button>
              </div>

              {modelList.length > 0 ? (
                <select value={model} onChange={e => setModel(e.target.value)} style={{
                  ...inputStyle, cursor: 'pointer',
                }}>
                  {modelList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder="输入模型名称"
                  style={inputStyle}
                />
              )}
            </div>

            {/* 测试 & 保存 */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button onClick={handleTest} disabled={testing || !apiKey} style={{
                flex: 1, padding: '12px',
                background: testing ? 'rgba(255,255,255,0.03)' : 'rgba(201,169,110,0.06)',
                border: `1px solid ${testResult === 'ok' ? 'rgba(80,180,100,0.4)' : testResult === 'fail' ? 'rgba(255,80,80,0.3)' : 'rgba(201,169,110,0.15)'}`,
                borderRadius: '12px', cursor: apiKey ? 'pointer' : 'default',
                color: testResult === 'ok' ? 'rgba(80,180,100,0.8)' : testResult === 'fail' ? 'rgba(255,120,120,0.8)' : 'rgba(201,169,110,0.6)',
                fontSize: '12px', fontFamily: 'Georgia, serif',
              }}>
                {testing ? '测试中…' : testResult === 'ok' ? '✓ 连接成功' : testResult === 'fail' ? '✕ 连接失败' : '测试连接'}
              </button>

              <button onClick={handleSave} disabled={!apiKey} style={{
                flex: 1, padding: '12px',
                background: saved ? 'rgba(80,180,100,0.15)' : apiKey ? 'rgba(201,169,110,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${saved ? 'rgba(80,180,100,0.35)' : apiKey ? 'rgba(201,169,110,0.3)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '12px', cursor: apiKey ? 'pointer' : 'default',
                color: saved ? 'rgba(80,180,100,0.8)' : apiKey ? '#c9a96e' : 'rgba(255,255,255,0.2)',
                fontSize: '12px', fontFamily: 'Georgia, serif', letterSpacing: '0.1em',
              }}>
                {saved ? '✓ 已保存' : '保存'}
              </button>
            </div>

            {/* 无Key提示 */}
            {!apiKey && (
              <div style={{
                padding: '12px 14px', marginTop: '4px',
                background: 'rgba(201,169,110,0.04)',
                border: '1px solid rgba(201,169,110,0.1)',
                borderRadius: '12px',
                fontSize: '11px', color: 'rgba(201,169,110,0.5)', lineHeight: 1.8,
              }}>
                需要自备 API Key 才能使用。推荐 DeepSeek（便宜好用）或 Claude（效果最佳）。
                <br />不知道怎么获取？可以搜索"DeepSeek API Key 注册"。
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}

// ── 样式复用 ──
const labelStyle = {
  fontSize: '11px', color: 'rgba(201,169,110,0.45)',
  letterSpacing: '0.12em', marginBottom: '6px',
}

const inputStyle = {
  width: '100%', padding: '11px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(201,169,110,0.15)',
  borderRadius: '10px', outline: 'none',
  color: '#e8dcc8', fontSize: '13px',
  fontFamily: 'Georgia, serif',
}
