// components/SettingsPanel.js
import { useState, useEffect, useCallback } from 'react'
import { loadApiConfig, saveApiConfig, callAI, fetchModels } from '../lib/apiClient'

// localStorage 存储 Key 的键名
const STORAGE_KEYS = 'onlyhim_api_keys'
const STORAGE_ACTIVE = 'onlyhim_active_key_id'

// 预设服务商
const PRESET_PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat', protocol: 'openai' },
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini', protocol: 'openai' },
  { id: 'claude', name: 'Claude', baseUrl: 'https://api.anthropic.com/v1', defaultModel: 'claude-3-haiku-20240307', protocol: 'anthropic' },
  { id: 'gemini', name: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', defaultModel: 'gemini-1.5-flash', protocol: 'gemini' },
  { id: 'kimi', name: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k', protocol: 'openai' },
]

export default function SettingsPanel({ show, onClose }) {
  const [keys, setKeys] = useState([])           // 所有 Key 对象数组
  const [activeKeyId, setActiveKeyId] = useState(null)  // 当前使用的 Key ID
  const [showAddModal, setShowAddModal] = useState(false)
  const [testingKeyId, setTestingKeyId] = useState(null)
  const [testStatus, setTestStatus] = useState({}) // { keyId: 'ok' | 'fail' | null }
  const [fetchingModels, setFetchingModels] = useState(false)
  
  // 添加 Key 的表单
  const [newKeyForm, setNewKeyForm] = useState({
    providerType: 'deepseek',   // 'deepseek', 'openai', 'claude', 'gemini', 'kimi', 'custom'
    name: '',
    baseUrl: '',
    apiKey: '',
    model: '',
  })
  const [modelOptions, setModelOptions] = useState([])  // 测试连接后返回的模型列表
  const [testingNew, setTestingNew] = useState(false)
  
  // 主题（跟随系统）
  const [theme, setTheme] = useState('day')
  useEffect(() => {
    const hour = new Date().getHours()
    setTheme(hour >= 6 && hour < 18 ? 'day' : 'night')
  }, [])

  // 加载已保存的 Keys
  useEffect(() => {
    if (!show) return
    const storedKeys = localStorage.getItem(STORAGE_KEYS)
    const storedActive = localStorage.getItem(STORAGE_ACTIVE)
    if (storedKeys) {
      const parsed = JSON.parse(storedKeys)
      setKeys(parsed)
      if (storedActive) {
        setActiveKeyId(storedActive)
      } else if (parsed.length > 0) {
        // 如果没有 active，用第一个 default 或第一个
        const defaultKey = parsed.find(k => k.isDefault) || parsed[0]
        setActiveKeyId(defaultKey.id)
        localStorage.setItem(STORAGE_ACTIVE, defaultKey.id)
      }
    } else {
      // 初始化：尝试从旧的单个配置迁移
      const oldConfig = loadApiConfig()
      if (oldConfig && oldConfig.apiKey) {
        const newKey = {
          id: `key_${Date.now()}`,
          name: oldConfig.provider === 'custom' ? '自定义中转' : (PRESET_PROVIDERS.find(p => p.id === oldConfig.provider)?.name || oldConfig.provider),
          provider: oldConfig.provider,
          baseUrl: oldConfig.baseUrl,
          apiKey: oldConfig.apiKey,
          model: oldConfig.model || '',
          isDefault: true,
          createdAt: new Date().toISOString(),
        }
        setKeys([newKey])
        setActiveKeyId(newKey.id)
        localStorage.setItem(STORAGE_KEYS, JSON.stringify([newKey]))
        localStorage.setItem(STORAGE_ACTIVE, newKey.id)
      } else {
        setKeys([])
        setActiveKeyId(null)
      }
    }
  }, [show])

  // 保存 Keys 到 localStorage（每次变化都存）
  useEffect(() => {
    if (keys.length > 0) {
      localStorage.setItem(STORAGE_KEYS, JSON.stringify(keys))
    } else {
      localStorage.removeItem(STORAGE_KEYS)
    }
  }, [keys])
  
  useEffect(() => {
    if (activeKeyId) {
      localStorage.setItem(STORAGE_ACTIVE, activeKeyId)
      // 同时更新旧版兼容配置（供 lib/apiClient 使用）
      const activeKey = keys.find(k => k.id === activeKeyId)
      if (activeKey) {
        saveApiConfig({
          provider: activeKey.provider,
          apiKey: activeKey.apiKey,
          baseUrl: activeKey.baseUrl,
          model: activeKey.model,
          protocol: PRESET_PROVIDERS.find(p => p.id === activeKey.provider)?.protocol || 'openai',
        })
      }
    }
  }, [activeKeyId, keys])

  // 切换使用
  const handleUseKey = (keyId) => {
    if (keyId === activeKeyId) return
    setActiveKeyId(keyId)
    setTestStatus({})
  }

  // 删除 Key
  const handleDeleteKey = (keyId) => {
    if (keys.length === 1) {
      alert('至少保留一个 Key，可以添加新 Key 后再删除')
      return
    }
    const newKeys = keys.filter(k => k.id !== keyId)
    setKeys(newKeys)
    if (activeKeyId === keyId) {
      const newActive = newKeys[0]
      setActiveKeyId(newActive.id)
    }
  }

  // 设为默认（isDefault 仅用于标记，不影响实际使用；实际使用由 activeKeyId 决定）
  const handleSetDefault = (keyId) => {
    setKeys(keys.map(k => ({ ...k, isDefault: k.id === keyId })))
  }

  // 测试已有 Key
  const handleTestKey = async (key) => {
    setTestingKeyId(key.id)
    setTestStatus(prev => ({ ...prev, [key.id]: null }))
    try {
      const reply = await callAI(
        '你是测试助手，用一句话回复"连接成功"',
        [{ role: 'user', content: '测试' }],
        {
          provider: key.provider,
          apiKey: key.apiKey,
          baseUrl: key.baseUrl,
          model: key.model,
          protocol: PRESET_PROVIDERS.find(p => p.id === key.provider)?.protocol || 'openai',
          maxTokens: 30
        }
      )
      setTestStatus(prev => ({ ...prev, [key.id]: reply ? 'ok' : 'fail' }))
    } catch (e) {
      setTestStatus(prev => ({ ...prev, [key.id]: 'fail' }))
    }
    setTestingKeyId(null)
  }

  // ------------------- 添加新 Key 相关 -------------------
  const handleProviderChange = (type) => {
    const preset = PRESET_PROVIDERS.find(p => p.id === type)
    setNewKeyForm({
      providerType: type,
      name: type === 'custom' ? '' : (preset?.name || ''),
      baseUrl: preset?.baseUrl || '',
      apiKey: '',
      model: preset?.defaultModel || '',
    })
    setModelOptions([])
  }

  const handleTestNewKey = async () => {
    if (!newKeyForm.apiKey) {
      alert('请输入 API Key')
      return
    }
    setTestingNew(true)
    try {
      const { providerType, baseUrl, apiKey, model } = newKeyForm
      const protocol = PRESET_PROVIDERS.find(p => p.id === providerType)?.protocol || 'openai'
      // 测试连接
      const reply = await callAI(
        '你是测试助手，用一句话回复"连接成功"',
        [{ role: 'user', content: '测试' }],
        { provider: providerType, apiKey, baseUrl, model, protocol, maxTokens: 30 }
      )
      if (reply) {
        alert('连接成功！')
        // 自动拉取模型列表
        try {
          const models = await fetchModels(providerType, apiKey, baseUrl)
          setModelOptions(models || [])
          if (models && models.length > 0 && !newKeyForm.model) {
            setNewKeyForm(prev => ({ ...prev, model: models[0] }))
          }
        } catch (e) {
          console.warn('拉取模型失败', e)
        }
      } else {
        alert('连接失败，请检查 API Key 和地址')
      }
    } catch (e) {
      alert('连接失败：' + e.message)
    }
    setTestingNew(false)
  }

  const handleSaveNewKey = () => {
    if (!newKeyForm.apiKey) {
      alert('请填写 API Key')
      return
    }
    if (!newKeyForm.baseUrl) {
      alert('请填写 API 地址')
      return
    }
    const newKey = {
      id: `key_${Date.now()}`,
      name: newKeyForm.name.trim() || (newKeyForm.providerType === 'custom' ? '自定义中转' : PRESET_PROVIDERS.find(p => p.id === newKeyForm.providerType)?.name),
      provider: newKeyForm.providerType,
      baseUrl: newKeyForm.baseUrl,
      apiKey: newKeyForm.apiKey,
      model: newKeyForm.model || '',
      isDefault: keys.length === 0, // 第一个添加的成为默认
      createdAt: new Date().toISOString(),
    }
    setKeys([...keys, newKey])
    if (keys.length === 0) {
      setActiveKeyId(newKey.id)
    }
    setShowAddModal(false)
    // 重置表单
    setNewKeyForm({
      providerType: 'deepseek',
      name: '',
      baseUrl: PRESET_PROVIDERS.find(p => p.id === 'deepseek')?.baseUrl,
      apiKey: '',
      model: PRESET_PROVIDERS.find(p => p.id === 'deepseek')?.defaultModel,
    })
    setModelOptions([])
  }

  if (!show) return null

  const isDay = theme === 'day'
  // 主题颜色变量
  const bgColor = isDay ? '#F9F5F2' : '#1B0A1F'
  const textPrimary = isDay ? '#3A3A3A' : '#EDEAF2'
  const textSecondary = isDay ? '#6D6D6D' : '#C9B8D9'
  const accentColor = '#F88DA7'
  const borderColor = isDay ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)'
  const cardBg = isDay ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)'
  const cardBgHover = isDay ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.18)'

  return (
    <>
      <style jsx global>{`
        .settings-glass {
          background: ${cardBg};
          backdrop-filter: blur(16px);
          border: 1px solid ${borderColor};
          border-radius: 20px;
          transition: all 0.3s ease;
        }
        .settings-input {
          width: 100%;
          padding: 12px 14px;
          background: ${isDay ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.06)'};
          border: 1px solid ${borderColor};
          border-radius: 14px;
          color: ${textPrimary};
          font-size: 13px;
          font-family: 'Georgia', serif;
          outline: none;
          transition: all 0.25s;
        }
        .settings-input:focus {
          border-color: ${accentColor};
          box-shadow: 0 0 8px ${accentColor}40;
        }
        .settings-btn {
          padding: 8px 14px;
          border-radius: 40px;
          border: 1px solid ${borderColor};
          background: ${cardBg};
          color: ${textSecondary};
          font-size: 11px;
          font-family: 'Georgia', serif;
          cursor: pointer;
          transition: all 0.25s;
        }
        .settings-btn:hover {
          background: ${cardBgHover};
          border-color: ${accentColor};
          color: ${accentColor};
          box-shadow: 0 0 8px ${accentColor}80;
        }
        .settings-btn-primary {
          background: linear-gradient(135deg, rgba(248,141,167,0.2), rgba(220,100,140,0.3));
          border-color: ${accentColor}80;
          color: ${accentColor};
        }
        .settings-btn-primary:hover {
          background: linear-gradient(135deg, rgba(248,141,167,0.4), rgba(220,100,140,0.5));
          box-shadow: 0 0 12px ${accentColor};
        }
      `}</style>

      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          width: '100%', maxWidth: '480px',
          background: bgColor,
          borderRadius: '24px 24px 0 0',
          padding: '20px 20px 40px',
          maxHeight: '85vh', overflowY: 'auto',
          fontFamily: 'Georgia, serif',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.2)',
        }}>
          {/* 头部 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '16px', color: accentColor, letterSpacing: '0.1em' }}>⚙️ AI模型设置</div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: textSecondary,
              fontSize: '20px', cursor: 'pointer', padding: '4px',
            }}>✕</button>
          </div>

          {/* Key 列表 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: textSecondary, marginBottom: '12px' }}>我的API Key</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {keys.map(key => {
                const isActive = activeKeyId === key.id
                const testStat = testStatus[key.id]
                return (
                  <div key={key.id} className="settings-glass" style={{
                    padding: '12px 14px',
                    border: isActive ? `1px solid ${accentColor}` : 'none',
                    background: isActive ? (isDay ? 'rgba(248,141,167,0.08)' : 'rgba(248,141,167,0.12)') : cardBg,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold', color: textPrimary }}>{key.name}</span>
                        <span style={{ fontSize: '10px', color: textSecondary, fontFamily: 'monospace' }}>{key.apiKey.slice(-6)}</span>
                        {key.isDefault && <span style={{ fontSize: '10px', color: accentColor }}>默认</span>}
                        {isActive && <span style={{ fontSize: '10px', color: '#4caf50' }}>✓ 使用中</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleTestKey(key)} className="settings-btn" style={{ padding: '4px 10px' }} disabled={testingKeyId === key.id}>
                          {testingKeyId === key.id ? '测试中…' : (testStat === 'ok' ? '✓ 成功' : testStat === 'fail' ? '✗ 失败' : '测试')}
                        </button>
                        <button onClick={() => handleUseKey(key.id)} className="settings-btn settings-btn-primary" style={{ padding: '4px 10px' }}>用这个</button>
                        <button onClick={() => handleSetDefault(key.id)} className="settings-btn" style={{ padding: '4px 8px' }}>默认</button>
                        <button onClick={() => handleDeleteKey(key.id)} className="settings-btn" style={{ padding: '4px 8px', color: '#f99' }}>删除</button>
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: textSecondary, marginTop: '6px', wordBreak: 'break-all' }}>
                      {key.baseUrl} / {key.model}
                    </div>
                  </div>
                )
              })}
              {keys.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: textSecondary }}>暂无 Key，请点击下方添加</div>
              )}
            </div>
          </div>

          {/* 添加按钮 */}
          <button onClick={() => setShowAddModal(true)} className="settings-btn" style={{
            width: '100%', padding: '12px', marginBottom: '20px', fontSize: '13px',
            background: cardBgHover, borderColor: accentColor, color: accentColor,
          }}>+ 添加新 Key</button>

          {/* 当前使用指示 */}
          <div style={{ fontSize: '11px', color: textSecondary, textAlign: 'center', padding: '10px 0', borderTop: `1px solid ${borderColor}` }}>
            当前使用：{keys.find(k => k.id === activeKeyId)?.name || '无'}
          </div>
        </div>
      </div>

      {/* 添加 Key 弹窗 Modal */}
      {showAddModal && (
        <div onClick={() => setShowAddModal(false)} style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '90%', maxWidth: '400px',
            background: bgColor,
            borderRadius: '24px',
            padding: '24px',
            fontFamily: 'Georgia, serif',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontSize: '18px', color: accentColor }}>添加API Key</div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: textSecondary, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* 服务商选择 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={labelStyle}>服务商</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[...PRESET_PROVIDERS, { id: 'custom', name: '自定义中转' }].map(p => (
                  <button key={p.id} onClick={() => handleProviderChange(p.id)} className="settings-btn" style={{
                    background: newKeyForm.providerType === p.id ? accentColor + '20' : 'transparent',
                    borderColor: newKeyForm.providerType === p.id ? accentColor : borderColor,
                  }}>{p.name}</button>
                ))}
              </div>
            </div>

            {/* API 地址 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={labelStyle}>API地址 *</div>
              <input type="text" className="settings-input" value={newKeyForm.baseUrl} onChange={e => setNewKeyForm({ ...newKeyForm, baseUrl: e.target.value })} placeholder="https://api.deepseek.com/v1" />
            </div>

            {/* API Key */}
            <div style={{ marginBottom: '16px' }}>
              <div style={labelStyle}>API Key *</div>
              <input type="password" className="settings-input" value={newKeyForm.apiKey} onChange={e => setNewKeyForm({ ...newKeyForm, apiKey: e.target.value })} placeholder="sk-..." />
            </div>

            {/* 模型名称（可选） */}
            <div style={{ marginBottom: '16px' }}>
              <div style={labelStyle}>模型名称（可选）</div>
              {modelOptions.length > 0 ? (
                <select className="settings-input" value={newKeyForm.model} onChange={e => setNewKeyForm({ ...newKeyForm, model: e.target.value })}>
                  {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input type="text" className="settings-input" value={newKeyForm.model} onChange={e => setNewKeyForm({ ...newKeyForm, model: e.target.value })} placeholder="deepseek-chat" />
              )}
            </div>

            {/* 按钮组 */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button onClick={handleTestNewKey} className="settings-btn" disabled={testingNew} style={{ flex: 1 }}>
                {testingNew ? '测试中…' : '测试连接'}
              </button>
              <button onClick={handleSaveNewKey} className="settings-btn settings-btn-primary" style={{ flex: 1 }}>💾 保存并切换</button>
              <button onClick={() => setShowAddModal(false)} className="settings-btn" style={{ flex: 1 }}>取消</button>
            </div>
            {modelOptions.length > 0 && (
              <div style={{ fontSize: '10px', color: textSecondary, marginTop: '12px', textAlign: 'center' }}>
                找到 {modelOptions.length} 个可用模型
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const labelStyle = {
  fontSize: '11px', color: '#F88DA7', letterSpacing: '0.08em', marginBottom: '6px',
}