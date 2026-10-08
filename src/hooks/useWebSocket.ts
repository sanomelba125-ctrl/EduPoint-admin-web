import { ref } from 'vue'
import { ElNotification } from 'element-plus'

const ws = ref<WebSocket | null>(null)
const isConnected = ref(false)
let reconnectTimer: any = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
let isManualClose = false

/**
 * 子协议标记，必须与后端 WebSocketConstants.PROTOCOL_MARKER 保持一致。
 * 浏览器 WebSocket 无法自定义请求头，因此用 [标记, token] 两个子协议把登录凭据带给服务端。
 */
const WS_SUB_PROTOCOL_MARKER = 'satoken'

type MessageListener = (data: any) => void
const messageListeners = new Set<MessageListener>()

export function onWsMessage(listener: MessageListener) {
  messageListeners.add(listener)
  return () => {
    messageListeners.delete(listener)
  }
}

export function useWebSocket() {
  // 建立长连接
  const connect = (userType: 'admin' | 'student', userId: string | number) => {
    if (!userId) return
    if (ws.value && (ws.value.readyState === WebSocket.OPEN || ws.value.readyState === WebSocket.CONNECTING)) {
      return
    }

    isManualClose = false

    // 握手必须携带登录凭据，缺失时直接跳过，避免反复发起必然被拒绝的连接
    const token = localStorage.getItem('admin_token')
    if (!token) {
      console.warn('[WebSocket] 未获取到登录凭据，跳过连接')
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host || 'localhost:3000'
    const defaultWsUrl = `${protocol}//${host}/api/ws/${userType}/${userId}`
    const wsUrl = (import.meta.env.VITE_WS_BASE_URL as string)
      ? `${import.meta.env.VITE_WS_BASE_URL}/${userType}/${userId}`
      : defaultWsUrl

    try {
      ws.value = new WebSocket(wsUrl, [WS_SUB_PROTOCOL_MARKER, token])
    } catch (err) {
      console.warn('[WebSocket] 创建连接失败:', err)
      scheduleReconnect(userType, userId)
      return
    }

    ws.value.onopen = () => {
      isConnected.value = true
      reconnectAttempts = 0
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      console.log(`[WebSocket] 连接已就绪: ${userType}_${userId}`)
    }

    ws.value.onmessage = (event) => {
      console.log('[WebSocket] 收到推送消息:', event.data)
      if (!event.data || event.data === '连接成功') return

      try {
        const data = JSON.parse(event.data)
        const title = data.title || (data.type === 'gift_exchange' ? '🔔 新礼品兑换订单' : '🔔 实时系统通知')
        const message = data.content || data.msg || data.message || JSON.stringify(data)

        ElNotification({
          title,
          message,
          type: 'warning',
          position: 'top-right',
          duration: 6000
        })

        // 通知所有订阅监听器
        messageListeners.forEach((listener) => {
          try {
            listener(data)
          } catch (e) {
            console.error('[WebSocket] 监听回调执行异常:', e)
          }
        })
      } catch {
        ElNotification({
          title: '🔔 实时系统通知',
          message: event.data,
          type: 'info',
          position: 'top-right',
          duration: 5000
        })

        messageListeners.forEach((listener) => {
          try {
            listener({ text: event.data })
          } catch (e) {
            console.error('[WebSocket] 监听回调执行异常:', e)
          }
        })
      }
    }

    ws.value.onclose = () => {
      isConnected.value = false
      if (isManualClose) {
        console.log('[WebSocket] 已手动断开连接，无需自动重连')
        return
      }
      console.log('[WebSocket] 连接断开，准备重试')
      scheduleReconnect(userType, userId)
    }

    ws.value.onerror = (error) => {
      console.warn('[WebSocket] 发生错误:', error)
      ws.value?.close()
    }
  }

  // 断线重连机制（5秒重试，带上限）
  const scheduleReconnect = (userType: 'admin' | 'student', userId: string | number) => {
    if (isManualClose) return
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn(`[WebSocket] 已达到最大重连次数(${MAX_RECONNECT_ATTEMPTS})，停止自动重连`)
      return
    }
    if (reconnectTimer) return
    reconnectAttempts++
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      const token = localStorage.getItem('admin_token')
      if (token && !isManualClose) {
        connect(userType, userId)
      }
    }, 5000)
  }

  // 手动断开
  const disconnect = () => {
    isManualClose = true
    reconnectAttempts = 0
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    isConnected.value = false
  }

  return {
    ws,
    isConnected,
    connect,
    disconnect
  }
}
