// ══════════════════════════════════════════════════════
//  Lovense 联动模块（架子）
//  WebBluetooth API，独立面板，不挂亲密进度条
//  后期做成付费解锁
// ══════════════════════════════════════════════════════

// ── 连接状态 ──
let device = null
let server = null
let txChar = null
let connected = false

// ── Lovense 指令协议 ──
// Lovense 玩具通过 BLE 接收简单的文本指令
// 'Vibrate:5;'  → 震动强度5（0-20）
// 'Vibrate:0;'  → 停止
// 'Rotate:5;'   → 旋转强度5（支持旋转的设备）
// 'RotateChange;' → 反转

const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'   // Nordic UART
const TX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'   // Write
const RX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'   // Notify

// ── 连接 ──
export async function connectLovense() {
  if (!navigator.bluetooth) {
    throw new Error('你的浏览器不支持蓝牙连接')
  }

  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'LVS-' }],
      optionalServices: [SERVICE_UUID],
    })

    device.addEventListener('gattserverdisconnected', () => {
      connected = false
      server = null
      txChar = null
      console.log('[Lovense] 设备断开')
    })

    server = await device.gatt.connect()
    const service = await server.getPrimaryService(SERVICE_UUID)
    txChar = await service.getCharacteristic(TX_CHAR_UUID)
    connected = true
    console.log('[Lovense] 连接成功:', device.name)
    return { success: true, name: device.name }
  } catch (e) {
    console.error('[Lovense] 连接失败:', e)
    return { success: false, error: e.message }
  }
}

// ── 断开 ──
export function disconnectLovense() {
  if (device?.gatt?.connected) {
    device.gatt.disconnect()
  }
  connected = false
  server = null
  txChar = null
  device = null
}

// ── 状态 ──
export function isConnected() {
  return connected && device?.gatt?.connected
}

export function getDeviceName() {
  return device?.name || null
}

// ── 发送指令 ──
async function sendCommand(cmd) {
  if (!txChar || !connected) return false
  try {
    const encoder = new TextEncoder()
    await txChar.writeValue(encoder.encode(cmd))
    return true
  } catch (e) {
    console.error('[Lovense] 指令失败:', e)
    return false
  }
}

// ── 震动控制 ──
// level: 0-20, 0=停止
export async function vibrate(level) {
  const l = Math.max(0, Math.min(20, Math.round(level)))
  return sendCommand(`Vibrate:${l};`)
}

// ── 旋转控制（部分设备支持）──
export async function rotate(level) {
  const l = Math.max(0, Math.min(20, Math.round(level)))
  return sendCommand(`Rotate:${l};`)
}

// ── 停止 ──
export async function stop() {
  return sendCommand('Vibrate:0;')
}


// ══════════════════ 节奏模式 ══════════════════

// 预设节奏（intensity数组 + interval毫秒）
export const RHYTHM_PATTERNS = {
  gentle: {
    name: '温柔',
    desc: '轻缓绵长',
    steps: [3, 5, 3, 5, 7, 5, 3],
    interval: 800,
  },
  wave: {
    name: '波浪',
    desc: '渐强渐弱',
    steps: [2, 4, 6, 8, 10, 12, 14, 12, 10, 8, 6, 4, 2],
    interval: 400,
  },
  pulse: {
    name: '脉冲',
    desc: '短促有力',
    steps: [0, 12, 0, 12, 0, 0, 15, 0],
    interval: 300,
  },
  heartbeat: {
    name: '心跳',
    desc: '模拟心跳节奏',
    steps: [8, 14, 4, 0, 0, 8, 14, 4, 0, 0, 0],
    interval: 250,
  },
  storm: {
    name: '风暴',
    desc: '激烈持续',
    steps: [10, 14, 18, 20, 18, 20, 16, 20],
    interval: 350,
  },
  tease: {
    name: '挑逗',
    desc: '若即若离',
    steps: [3, 0, 0, 5, 0, 0, 0, 8, 0, 0, 3, 0],
    interval: 500,
  },
}

let rhythmTimer = null
let rhythmIdx = 0

export function startRhythm(patternId) {
  stopRhythm()
  const pattern = RHYTHM_PATTERNS[patternId]
  if (!pattern) return
  rhythmIdx = 0
  rhythmTimer = setInterval(() => {
    const level = pattern.steps[rhythmIdx % pattern.steps.length]
    vibrate(level)
    rhythmIdx++
  }, pattern.interval)
}

export function stopRhythm() {
  if (rhythmTimer) {
    clearInterval(rhythmTimer)
    rhythmTimer = null
  }
  stop()
}


// ══════════════════ 他来主导模式（预留）══════════════════
// 思路：AI回复中解析 [VIBRATE:X] 标签，自动控制震动
// 亲密对话时，AI的prompt里加：
//   "你可以在回复末尾加 [VIBRATE:0-20] 来控制震动强度"
// 前端解析标签后调用 vibrate(level)

export function parseVibrateTag(aiReply) {
  const match = aiReply.match(/\[VIBRATE:(\d+)\]/)
  if (!match) return null
  return Math.min(20, Math.max(0, parseInt(match[1])))
}

// 给AI的prompt片段（开启主导模式时注入）
export function getLovensePromptHint() {
  return `【设备联动】她已连接智能玩具。你可以在回复末尾加 [VIBRATE:0-20] 控制震动强度（0=停止，1-5=轻柔，6-12=中等，13-20=强烈）。根据当前氛围和节奏自然调控，配合你的语言节奏。不要每句都加，适时使用。`
}
