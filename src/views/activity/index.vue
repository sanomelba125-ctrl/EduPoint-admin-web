<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search, Grid, Edit, Delete, Location } from '@element-plus/icons-vue'
import QrcodeVue from 'qrcode.vue'
import {
  getActivityPage,
  archiveActivity,
  getActivityQrCode,
  type ActivityVO,
  type ActivityPageQuery,
  type QrCodeVO
} from '@/api/activity'

const router = useRouter()

// ──────── 筛选参数 ────────
const query = reactive<ActivityPageQuery>({
  page: 1,
  size: 10,
  keyword: '',
  status: '',
  category: ''
})

// ──────── 状态数据 ────────
const loading = ref(false)
const tableData = ref<ActivityVO[]>([])
const total = ref(0)
const activeCategory = ref('ALL')

// ──────── 二维码弹窗状态 ────────
const qrDialogVisible = ref(false)
const qrLoading = ref(false)
const qrData = ref<QrCodeVO | null>(null)
const qrActivity = ref<ActivityVO | null>(null)
let qrCountdown = ref(0)
let qrTimer: ReturnType<typeof setInterval> | null = null

// ──────── 分类配置 ────────
const categories = [
  { key: 'ALL', label: '全部活动' },
  { key: 'ACADEMIC', label: '学术科技' },
  { key: 'VOLUNTEER', label: '志愿公益' },
  { key: 'SPORTS', label: '体育竞技' },
  { key: 'PRACTICE', label: '实践文娱' },
  { key: 'OTHER', label: '其他拓展' }
]

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 0, label: '未开始' },
  { value: 1, label: '进行中' },
  { value: 2, label: '已截止' },
  { value: 3, label: '已关闭' }
]

// ──────── 生命周期 ────────
onMounted(() => {
  loadData()
})

onUnmounted(stopQrTimer)

// ──────── 数据加载 ────────
async function loadData() {
  loading.value = true
  try {
    const params: ActivityPageQuery = {
      ...query,
      category: activeCategory.value === 'ALL' ? undefined : activeCategory.value,
      status: query.status === '' ? undefined : Number(query.status)
    }
    const res = await getActivityPage(params)
    tableData.value = res.records
    total.value = res.total
  } catch {
    // 错误已由拦截器处理
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadData()
}

function handleReset() {
  query.keyword = ''
  query.status = ''
  activeCategory.value = 'ALL'
  query.page = 1
  loadData()
}

function switchCategory(cat: string) {
  activeCategory.value = cat
  query.page = 1
  loadData()
}

function handlePageChange(page: number) {
  query.page = page
  loadData()
}

function handleSizeChange(size: number) {
  query.size = size
  query.page = 1
  loadData()
}

// ──────── 跳转编辑 ────────
function toCreate() {
  router.push('/activity/edit')
}

function toEdit(row: ActivityVO) {
  router.push(`/activity/edit?id=${row.id}`)
}

// ──────── 归档/删除 ────────
async function handleArchive(row: ActivityVO) {
  try {
    await ElMessageBox.confirm(
      `确认将活动【${row.title}】归档/下线？若已有报名记录将转为归档状态，不可恢复。`,
      '归档确认',
      { type: 'warning', confirmButtonText: '确认归档', cancelButtonText: '取消' }
    )
    await archiveActivity(row.id)
    ElMessage.success('活动已归档')
    loadData()
  } catch {
    // 取消操作
  }
}

// ──────── 二维码签到 ────────
async function openQrDialog(row: ActivityVO) {
  if (row.status === 3) {
    ElMessage.warning('已归档活动不能生成签到码')
    return
  }
  qrActivity.value = row
  qrDialogVisible.value = true
  await refreshQrCode(row.id)
}

async function refreshQrCode(id: number) {
  qrLoading.value = true
  stopQrTimer()
  qrData.value = null
  try {
    const res = await getActivityQrCode(id)
    qrData.value = res
    startQrCountdown(res.validSeconds)
  } catch {
    // 错误已处理
  } finally {
    qrLoading.value = false
  }
}

function startQrCountdown(seconds: number) {
  qrCountdown.value = seconds
  qrTimer = setInterval(() => {
    qrCountdown.value--
    if (qrCountdown.value <= 0) {
      stopQrTimer()
      // 自动刷新
      if (qrActivity.value) refreshQrCode(qrActivity.value.id)
    }
  }, 1000)
}

function stopQrTimer() {
  if (qrTimer) {
    clearInterval(qrTimer)
    qrTimer = null
  }
}

function closeQrDialog() {
  stopQrTimer()
  qrDialogVisible.value = false
  qrData.value = null
}

// ──────── 辅助显示 ────────
const categoryMap: Record<string, string> = {
  ACADEMIC: '学术科技',
  VOLUNTEER: '志愿公益',
  SPORTS: '体育竞技',
  PRACTICE: '实践文娱',
  OTHER: '其他拓展'
}

function getCategoryLabel(cat?: string) {
  return cat ? (categoryMap[cat] || cat) : '-'
}

function getCategoryTagType(cat?: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    ACADEMIC: 'primary',
    VOLUNTEER: 'success',
    SPORTS: 'warning',
    PRACTICE: 'danger',
    OTHER: 'info'
  }
  return cat ? (map[cat] || 'info') : 'info'
}

function getStatusLabel(status: number) {
  const map: Record<number, string> = { 0: '未开始', 1: '进行中', 2: '已截止', 3: '已关闭' }
  return map[status] ?? '未知'
}

function getStatusType(status: number): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<number, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    0: 'primary',
    1: 'success',
    2: 'info',
    3: 'danger'
  }
  return map[status] ?? 'info'
}

function getEnrollRate(row: ActivityVO) {
  if (!row.registrationLimit || row.registrationLimit === 0) return 0
  return Math.min(100, Math.round(((row.participantCount ?? 0) / row.registrationLimit) * 100))
}

function getProgressStatus(row: ActivityVO): '' | 'success' | 'exception' | 'warning' {
  const rate = getEnrollRate(row)
  if (rate >= 100) return 'exception'
  if (rate >= 80) return 'warning'
  return ''
}

// 二维码倒计时颜色
const countdownColor = computed(() => {
  if (qrCountdown.value <= 5) return '#f56c6c'
  if (qrCountdown.value <= 10) return '#e6a23c'
  return '#67c23a'
})
</script>

<template>
  <div class="activity-page">
    <!-- 分类 Tabs -->
    <el-card shadow="never" class="tab-card" :body-style="{ padding: '0' }">
      <div class="category-tabs">
        <div
          v-for="cat in categories"
          :key="cat.key"
          class="cat-tab"
          :class="{ 'is-active': activeCategory === cat.key }"
          @click="switchCategory(cat.key)"
        >
          {{ cat.label }}
        </div>
      </div>
    </el-card>

    <!-- 筛选栏 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="活动名称">
          <el-input
            v-model="query.keyword"
            placeholder="输入活动标题关键词..."
            clearable
            style="width: 260px;"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="活动状态">
          <el-select v-model="query.status" placeholder="全部状态" style="width: 140px;" clearable>
            <el-option
              v-for="opt in statusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button :icon="Search" type="primary" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
        <el-form-item style="margin-left: auto;">
          <el-button type="primary" :icon="Plus" @click="toCreate">发布新活动</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        style="width: 100%;"
        row-key="id"
      >
        <el-table-column label="编号" width="70" align="center">
          <template #default="{ row }">
            <span class="id-text">#{{ String(row.id).padStart(3, '0') }}</span>
          </template>
        </el-table-column>

        <el-table-column label="活动名称" min-width="200">
          <template #default="{ row }">
            <div class="activity-title">{{ row.title }}</div>
            <div v-if="row.locationName" class="activity-location">
              <el-icon :size="12"><Location /></el-icon>
              {{ row.locationName }}
            </div>
          </template>
        </el-table-column>

        <el-table-column label="业务分类" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="getCategoryTagType(row.category)" size="small">
              {{ getCategoryLabel(row.category) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="起止时间" width="210">
          <template #default="{ row }">
            <div class="time-text">{{ row.startTime }}</div>
            <div class="time-text secondary">→ {{ row.endTime }}</div>
          </template>
        </el-table-column>

        <el-table-column label="奖励积分" width="100" align="right">
          <template #default="{ row }">
            <span class="points-text">+{{ row.points }} pts</span>
          </template>
        </el-table-column>

        <el-table-column label="报名 / 容量" width="160">
          <template #default="{ row }">
            <div class="enroll-info">
              <span>{{ row.participantCount ?? 0 }} / {{ row.registrationLimit ?? '不限' }} 人</span>
            </div>
            <el-progress
              v-if="row.registrationLimit"
              :percentage="getEnrollRate(row)"
              :status="getProgressStatus(row)"
              :stroke-width="4"
              :show-text="false"
              style="margin-top: 4px;"
            />
          </template>
        </el-table-column>

        <el-table-column label="活动状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="防伪证书" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.certificateEnabled" type="warning" size="small">颁发</el-tag>
            <span v-else class="text-disabled">-</span>
          </template>
        </el-table-column>

        <el-table-column label="管理操作" width="200" align="right" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              :icon="Grid"
              :disabled="row.status === 3"
              @click="openQrDialog(row)"
            >动态签到码</el-button>
            <el-button link type="primary" size="small" :icon="Edit" @click="toEdit(row)">编辑</el-button>
            <el-button
              link
              type="danger"
              size="small"
              :icon="Delete"
              :disabled="row.status === 3"
              @click="handleArchive(row)"
            >归档</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.size"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 动态签到二维码弹窗 -->
    <el-dialog
      v-model="qrDialogVisible"
      :title="`${qrActivity?.title ?? ''} · 现场签到大屏`"
      width="480px"
      :before-close="closeQrDialog"
      align-center
    >
      <div v-loading="qrLoading" class="qr-box">
        <p class="qr-tip">请将此画面投屏至报告厅大屏幕，学生使用手机端扫码并校验现场 GPS 定位</p>

        <div v-if="qrData" class="qr-canvas-wrap">
          <QrcodeVue
            :value="qrData.qrContent"
            :size="220"
            level="H"
            render-as="canvas"
            background="#ffffff"
            foreground="#111827"
          />
        </div>

        <div v-if="qrData" class="qr-meta">
          <div class="nonce-box">
            <span class="nonce-label">动态凭证 NONCE：</span>
            <code class="nonce-code">{{ qrData.nonce }}</code>
          </div>
          <div class="countdown-row">
            <span>动态凭证防刷，每 {{ qrData.validSeconds }} 秒自动刷新</span>
            <span>剩余
              <strong :style="{ color: countdownColor }">{{ qrCountdown }}</strong>
              秒
            </span>
          </div>
          <div class="expire-info">
            有效截止：{{ qrData.expireTime }}
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="closeQrDialog">关闭</el-button>
        <el-button
          type="primary"
          :loading="qrLoading"
          @click="qrActivity && refreshQrCode(qrActivity.id)"
        >立即刷新 Nonce</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.activity-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 分类 Tabs */
.tab-card {
  border-radius: 8px;
}
.category-tabs {
  display: flex;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 0 16px;
}
.cat-tab {
  padding: 12px 16px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;
  font-weight: 500;
  user-select: none;
}
.cat-tab:hover {
  color: var(--el-color-primary);
}
.cat-tab.is-active {
  color: var(--el-color-primary);
  border-bottom-color: var(--el-color-primary);
}

/* 筛选栏 */
.filter-card :deep(.el-card__body) {
  padding: 14px 16px;
}
.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0;
  width: 100%;
}
.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 12px;
}
.filter-form :deep(.el-form-item:last-child) {
  margin-left: auto;
  margin-right: 0;
}

/* 表格 */
.table-card :deep(.el-card__body) {
  padding: 0;
}
.id-text {
  color: var(--el-text-color-secondary);
  font-family: monospace;
  font-size: 12px;
}
.activity-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}
.activity-location {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 3px;
}
.time-text {
  font-size: 12px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}
.time-text.secondary {
  color: var(--el-text-color-secondary);
}
.points-text {
  font-weight: 700;
  color: var(--el-color-warning);
}
.enroll-info {
  font-size: 12px;
  color: var(--el-text-color-regular);
}
.text-disabled {
  color: var(--el-text-color-disabled);
}

/* 分页 */
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 14px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

/* 二维码弹窗 */
.qr-box {
  text-align: center;
  min-height: 180px;
}
.qr-tip {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 16px;
  line-height: 1.6;
}
.qr-canvas-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}
.qr-canvas-wrap :deep(canvas) {
  box-sizing: content-box;
  padding: 12px;
  background: #fff;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}
.qr-meta {
  background: var(--el-fill-color-light);
  border-radius: 6px;
  padding: 12px 16px;
  text-align: left;
}
.nonce-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.nonce-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.nonce-code {
  font-family: monospace;
  font-size: 13px;
  color: var(--el-color-primary);
  background: #fff;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--el-color-primary-light-8);
  word-break: break-all;
}
.countdown-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}
.expire-info {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
</style>
