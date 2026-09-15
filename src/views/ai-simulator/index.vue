<script setup lang="ts">
import { ref, reactive, nextTick, onMounted } from 'vue'
import {
  ChatDotRound,
  Search,
  Position,
  Delete,
  VideoPlay,
  Cpu,
  Tools,
  Timer,
  Warning,
  CircleCheck,
  VideoPause
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  source?: string
  toolCall?: {
    toolName?: string
    description?: string
    status?: string
    arguments?: string
    resultFactJson?: string
    executionTimeMs?: number
  }
  time?: string
}

const simulateType = ref<'student1' | 'student2' | 'demo' | 'custom'>('demo')
const customStudentNo = ref('')
const messages = ref<ChatMessage[]>([])
const inputQuestion = ref('')
const isGenerating = ref(false)
const abortController = ref<AbortController | null>(null)

const debugInfo = reactive({
  ttftMs: 0,
  totalMs: 0,
  source: '待测试',
  engine: 'SenseNova / Local Agent',
  lastToolCall: null as ChatMessage['toolCall'] | null
})

const toolNameMap: Record<string, string> = {
  query_my_points: '查询个人积分与流水 (query_my_points)',
  query_my_orders: '查询礼品兑换订单与提货码 (query_my_orders)',
  query_my_activities: '查询校园活动报名与候补 (query_my_activities)',
  query_my_certificates: '查询荣誉证书与防伪验真码 (query_my_certificates)',
  search_platform_knowledge: '检索官方知识库规则 (search_platform_knowledge)'
}

const getToolLabel = (name?: string) => {
  if (!name) return '业务工具'
  return toolNameMap[name] || name
}

onMounted(() => {
  initMessages()
})

const initMessages = () => {
  messages.value = [
    {
      id: 'init',
      role: 'assistant',
      content: '同学你好！我是校园小助手“小智”。\n\nAI Function Calling 智能调度已就绪。你可以切换上方【模拟身份】，并点击下方快捷指令或输入任意问题，系统将自动决策调用后端只读工具获取实时数据库事实！',
      source: 'TOOL_AGENT',
      time: new Date().toTimeString().substring(0, 5)
    }
  ]
}

const handleQuickAsk = (text: string) => {
  if (isGenerating.value) return
  inputQuestion.value = text
  handleSend()
}

const stopGeneration = () => {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
  }
  isGenerating.value = false
  ElMessage.info('已终止本次生成')
}

const clearMessages = () => {
  if (isGenerating.value) stopGeneration()
  initMessages()
  debugInfo.ttftMs = 0
  debugInfo.totalMs = 0
  debugInfo.source = '已重置'
  debugInfo.lastToolCall = null
}

const handleSend = async () => {
  const text = inputQuestion.value.trim()
  if (!text || isGenerating.value) return

  inputQuestion.value = ''
  const curTime = new Date().toTimeString().substring(0, 5)

  messages.value.push({
    id: 'u_' + Date.now(),
    role: 'user',
    content: text,
    time: curTime
  })

  const assistantMsg = reactive<ChatMessage>({
    id: 'a_' + Date.now(),
    role: 'assistant',
    content: '',
    source: '',
    time: curTime
  })
  messages.value.push(assistantMsg)

  isGenerating.value = true
  const controller = new AbortController()
  abortController.value = controller

  const startTime = Date.now()
  let firstToken = false

  try {
    let studentNo: string | undefined = undefined
    if (simulateType.value === 'demo') {
      studentNo = '2023010401'
    } else if (simulateType.value === 'student1') {
      studentNo = '20220101'
    } else if (simulateType.value === 'student2') {
      studentNo = '20220102'
    } else if (simulateType.value === 'custom') {
      studentNo = customStudentNo.value.trim() || undefined
    }

    const token = localStorage.getItem('admin_token') || ''
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (token) {
      headers['satoken'] = token
    }

    const res = await fetch('/api/ai/chat/stream', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question: text,
        simulateStudentNo: studentNo
      }),
      signal: controller.signal
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    if (!res.body) {
      throw new Error('未获取到流式响应')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith(':')) continue

        if (trimmed === 'data: [DONE]' || trimmed === 'data:[DONE]') {
          debugInfo.totalMs = Date.now() - startTime
          break
        }

        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.substring(5).trim()
          try {
            const data = JSON.parse(jsonStr)

            if (!firstToken && (data.content || data.toolCall)) {
              firstToken = true
              debugInfo.ttftMs = Date.now() - startTime
            }

            if (data.source) {
              assistantMsg.source = data.source
              debugInfo.source = data.source
              if (data.source === 'SENSENOVA') {
                debugInfo.engine = '商汤日日新大模型 (Tools)'
              } else if (data.source === 'TOOL_AGENT') {
                debugInfo.engine = 'Function Calling 调度引擎'
              } else if (data.source === 'LOCAL_AGENT') {
                debugInfo.engine = '本地智能工具引擎 (Local Fallback)'
              } else if (data.source === 'KNOWLEDGE_BASE') {
                debugInfo.engine = '官方知识库直连引擎'
              }
            }

            if (data.toolCall) {
              assistantMsg.toolCall = {
                toolName: data.toolCall.toolName,
                description: data.toolCall.description,
                status: data.toolCall.status,
                arguments: data.toolCall.argumentsJson || data.toolCall.arguments,
                resultFactJson: data.toolCall.resultFactJson,
                executionTimeMs: data.toolCall.executionTimeMs
              }
              debugInfo.lastToolCall = { ...assistantMsg.toolCall }
            }

            if (data.content) {
              assistantMsg.content += data.content
            }
          } catch (e) {
          }
        }
      }
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      assistantMsg.content = `[请求异常: ${err.message || '网络中断'}]`
    }
  } finally {
    isGenerating.value = false
    abortController.value = null
    debugInfo.totalMs = Date.now() - startTime
  }
}
</script>

<template>
  <div class="ai-simulator-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">🤖 AI 智能体调试中枢 (Function Calling 仿真工作台)</h2>
        <p class="page-desc">基于大模型两轮握手与本地工具降级，支持无缝切换学生身份并实时观测后端 5 大只读工具执行轨迹与 Fact JSON。</p>
      </div>
    </div>

    <div class="workbench-layout">
      <!-- 左侧：真机仿真交互卡片 -->
      <div class="phone-panel">
        <div class="phone-shell">
          <!-- 身份选择栏 -->
          <div class="sim-identity-bar">
            <span class="bar-label">模拟身份：</span>
            <el-radio-group v-model="simulateType" size="small">
              <el-radio-button value="demo">张晓明 (2023010401)</el-radio-button>
              <el-radio-button value="student1">张伟 (20220101)</el-radio-button>
              <el-radio-button value="student2">王芳 (20220102)</el-radio-button>
              <el-radio-button value="custom">自定义学号</el-radio-button>
            </el-radio-group>
            <el-input
              v-if="simulateType === 'custom'"
              v-model="customStudentNo"
              placeholder="输入学号"
              size="small"
              style="width: 140px; margin-left: 8px;"
            />
          </div>

          <!-- 消息流展示区 -->
          <div class="phone-chat-body">
            <div
              v-for="msg in messages"
              :key="msg.id"
              :class="['chat-bubble-row', msg.role]"
            >
              <div :class="['avatar-icon', msg.role]">
                {{ msg.role === 'user' ? '学' : '🤖' }}
              </div>
              <div class="bubble-content-wrap">
                <!-- 引擎微标 -->
                <div v-if="msg.role === 'assistant' && msg.source" class="source-tag">
                  <el-tag size="small" effect="plain" type="success">
                    {{ msg.source === 'SENSENOVA' ? '商汤日日新大模型' : (msg.source === 'TOOL_AGENT' ? 'Function Calling 调度' : '本地智能工具引擎') }}
                  </el-tag>
                </div>

                <!-- 工具调用动态卡片 -->
                <div v-if="msg.toolCall" class="tool-call-banner">
                  <el-icon><Tools /></el-icon>
                  <span class="tc-name">触发只读工具: <b>{{ msg.toolCall.toolName }}</b></span>
                  <span v-if="msg.toolCall.executionTimeMs" class="tc-time">耗时 {{ msg.toolCall.executionTimeMs }}ms</span>
                </div>

                <div :class="['bubble-text', msg.role]">
                  {{ msg.content }}
                </div>
                <div class="msg-timestamp">{{ msg.time }}</div>
              </div>
            </div>
          </div>

          <!-- 快捷提问气泡 -->
          <div class="quick-chips-bar">
            <span class="chips-title">快捷测试：</span>
            <el-tag class="chip" size="small" @click="handleQuickAsk('我当前还有多少可用积分？最近有什么收支明细？')">查我的积分</el-tag>
            <el-tag class="chip" size="small" type="success" @click="handleQuickAsk('我兑换的奖品订单有哪些？核销码是多少？')">查我的订单</el-tag>
            <el-tag class="chip" size="small" type="warning" @click="handleQuickAsk('我报名了哪些活动？有在候补排队的吗？')">查我的活动</el-tag>
            <el-tag class="chip" size="small" type="danger" @click="handleQuickAsk('查一下我的荣誉结项证书和防伪编号')">查我的证书</el-tag>
            <el-tag class="chip" size="small" type="info" @click="handleQuickAsk('活动如果人数已满怎么候补？')">候补规则</el-tag>
          </div>

          <!-- 提问输入操作栏 -->
          <div class="input-action-bar">
            <el-input
              v-model="inputQuestion"
              type="textarea"
              :rows="2"
              placeholder="输入测试问题（支持自然语言任意提问）..."
              :disabled="isGenerating"
              @keyup.enter.exact="handleSend"
            />
            <div class="action-btns">
              <el-button size="small" :icon="Delete" @click="clearMessages">清空</el-button>
              <el-button
                v-if="isGenerating"
                type="danger"
                size="small"
                :icon="VideoPause"
                @click="stopGeneration"
              >
                停止生成
              </el-button>
              <el-button
                v-else
                type="primary"
                size="small"
                :icon="Position"
                @click="handleSend"
              >
                发送提问
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：Debug Inspector 透视看板 -->
      <div class="debug-panel">
        <el-card shadow="never" class="inspector-card">
          <template #header>
            <div class="card-header">
              <div class="title-wrap">
                <el-icon :size="18"><Cpu /></el-icon>
                <span>调试透视窗 (Debug Inspector)</span>
              </div>
              <el-tag :type="isGenerating ? 'danger' : 'success'" size="small">
                {{ isGenerating ? '正在流式接收' : '空闲待命' }}
              </el-tag>
            </div>
          </template>

          <!-- 关键性能指标卡片 -->
          <div class="kpi-metrics-row">
            <div class="kpi-box">
              <div class="kpi-label">首字延迟 (TTFT)</div>
              <div class="kpi-val">{{ debugInfo.ttftMs ? debugInfo.ttftMs + ' ms' : '-' }}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">全流程耗时</div>
              <div class="kpi-val">{{ debugInfo.totalMs ? debugInfo.totalMs + ' ms' : '-' }}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">当前运行引擎</div>
              <div class="kpi-val highlight">{{ debugInfo.engine }}</div>
            </div>
          </div>

          <!-- Function Calling 调度轨迹 -->
          <div class="trajectory-section">
            <div class="section-title">
              <el-icon><Tools /></el-icon>
              <span>Function Calling 调度轨迹</span>
              <el-tag
                v-if="debugInfo.lastToolCall"
                size="small"
                :type="debugInfo.lastToolCall.status === 'SUCCESS' ? 'success' : 'danger'"
              >
                {{ debugInfo.lastToolCall.status }}
              </el-tag>
            </div>

            <div v-if="debugInfo.lastToolCall" class="trajectory-details">
              <div class="traj-item">
                <span class="traj-label">触发工具：</span>
                <span class="traj-val font-mono">{{ getToolLabel(debugInfo.lastToolCall.toolName) }}</span>
              </div>
              <div v-if="debugInfo.lastToolCall.executionTimeMs" class="traj-item">
                <span class="traj-label">执行耗时：</span>
                <span class="traj-val font-green">{{ debugInfo.lastToolCall.executionTimeMs }} ms</span>
              </div>
              <div class="traj-item">
                <span class="traj-label">大模型下发入参 (Arguments)：</span>
                <pre class="json-code">{{ debugInfo.lastToolCall.arguments || '{}' }}</pre>
              </div>
              <div class="traj-item">
                <span class="traj-label">后端返回业务事实 (Fact JSON)：</span>
                <pre class="json-code fact-json">{{ debugInfo.lastToolCall.resultFactJson || '暂无数据' }}</pre>
              </div>
            </div>

            <div v-else class="empty-trajectory">
              <el-empty description="当前轮次未触发工具调用（尚未提问或大模型直接解答）" :image-size="70" />
            </div>
          </div>

          <!-- IDOR 安全防护栏 -->
          <div class="security-guard-box">
            <div class="sec-title">
              <el-icon><CircleCheck /></el-icon>
              <span>IDOR 越权攻击防御 (Session Enforced)</span>
            </div>
            <p class="sec-desc">
              已启用严格会话身份注水机制：在 Tools OpenAPI Schema 中完全屏蔽 studentId 暴露，后端以经过鉴权的 Sa-Token 会话为唯一事实源，彻底杜绝越权访问其他学生数据。
            </p>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-simulator-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  background: #ffffff;
  padding: 16px 20px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.page-title {
  margin: 0 0 6px 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.page-desc {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

.workbench-layout {
  display: grid;
  grid-template-columns: 480px 1fr;
  gap: 16px;
  align-items: start;
}

@media (max-width: 1100px) {
  .workbench-layout {
    grid-template-columns: 1fr;
  }
}

/* 手机交互区 */
.phone-panel {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
}

.phone-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sim-identity-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  background: #f8fafc;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.bar-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-right: 8px;
}

.phone-chat-body {
  height: 480px;
  overflow-y: auto;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-bubble-row {
  display: flex;
  gap: 10px;
}

.chat-bubble-row.user {
  flex-direction: row-reverse;
}

.avatar-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}

.avatar-icon.user {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #ffffff;
}

.avatar-icon.assistant {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #ffffff;
}

.bubble-content-wrap {
  display: flex;
  flex-direction: column;
  max-width: 82%;
  gap: 4px;
}

.chat-bubble-row.user .bubble-content-wrap {
  align-items: flex-end;
}

.source-tag {
  margin-bottom: 2px;
}

.tool-call-banner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 6px;
  font-size: 11px;
  color: #92400e;
}

.tc-time {
  background: #ffffff;
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 600;
}

.bubble-text {
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.bubble-text.user {
  background: #3b82f6;
  color: #ffffff;
  border-bottom-right-radius: 2px;
}

.bubble-text.assistant {
  background: #ffffff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  border-bottom-left-radius: 2px;
}

.msg-timestamp {
  font-size: 11px;
  color: #94a3b8;
}

/* 快捷测试指令条 */
.quick-chips-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.chips-title {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.chip {
  cursor: pointer;
  transition: all 0.2s;
}

.chip:hover {
  transform: translateY(-1px);
  filter: brightness(0.95);
}

.input-action-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btns {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 右侧 Debug Inspector */
.debug-panel {
  display: flex;
  flex-direction: column;
}

.inspector-card {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.kpi-metrics-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.kpi-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
}

.kpi-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}

.kpi-val {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.kpi-val.highlight {
  font-size: 13px;
  color: #2563eb;
}

.trajectory-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
}

.trajectory-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.traj-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.traj-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.traj-val {
  font-size: 13px;
  color: #0f172a;
}

.font-mono {
  font-family: monospace;
  font-weight: 600;
  color: #2563eb;
}

.font-green {
  font-weight: 700;
  color: #059669;
}

.json-code {
  background: #0f172a;
  color: #38bdf8;
  padding: 10px 12px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  max-height: 220px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.fact-json {
  color: #4ade80;
}

.empty-trajectory {
  padding: 20px 0;
}

.security-guard-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 12px;
}

.sec-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #166534;
  margin-bottom: 4px;
}

.sec-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #15803d;
}
</style>
