import { ref } from 'vue'
import { ElNotification } from 'element-plus'

const ws = ref<WebSocket | null>(null)
const isConnected = ref(false)
let reconnectTimer: any = null

export function useWebSocket() {
  // 建立长连接
  const connect = (userType: 'admin' | 'student', userId: string | number) => {
    if (!userId) return
    if (ws.value && (ws.value.readyState === WebSocket.OPEN || ws.value.readyState === WebSocket.CONNECTING)) {
      return
    }

    const host = window.location.hostname || 'localhost'
    const wsUrl = `ws://${host}:8080/api/ws/${userType}/${userId}`

    try {
      ws.value = new WebSocket(wsUrl)
    } catch (err) {
      console.warn('[WebSocket] 创建连接失败:', err)
      scheduleReconnect(userType, userId)
      return
    }

    ws.value.onopen = () => {
      isConnected.value = true
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
      } catch {
        ElNotification({
          title: '🔔 实时系统通知',
          message: event.data,
          type: 'info',
          position: 'top-right',
          duration: 5000
        })
      }
    }

    ws.value.onclose = () => {
      isConnected.value = false
      console.log('[WebSocket] 连接断开，准备重试')
      scheduleReconnect(userType, userId)
    }

    ws.value.onerror = (error) => {
      console.warn('[WebSocket] 发生错误:', error)
      ws.value?.close()
    }
  }

  // 断线重连机制（5秒重试）
  const scheduleReconnect = (userType: 'admin' | 'student', userId: string | number) => {
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      const token = localStorage.getItem('admin_token')
      if (token) {
        connect(userType, userId)
      }
    }, 5000)
  }

  // 手动断开
  const disconnect = () => {
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
