import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

export function useWebSocket() {
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)

  // 建立连接
  const connect = (userType: 'admin' | 'student', userId: string | number) => {
    // 如果已经连接且状态为 OPEN，则跳过
    if (ws.value && ws.value.readyState === WebSocket.OPEN) return

    // 获取当前域名动态拼接 ws 协议 (开发环境可直接写死 ws://localhost:8080)
    // 假设 Vite 代理中 /api 代理到了后端，WebSocket 需要单独转 ws://
    const host = window.location.host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // 由于后端独立端口 8080，这里演示直接连接后端
    const wsUrl = `ws://localhost:8080/api/ws/${userType}/${userId}`
    
    ws.value = new WebSocket(wsUrl)

    ws.value.onopen = () => {
      isConnected.value = true
      console.log(`[WebSocket] Connected: ${userType}_${userId}`)
    }

    ws.value.onmessage = (event) => {
      console.log('[WebSocket] Received:', event.data)
      
      // 核心作用：在这里统一拦截后端的实时消息并分发
      // 例如：后端推送 { "type": "ORDER_SHIPPED", "msg": "您的礼物已发货" }
      try {
        const data = JSON.parse(event.data)
        if (data.msg) {
          ElMessage.success(data.msg)
        }
        // TODO: 如果需要，可以结合 Pinia 的 Store 进行全局状态更新
        // const store = useAppStore(); store.addNotice(data);
      } catch (e) {
        // 兼容普通文本消息
        if (event.data !== '连接成功') {
          ElMessage.info(event.data)
        }
      }
    }

    ws.value.onclose = () => {
      isConnected.value = false
      console.log('[WebSocket] Disconnected')
    }

    ws.value.onerror = (error) => {
      console.error('[WebSocket] Error:', error)
      ws.value?.close()
    }
  }

  // 手动断开
  const disconnect = () => {
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
  }

  // 发送消息到后端
  const sendMessage = (message: string) => {
    if (ws.value && isConnected.value) {
      ws.value.send(message)
    } else {
      ElMessage.warning('WebSocket 尚未连接')
    }
  }

  // 提供给 Vue 组件的钩子
  return {
    ws,
    isConnected,
    connect,
    disconnect,
    sendMessage
  }
}
