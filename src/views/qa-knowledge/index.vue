<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Search,
  Refresh,
  Plus,
  Edit,
  Delete,
  View,
  ChatDotRound,
  QuestionFilled,
  Cpu,
  CollectionTag,
  CircleCheck,
  Check,
  VideoPause,
  DeleteFilled,
  Tools
} from '@element-plus/icons-vue'
import {
  getQaKnowledgePage,
  createQaKnowledge,
  updateQaKnowledge,
  deleteQaKnowledge,
  toggleQaKnowledgeStatus,
  type QaKnowledgeVO,
  type QaKnowledgeDTO,
  type QaKnowledgeQuery
} from '@/api/qa-knowledge'
import { usePageList } from '@/hooks/usePageList'

// 知识库分类字典与标签样式定义
const categoryMap: Record<
  string,
  { label: string; tagType: 'primary' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  SCORE: { label: '积分说明', tagType: 'warning' },
  ACTIVITY: { label: '活动打卡', tagType: 'primary' },
  GIFT: { label: '礼品兑换', tagType: 'danger' },
  RULE: { label: '平台规则', tagType: 'success' },
  OTHER: { label: '其他咨询', tagType: 'info' }
}

const getCategoryLabel = (category: string) => categoryMap[category]?.label || category
const getCategoryTagType = (category: string) => categoryMap[category]?.tagType || 'info'

// 列表与分页状态管理
const {
  loading,
  list: knowledgeList,
  total,
  queryParams,
  load: fetchKnowledge,
  handleSearch,
  handleReset,
  handleCurrentChange,
  handleSizeChange
} = usePageList<Omit<QaKnowledgeQuery, 'page' | 'size'>, QaKnowledgeVO>({
  initialFilters: {
    keyword: '',
    category: undefined,
    status: undefined
  },
  fetcher: (params) => {
    return getQaKnowledgePage({
      ...params,
      keyword: params.keyword?.trim() || undefined,
      category: params.category || undefined,
      status: params.status !== undefined && params.status !== '' ? Number(params.status) : undefined
    })
  }
})

// KPI 统计指标计算
const activeCount = computed(() => {
  return knowledgeList.value.filter((item) => item.status === 1).length
})

const totalConsultations = computed(() => {
  return knowledgeList.value.reduce((acc, cur) => acc + (cur.viewCount || 0), 0)
})

// 新增 / 编辑弹窗表单状态
const dialogVisible = ref(false)
const dialogTitle = ref('新增知识库条目')
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const formData = reactive<QaKnowledgeDTO>({
  id: undefined,
  category: 'SCORE',
  question: '',
  answer: '',
  keywords: '',
  sortOrder: 1,
  status: 1
})

const formRules = reactive<FormRules>({
  category: [{ required: true, message: '请选择知识分类', trigger: 'change' }],
  question: [
    { required: true, message: '请输入常见问题标题或意图', trigger: 'blur' },
    { min: 3, max: 200, message: '问题长度在 3 到 200 个字符之间', trigger: 'blur' }
  ],
  answer: [
    { required: true, message: '请输入官方权威解答正文', trigger: 'blur' },
    { min: 5, max: 1000, message: '解答内容在 5 到 1000 个字符之间', trigger: 'blur' }
  ],
  sortOrder: [{ required: true, message: '请输入排序权重', trigger: 'blur' }]
})

// 打开新增弹窗
const openCreateDialog = () => {
  isEdit.value = false
  dialogTitle.value = '新增问答知识库条目'
  formData.id = undefined
  formData.category = 'SCORE'
  formData.question = ''
  formData.answer = ''
  formData.keywords = ''
  formData.sortOrder = 1
  formData.status = 1
  dialogVisible.value = true
}

// 打开编辑弹窗
const openEditDialog = (row: QaKnowledgeVO) => {
  isEdit.value = true
  dialogTitle.value = `编辑知识库条目 - #${row.id}`
  formData.id = row.id
  formData.category = row.category
  formData.question = row.question
  formData.answer = row.answer
  formData.keywords = row.keywords || ''
  formData.sortOrder = row.sortOrder ?? 1
  formData.status = row.status ?? 1
  dialogVisible.value = true
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitLoading.value = true
    try {
      if (isEdit.value && formData.id) {
        await updateQaKnowledge(formData)
        ElMessage.success('知识库条目已成功更新')
      } else {
        await createQaKnowledge(formData)
        ElMessage.success('知识库条目新增成功')
      }
      dialogVisible.value = false
      fetchKnowledge()
    } catch (err: any) {
      ElMessage.error(err.message || '操作失败，请重试')
    } finally {
      submitLoading.value = false
    }
  })
}

// 启停状态切换
const handleToggleStatus = async (row: QaKnowledgeVO) => {
  const newStatus = row.status === 1 ? 0 : 1
  const actionText = newStatus === 1 ? '启用' : '禁用'
  try {
    if (newStatus === 0) {
      await ElMessageBox.confirm(
        `确定要禁用知识条目【${row.question}】吗？禁用后学生端提问将不再自动匹配该条解答。`,
        '状态停用确认',
        {
          confirmButtonText: '确定停用',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    }
    await toggleQaKnowledgeStatus(row.id, newStatus)
    row.status = newStatus
    ElMessage.success(`知识条目已成功${actionText}`)
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '状态切换失败')
    }
  }
}

// 删除知识库条目
const handleDelete = async (row: QaKnowledgeVO) => {
  try {
    await ElMessageBox.confirm(
      `确定要彻底删除问题【${row.question}】吗？删除后知识库将无法恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await deleteQaKnowledge(row.id)
    ElMessage.success('知识库条目已删除')
    fetchKnowledge()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '删除失败')
    }
  }
}

// 学生端问答模拟预览
const previewVisible = ref(false)
const previewRecord = ref<QaKnowledgeVO | null>(null)

const openPreview = (row: QaKnowledgeVO) => {
  previewRecord.value = row
  previewVisible.value = true
}

// 关键词解析工具函数
const parseKeywords = (keywords?: string): string[] => {
  if (!keywords) return []
  return keywords
    .split(/[,，]/)
    .map((k) => k.trim())
    .filter(Boolean)
}

// 格式化时间
const formatTime = (timeStr?: string) => {
  if (!timeStr) return '-'
  return timeStr.replace('T', ' ').substring(0, 19)
}

// =========================================================================
// AI 真机对话模拟器与 Function Calling 调度调试透视
// =========================================================================
interface SimulatorMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  source?: string
  toolCall?: {
    toolName: string
    description?: string
    status: string
    arguments?: string
    resultFactJson?: string
    executionTimeMs?: number
  }
  time: string
}

const simulatorVisible = ref(false)
const simulateType = ref<'student1' | 'student2' | 'guest' | 'custom'>('student1')
const customStudentNo = ref('')
const simulatorMessages = ref<SimulatorMessage[]>([])
const simulatorInput = ref('')
const simulatorGenerating = ref(false)
const simulatorAbortController = ref<AbortController | null>(null)

// 调试透视指标 (Debug Inspector)
const debugInfo = reactive({
  lastToolCall: null as any,
  ttftMs: 0,
  totalMs: 0,
  source: '未开始',
  engine: '商汤日日新 6.8 / Local Agent'
})

const toolNameMap: Record<string, string> = {
  query_my_points: '查询个人积分与流水明细 (query_my_points)',
  query_my_orders: '查询礼品兑换订单与提货码 (query_my_orders)',
  query_my_activities: '查询校园活动报名与候补 (query_my_activities)',
  query_my_certificates: '查询荣誉结项证书与验真码 (query_my_certificates)',
  search_platform_knowledge: '检索官方知识库规则 (search_platform_knowledge)'
}

const getToolNameLabel = (name?: string) => {
  if (!name) return '业务工具'
  return toolNameMap[name] || name
}

const openSimulatorDrawer = () => {
  simulatorVisible.value = true
  if (simulatorMessages.value.length === 0) {
    simulatorMessages.value = [
      {
        id: 'init_' + Date.now(),
        role: 'assistant',
        content: '你好！我是校园小助手“小智”（Function Calling 智能调度调试模式已激活）。\n\n你可以切换上方“模拟身份”，并点击下方快捷指令或输入任意问题，大模型将自主决策调用对应的后端工具获取实时真实数据并组织回答！',
        source: 'SENSENOVA',
        time: new Date().toTimeString().substring(0, 5)
      }
    ]
  }
}

const stopSimulatorGeneration = () => {
  if (simulatorAbortController.value) {
    simulatorAbortController.value.abort()
    simulatorAbortController.value = null
  }
  simulatorGenerating.value = false
  ElMessage.info('已终止对话生成')
}

const clearSimulatorMessages = () => {
  if (simulatorGenerating.value) {
    stopSimulatorGeneration()
  }
  simulatorMessages.value = []
  debugInfo.lastToolCall = null
  debugInfo.ttftMs = 0
  debugInfo.totalMs = 0
  debugInfo.source = '已重置'
}

const handleSimulatorQuickAsk = (question: string) => {
  if (simulatorGenerating.value) return
  simulatorInput.value = question
  handleSimulatorSend()
}

const handleSimulatorSend = async () => {
  const text = simulatorInput.value.trim()
  if (!text || simulatorGenerating.value) return

  simulatorInput.value = ''

  const userTime = new Date().toTimeString().substring(0, 5)
  simulatorMessages.value.push({
    id: 'u_' + Date.now(),
    role: 'user',
    content: text,
    time: userTime
  })

  const assistantMsg = reactive<SimulatorMessage>({
    id: 'a_' + Date.now(),
    role: 'assistant',
    content: '',
    source: '',
    time: userTime
  })
  simulatorMessages.value.push(assistantMsg)
  const assistantIdx = simulatorMessages.value.length - 1

  simulatorGenerating.value = true
  const controller = new AbortController()
  simulatorAbortController.value = controller

  const startTime = Date.now()
  let firstTokenReceived = false

  try {
    let simulateStudentNo: string | undefined = undefined
    if (simulateType.value === 'student1') {
      simulateStudentNo = '20220101'
    } else if (simulateType.value === 'student2') {
      simulateStudentNo = '20220102'
    } else if (simulateType.value === 'custom') {
      simulateStudentNo = customStudentNo.value.trim() || undefined
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
        simulateStudentNo
      }),
      signal: controller.signal
    })

    if (!res.ok) {
      throw new Error(`HTTP 状态异常: ${res.status}`)
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
            if (!firstTokenReceived && (data.content || data.toolCall)) {
              firstTokenReceived = true
              debugInfo.ttftMs = Date.now() - startTime
            }

            if (data.source) {
              assistantMsg.source = data.source
              debugInfo.source = data.source
              if (data.source === 'SENSENOVA') {
                debugInfo.engine = '商汤日日新 6.8 Flash Lite'
              } else if (data.source === 'TOOL_AGENT') {
                debugInfo.engine = 'Function Calling 调度引擎'
              } else if (data.source === 'LOCAL_AGENT') {
                debugInfo.engine = '本地智能调度引擎 (Local Fallback)'
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
    if (err.name === 'AbortError') {
      ElMessage.info('已中断生成')
    } else {
      assistantMsg.content += (assistantMsg.content ? '\n\n' : '') +
        `【连接提示】AI 响应过程遇到异常: ${err.message}`
      ElMessage.error(`请求失败: ${err.message}`)
    }
  } finally {
    simulatorGenerating.value = false
    simulatorAbortController.value = null
    debugInfo.totalMs = Date.now() - startTime
  }
}
</script>

<template>
  <div class="qa-knowledge-page">
    <!-- 顶部 KPI 概览卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon-wrapper bg-blue">
              <el-icon :size="24"><ChatDotRound /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">知识库问答总数</div>
              <div class="stat-value text-blue">{{ total }} 条</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="12" :sm="6" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon-wrapper bg-green">
              <el-icon :size="24"><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">已启用应答规则</div>
              <div class="stat-value text-green">{{ activeCount }} 条</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="12" :sm="6" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon-wrapper bg-orange">
              <el-icon :size="24"><View /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">当页咨询查阅热度</div>
              <div class="stat-value text-orange">{{ totalConsultations }} 次</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="12" :sm="6" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon-wrapper bg-purple">
              <el-icon :size="24"><Cpu /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">AI 服务运行引擎</div>
              <div class="stat-value text-purple font-sm">
                双通道保障 (RAG+流式)
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 检索与操作卡片 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="queryParams" class="filter-form">
        <el-form-item label="知识分类">
          <el-select
            v-model="queryParams.category"
            placeholder="全部分类"
            clearable
            style="width: 150px;"
            @change="handleSearch"
          >
            <el-option
              v-for="(val, key) in categoryMap"
              :key="key"
              :label="val.label"
              :value="key"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="关键词检索">
          <el-input
            v-model="queryParams.keyword"
            placeholder="检索问题标题或关联词..."
            clearable
            style="width: 240px;"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-select
            v-model="queryParams.status"
            placeholder="全部状态"
            clearable
            style="width: 120px;"
            @change="handleSearch"
          >
            <el-option label="已启用" :value="1" />
            <el-option label="已禁用" :value="0" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>

        <div class="filter-right">
          <el-button type="success" :icon="ChatDotRound" @click="openSimulatorDrawer">
            🤖 真机对话模拟器 (Function Calling)
          </el-button>
          <el-button type="primary" :icon="Plus" @click="openCreateDialog">新增问答条目</el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 知识库列表表格卡片 -->
    <el-card shadow="never" class="table-card">
      <div class="simulator-callout-banner">
        <div class="callout-left">
          <span class="callout-badge">NEW</span>
          <span class="callout-title">🤖 AI 智能客服已接入 Function Calling 大模型调度与 5 大只读原子工具</span>
          <span class="callout-desc">支持实时查询积分、订单核销码、活动候补排队与防伪证书数据</span>
        </div>
        <el-button type="success" size="default" :icon="ChatDotRound" @click="openSimulatorDrawer">
          打开真机对话模拟器 🚀
        </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="knowledgeList"
        stripe
        style="width: 100%"
        row-key="id"
      >
        <el-table-column label="编号" width="90">
          <template #default="{ row }">
            <span class="qa-code">#QA{{ String(row.id).padStart(3, '0') }}</span>
          </template>
        </el-table-column>

        <el-table-column label="分类" width="110">
          <template #default="{ row }">
            <el-tag :type="getCategoryTagType(row.category)" effect="light" size="small">
              {{ getCategoryLabel(row.category) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="常见问题 / 匹配意图" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="question-title">{{ row.question }}</div>
          </template>
        </el-table-column>

        <el-table-column label="官方标准解答内容" min-width="280">
          <template #default="{ row }">
            <el-tooltip
              placement="top"
              :show-after="300"
              effect="dark"
              popper-class="qa-tooltip-popper"
            >
              <template #content>
                <div style="max-width: 380px; line-height: 1.6; white-space: pre-wrap;">
                  {{ row.answer }}
                </div>
              </template>
              <div class="answer-text">{{ row.answer }}</div>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column label="匹配关键词" min-width="180">
          <template #default="{ row }">
            <div class="tags-wrap">
              <el-tag
                v-for="(k, idx) in parseKeywords(row.keywords)"
                :key="idx"
                size="small"
                effect="plain"
                class="keyword-tag"
              >
                {{ k }}
              </el-tag>
              <span v-if="!row.keywords" class="empty-text">-</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="查阅热度" width="100" align="center">
          <template #default="{ row }">
            <div class="view-count-badge">
              <el-icon class="view-icon"><View /></el-icon>
              <span>{{ row.viewCount || 0 }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="权重" width="80" align="center" prop="sortOrder" />

        <el-table-column label="生效状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              active-color="#10b981"
              inactive-color="#d1d5db"
              @change="handleToggleStatus(row)"
            />
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" :icon="View" @click="openPreview(row)">
              预览
            </el-button>
            <el-button link type="primary" :icon="Edit" @click="openEditDialog(row)">
              编辑
            </el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 底部分页器 -->
      <div class="pagination-wrapper">
        <el-pagination
          :current-page="queryParams.page"
          :page-size="queryParams.size"
          :page-sizes="[10, 20, 50]"
          :total="total"
          background
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增 / 编辑知识库条目弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="640px"
      append-to-body
      destroy-on-close
      class="qa-dialog"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="110px"
        label-position="right"
      >
        <el-form-item label="知识分类" prop="category">
          <el-select v-model="formData.category" placeholder="请选择分类" style="width: 100%;">
            <el-option
              v-for="(val, key) in categoryMap"
              :key="key"
              :label="val.label"
              :value="key"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="问题意图" prop="question">
          <el-input
            v-model="formData.question"
            placeholder="例如：如何获得活动积分？积分有什么用？"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="官方解答" prop="answer">
          <el-input
            v-model="formData.answer"
            type="textarea"
            :rows="6"
            placeholder="请输入权威准确的解答内容，支持换行排版..."
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="检索关键词" prop="keywords">
          <el-input
            v-model="formData.keywords"
            placeholder="多个关键词以英文逗号分隔，例如：积分, 获得, 打卡, 兑换"
          />
          <div class="form-tip">关键词可大幅提高学生提问时的精准匹配权重。</div>
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="排序权重" prop="sortOrder">
              <el-input-number
                v-model="formData.sortOrder"
                :min="1"
                :max="9999"
                controls-position="right"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="启用状态">
              <el-radio-group v-model="formData.status">
                <el-radio :value="1">立即启用</el-radio>
                <el-radio :value="0">暂存禁用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
            确认保存
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 学生端移动交互效果模拟预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      title="AI 客服提问交互效果真机模拟"
      width="520px"
      append-to-body
      destroy-on-close
    >
      <div v-if="previewRecord" class="chat-preview-container">
        <div class="preview-meta-bar">
          <span class="meta-tag">
            <el-icon><CollectionTag /></el-icon>
            {{ getCategoryLabel(previewRecord.category) }}
          </span>
          <span class="meta-view">
            <el-icon><View /></el-icon>
            查阅量: {{ previewRecord.viewCount }} 次
          </span>
        </div>

        <div class="chat-mockup-body">
          <!-- 学生提问气泡 -->
          <div class="mockup-row user-row">
            <div class="user-bubble">
              {{ previewRecord.question }}
            </div>
            <div class="avatar user-avatar">学</div>
          </div>

          <!-- AI 客服官方解答气泡 -->
          <div class="mockup-row ai-row">
            <div class="avatar ai-avatar">
              <el-icon><Cpu /></el-icon>
            </div>
            <div class="ai-bubble-box">
              <div class="bubble-header">
                <span class="ai-name">智能客服小智</span>
                <span class="authority-badge">
                  <el-icon><Check /></el-icon> 知识库官方解答
                </span>
              </div>
              <div class="bubble-content">
                {{ previewRecord.answer }}
              </div>
            </div>
          </div>
        </div>

        <div class="preview-footer-info">
          <div class="info-item">
            <span class="label">检索关键词：</span>
            <span class="value">{{ previewRecord.keywords || '无' }}</span>
          </div>
          <div class="info-item">
            <span class="label">最后更新：</span>
            <span class="value">{{ formatTime(previewRecord.updateTime) }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="previewVisible = false">关闭预览</el-button>
      </template>
    </el-dialog>

    <!-- 🤖 AI 智能客服真机对话模拟器抽屉 (支持 Function Calling 轨迹透视与身份切换) -->
    <el-drawer
      v-model="simulatorVisible"
      title="🤖 AI 智能客服真机对话模拟器 (Function Calling 调试中枢)"
      size="960px"
      append-to-body
      destroy-on-close
      class="simulator-drawer"
    >
      <div class="simulator-layout">
        <!-- 左侧：手机对话交互面板 -->
        <div class="simulator-phone-panel">
          <!-- 身份选择器 -->
          <div class="simulator-identity-bar">
            <span class="bar-title">模拟身份：</span>
            <el-radio-group v-model="simulateType" size="small">
              <el-radio-button value="student1">张伟 (20220101)</el-radio-button>
              <el-radio-button value="student2">王芳 (20220102)</el-radio-button>
              <el-radio-button value="guest">匿名游客</el-radio-button>
              <el-radio-button value="custom">自定义学号</el-radio-button>
            </el-radio-group>
            <el-input
              v-if="simulateType === 'custom'"
              v-model="customStudentNo"
              placeholder="输入学号..."
              size="small"
              style="width: 130px; margin-top: 6px;"
            />
          </div>

          <!-- 消息流视窗 -->
          <div class="simulator-messages-scroll">
            <div
              v-for="msg in simulatorMessages"
              :key="msg.id"
              class="sim-msg-row"
              :class="msg.role"
            >
              <div class="sim-avatar" :class="msg.role">
                {{ msg.role === 'user' ? '学' : '🤖' }}
              </div>
              <div class="sim-bubble-wrap">
                <div class="sim-source-tag" v-if="msg.role === 'assistant' && msg.source">
                  <el-tag
                    size="small"
                    :type="msg.source === 'SENSENOVA' ? 'success' : (msg.source === 'TOOL_AGENT' ? 'warning' : 'info')"
                    effect="plain"
                  >
                    {{ msg.source === 'SENSENOVA' ? '商汤日日新 6.8' : (msg.source === 'TOOL_AGENT' ? 'Function Calling 调度' : (msg.source === 'LOCAL_AGENT' ? '本地智能工具引擎' : '官方知识库')) }}
                  </el-tag>
                </div>

                <!-- 工具执行状态徽标 -->
                <div v-if="msg.toolCall" class="sim-tool-call-banner">
                  <el-icon><Tools /></el-icon>
                  <span class="tool-call-title">
                    {{ msg.toolCall.status === 'CALLING' ? '大模型正在调用工具：' : '已成功调用后端工具：' }}
                    <b>{{ msg.toolCall.toolName }}</b>
                  </span>
                  <span v-if="msg.toolCall.executionTimeMs" class="tool-cost">
                    {{ msg.toolCall.executionTimeMs }}ms
                  </span>
                </div>

                <div class="sim-bubble" :class="msg.role">
                  {{ msg.content }}
                </div>
                <div class="sim-time">{{ msg.time }}</div>
              </div>
            </div>
          </div>

          <!-- 快捷提问指令 -->
          <div class="sim-quick-chips">
            <span class="chips-label">快捷测试：</span>
            <el-tag class="quick-chip" size="small" @click="handleSimulatorQuickAsk('我当前还有多少可用积分？')">
              查我的积分
            </el-tag>
            <el-tag class="quick-chip" size="small" type="success" @click="handleSimulatorQuickAsk('我兑换的礼品发货了吗？核销码是多少？')">
              查我的订单
            </el-tag>
            <el-tag class="quick-chip" size="small" type="warning" @click="handleSimulatorQuickAsk('我报名的活动打卡了吗？有在候补排队的吗？')">
              查我的活动
            </el-tag>
            <el-tag class="quick-chip" size="small" type="danger" @click="handleSimulatorQuickAsk('我获得了哪些荣誉结项证书？防伪编号是多少？')">
              查我的证书
            </el-tag>
            <el-tag class="quick-chip" size="small" type="info" @click="handleSimulatorQuickAsk('活动满员后排队候补机制是怎样的？')">
              候补规则
            </el-tag>
          </div>

          <!-- 输入区 -->
          <div class="sim-input-area">
            <el-input
              v-model="simulatorInput"
              type="textarea"
              :rows="2"
              placeholder="输入测试问题（支持直接提问或使用上方指令）..."
              :disabled="simulatorGenerating"
              @keyup.enter.exact="handleSimulatorSend"
            />
            <div class="sim-input-btns">
              <el-button size="small" :icon="DeleteFilled" @click="clearSimulatorMessages">清空</el-button>
              <el-button
                v-if="simulatorGenerating"
                type="danger"
                size="small"
                :icon="VideoPause"
                @click="stopSimulatorGeneration"
              >
                停止生成
              </el-button>
              <el-button
                v-else
                type="primary"
                size="small"
                :icon="ChatDotRound"
                @click="handleSimulatorSend"
              >
                发送提问
              </el-button>
            </div>
          </div>
        </div>

        <!-- 右侧：调试透视窗 (Debug Inspector) -->
        <div class="simulator-inspector-panel">
          <div class="inspector-header">
            <el-icon :size="18"><Cpu /></el-icon>
            <span class="title">调试透视窗 (Debug Inspector)</span>
          </div>

          <!-- 指标卡 -->
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="m-label">首字延迟 (TTFT)</div>
              <div class="m-value text-blue">{{ debugInfo.ttftMs ? debugInfo.ttftMs + ' ms' : '-' }}</div>
            </div>
            <div class="metric-card">
              <div class="m-label">总响应耗时</div>
              <div class="m-value text-green">{{ debugInfo.totalMs ? debugInfo.totalMs + ' ms' : '-' }}</div>
            </div>
            <div class="metric-card">
              <div class="m-label">当前运行引擎</div>
              <div class="m-value text-purple font-sm">{{ debugInfo.engine }}</div>
            </div>
          </div>

          <!-- Function Calling 调度轨迹 -->
          <div class="inspector-section">
            <div class="sec-title">
              <el-icon><Tools /></el-icon>
              <span>Function Calling 调度轨迹</span>
              <el-tag
                v-if="debugInfo.lastToolCall"
                size="small"
                :type="debugInfo.lastToolCall.status === 'SUCCESS' ? 'success' : 'warning'"
              >
                {{ debugInfo.lastToolCall.status }}
              </el-tag>
            </div>

            <div v-if="debugInfo.lastToolCall" class="tool-trajectory-box">
              <div class="traj-item">
                <span class="traj-label">触发工具：</span>
                <span class="traj-val font-bold">{{ getToolNameLabel(debugInfo.lastToolCall.toolName) }}</span>
              </div>
              <div class="traj-item" v-if="debugInfo.lastToolCall.executionTimeMs">
                <span class="traj-label">执行耗时：</span>
                <span class="traj-val text-orange">{{ debugInfo.lastToolCall.executionTimeMs }} ms</span>
              </div>
              <div class="traj-item">
                <span class="traj-label">模型入参：</span>
                <pre class="json-code">{{ debugInfo.lastToolCall.arguments || '{}' }}</pre>
              </div>
              <div class="traj-item">
                <span class="traj-label">业务事实结果 (Fact JSON)：</span>
                <pre class="json-code fact-json">{{ debugInfo.lastToolCall.resultFactJson || '无数据' }}</pre>
              </div>
            </div>
            <div v-else class="empty-trajectory">
              <el-empty description="当前轮次未触发工具调用（大模型直接推断解答或尚未提问）" :image-size="60" />
            </div>
          </div>

          <!-- 安全防越权说明 -->
          <div class="inspector-section idor-box">
            <div class="sec-title">
              <el-icon><Check /></el-icon>
              <span>安全与越权防御 (IDOR Safe Guard)</span>
            </div>
            <div class="idor-content">
              已启用会话身份强制绑定机制：无论模型生成参数或用户输入何种学号，后端业务层均以系统鉴权上下文为唯一事实源，物理隔离跨用户数据泄露。
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.qa-knowledge-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* KPI 概览卡片 */
.stats-row {
  margin-bottom: 0;
}

.stat-card {
  border-radius: 8px;
  border: 1px solid #ebeef5;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 14px;
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
}

.bg-blue {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.bg-green {
  background: linear-gradient(135deg, #10b981, #059669);
}

.bg-orange {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.bg-purple {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
}

.stat-info {
  overflow: hidden;
}

.stat-title {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.text-blue {
  color: #2563eb;
}

.text-green {
  color: #059669;
}

.text-orange {
  color: #d97706;
}

.text-purple {
  color: #7c3aed;
}

.font-sm {
  font-size: 14px;
  font-weight: 600;
}

/* 过滤与操作栏 */
.filter-card {
  border-radius: 8px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.filter-right {
  margin-left: auto;
}

/* 列表表格 */
.table-card {
  border-radius: 8px;
}

.simulator-callout-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  padding: 12px 18px;
  margin-bottom: 16px;
}

.callout-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.callout-badge {
  background: #10b981;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.callout-title {
  font-size: 14px;
  font-weight: 700;
  color: #065f46;
}

.callout-desc {
  font-size: 12px;
  color: #047857;
}

.qa-code {
  font-family: monospace;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.question-title {
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
}

.answer-text {
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.keyword-tag {
  border-radius: 4px;
  color: #475569;
}

.empty-text {
  color: #94a3b8;
  font-size: 13px;
}

.view-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #f59e0b;
  font-weight: 600;
}

.view-icon {
  font-size: 14px;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.form-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
  line-height: 1.4;
}

/* 模拟真机聊天预览卡片 */
.chat-preview-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.preview-meta-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 13px;
}

.meta-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #2563eb;
}

.meta-view {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #64748b;
}

.chat-mockup-body {
  background: #f1f5f9;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 180px;
}

.mockup-row {
  display: flex;
  gap: 10px;
}

.user-row {
  justify-content: flex-end;
}

.ai-row {
  justify-content: flex-start;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-avatar {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #ffffff;
}

.ai-avatar {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #ffffff;
  font-size: 16px;
}

.user-bubble {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #ffffff;
  padding: 10px 14px;
  border-radius: 12px 2px 12px 12px;
  max-width: 80%;
  font-size: 14px;
  line-height: 1.5;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
}

.ai-bubble-box {
  background: #ffffff;
  border-radius: 2px 12px 12px 12px;
  padding: 12px 14px;
  max-width: 85%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.bubble-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.ai-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.authority-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #059669;
  background: #ecfdf5;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.bubble-content {
  font-size: 13px;
  color: #334155;
  line-height: 1.6;
  white-space: pre-wrap;
}

.preview-footer-info {
  border-top: 1px dashed #e2e8f0;
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
}

.preview-footer-info .label {
  font-weight: 600;
  color: #475569;
}

/* ================= 模拟器抽屉与透视窗 ================= */
.simulator-layout {
  display: flex;
  height: calc(100vh - 110px);
  gap: 16px;
}

.simulator-phone-panel {
  flex: 1.1;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.simulator-identity-bar {
  padding: 12px 14px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.simulator-identity-bar .bar-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.simulator-messages-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sim-msg-row {
  display: flex;
  gap: 10px;
}

.sim-msg-row.user {
  flex-direction: row-reverse;
}

.sim-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.sim-avatar.user {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #ffffff;
}

.sim-avatar.assistant {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #ffffff;
}

.sim-bubble-wrap {
  display: flex;
  flex-direction: column;
  max-width: 82%;
}

.sim-msg-row.user .sim-bubble-wrap {
  align-items: flex-end;
}

.sim-source-tag {
  margin-bottom: 4px;
}

.sim-tool-call-banner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fef3c7;
  border: 1px solid #fde68a;
  color: #92400e;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  margin-bottom: 6px;
}

.sim-tool-call-banner .tool-cost {
  background: #fef9c3;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 11px;
}

.sim-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.sim-bubble.user {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #ffffff;
  border-top-right-radius: 2px;
}

.sim-bubble.assistant {
  background: #ffffff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  border-top-left-radius: 2px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.sim-time {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 3px;
}

.sim-quick-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.sim-quick-chips .chips-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.quick-chip {
  cursor: pointer;
  transition: transform 0.15s;
}

.quick-chip:hover {
  transform: translateY(-1px);
}

.sim-input-area {
  padding: 10px 12px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sim-input-btns {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 透视窗 */
.simulator-inspector-panel {
  flex: 0.9;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.inspector-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 10px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.metric-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
}

.metric-card .m-label {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 4px;
}

.metric-card .m-value {
  font-size: 15px;
  font-weight: 700;
}

.font-sm {
  font-size: 12px !important;
}

.inspector-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sec-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.tool-trajectory-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
}

.traj-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.traj-label {
  color: #64748b;
  font-weight: 600;
}

.traj-val {
  color: #0f172a;
}

.json-code {
  background: #0f172a;
  color: #38bdf8;
  padding: 8px 10px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 11px;
  max-height: 160px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.fact-json {
  color: #4ade80;
}

.idor-box {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.idor-box .sec-title {
  color: #166534;
}

.idor-content {
  font-size: 12px;
  line-height: 1.5;
  color: #15803d;
}
</style>
