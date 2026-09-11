<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search,
  Refresh,
  Document,
  Check,
  Clock,
  Close,
  Location,
  User,
  Ticket,
  View
} from '@element-plus/icons-vue'
import { getActivityRecords, type ActivityRecordQuery, type ActivityRecordVO } from '@/api/activity'

// 表格加载状态与数据源
const loading = ref(false)
const checkinRecords = ref<ActivityRecordVO[]>([])
const total = ref(0)

// 详情抽屉控制
const drawerVisible = ref(false)
const currentDetail = ref<ActivityRecordVO | null>(null)

// 查询表单参数（严格对齐 GET /activity/record/list 参数规范）
const query = reactive<ActivityRecordQuery>({
  page: 1,
  size: 10,
  studentName: '',
  studentNo: '',
  activityTitle: '',
  status: ''
})

// 状态筛选项
const statusTabs = [
  { label: '全部记录', value: '' },
  { label: '已报名/待打卡', value: 1 },
  { label: '已完成打卡', value: 2 },
  { label: '已取消/已失效', value: 3 }
]

const statusSelectOptions = [
  { label: '全部状态', value: '' },
  { label: '已报名/待打卡', value: 1 },
  { label: '已完成/打卡成功', value: 2 },
  { label: '未完成/已失效', value: 3 }
]

// 统计指标计算（基于当前加载数据集或总数）
const stats = computed(() => {
  const list = checkinRecords.value
  return {
    total: total.value,
    enrolled: list.filter(r => r.status === 1).length,
    completed: list.filter(r => r.status === 2).length,
    cancelled: list.filter(r => r.status === 3).length
  }
})

/** 获取学生活动全量记录 */
async function loadRecords() {
  loading.value = true
  try {
    const params: ActivityRecordQuery = {
      page: query.page,
      size: query.size,
      studentName: query.studentName?.trim() || undefined,
      studentNo: query.studentNo?.trim() || undefined,
      activityTitle: query.activityTitle?.trim() || undefined,
      status: query.status === '' ? undefined : Number(query.status)
    }
    const result = await getActivityRecords(params)
    checkinRecords.value = result?.records || []
    total.value = result?.total || 0
  } catch (err: any) {
    checkinRecords.value = []
    total.value = 0
    ElMessage.error(err.message || '获取学生活动管理记录失败')
  } finally {
    loading.value = false
  }
}

/** 查询 */
function handleSearch() {
  query.page = 1
  loadRecords()
}

/** 重置 */
function handleReset() {
  query.studentName = ''
  query.studentNo = ''
  query.activityTitle = ''
  query.status = ''
  query.page = 1
  loadRecords()
}

/** 快捷状态 Tab 切换 */
function handleTabChange(tabValue: number | string) {
  query.status = tabValue
  query.page = 1
  loadRecords()
}

/** 每页条数变更 */
function handleSizeChange(size: number) {
  query.size = size
  query.page = 1
  loadRecords()
}

/** 页码变更 */
function handlePageChange(page: number) {
  query.page = page
  loadRecords()
}

/** 打开详情抽屉 */
function handleViewDetail(row: ActivityRecordVO) {
  currentDetail.value = row
  drawerVisible.value = true
}

/** 状态文案 */
function statusLabel(status?: number) {
  switch (status) {
    case 1:
      return '已报名/待打卡'
    case 2:
      return '已完成/打卡成功'
    case 3:
      return '未完成/已失效'
    default:
      return '未知状态'
  }
}

/** 状态标签样式 */
function statusTagType(status?: number): 'warning' | 'success' | 'info' | 'danger' {
  switch (status) {
    case 1:
      return 'warning'
    case 2:
      return 'success'
    case 3:
      return 'info'
    default:
      return 'info'
  }
}

onMounted(loadRecords)
</script>

<template>
  <div class="student-activity-management">
    <!-- 顶部概览指标卡片 -->
    <el-row :gutter="16" class="stat-overview-row">
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-mini-card">
          <div class="stat-icon-wrapper icon-total">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">全校参与记录</div>
            <div class="stat-value">{{ total }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-mini-card">
          <div class="stat-icon-wrapper icon-pending">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">待打卡考勤</div>
            <div class="stat-value text-warning">{{ stats.enrolled }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-mini-card">
          <div class="stat-icon-wrapper icon-success">
            <el-icon><Check /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">打卡完成核验</div>
            <div class="stat-value text-success">{{ stats.completed }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-mini-card">
          <div class="stat-icon-wrapper icon-cancelled">
            <el-icon><Close /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">退报/已失效</div>
            <div class="stat-value text-muted">{{ stats.cancelled }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选过滤面板 -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-header-bar">
        <div class="filter-tabs">
          <div
            v-for="tab in statusTabs"
            :key="tab.value"
            class="filter-tab-item"
            :class="{ active: query.status === tab.value }"
            @click="handleTabChange(tab.value)"
          >
            {{ tab.label }}
          </div>
        </div>

        <div class="filter-actions-right">
          <el-button :icon="Refresh" circle title="刷新数据" @click="loadRecords" />
        </div>
      </div>

      <el-form :inline="true" class="filter-form">
        <el-form-item label="学生姓名">
          <el-input
            v-model="query.studentName"
            placeholder="输入姓名模糊搜索"
            clearable
            style="width: 170px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="学号">
          <el-input
            v-model="query.studentNo"
            placeholder="输入学号精准搜索"
            clearable
            style="width: 170px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="活动名称">
          <el-input
            v-model="query.activityTitle"
            placeholder="输入活动标题关键词"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="参与状态">
          <el-select
            v-model="query.status"
            placeholder="选择参与状态"
            clearable
            style="width: 160px"
            @change="handleSearch"
          >
            <el-option
              v-for="opt in statusSelectOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item class="form-btn-group">
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 主表格卡片 -->
    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="loading"
        :data="checkinRecords"
        stripe
        style="width: 100%"
        row-key="id"
        empty-text="暂无匹配的学生活动参与记录"
      >
        <el-table-column prop="id" label="记录ID" width="85" align="center" />

        <el-table-column label="学号 / 姓名" min-width="170">
          <template #default="{ row }">
            <div class="student-info-cell">
              <span class="student-no-text">{{ row.studentNo || '-' }}</span>
              <span class="student-name-text">{{ row.studentName || '未命名学生' }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="activityTitle" label="参与活动" min-width="210" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="activity-title-link">{{ row.activityTitle || `校园活动 #${row.activityId}` }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="考勤打卡状态" width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small" effect="light" class="status-badge-tag">
              <span class="status-dot" :class="`dot-${statusTagType(row.status)}`" />
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="pointsAwarded" label="发放学分" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 2" type="warning" size="small" effect="plain" class="points-tag">
              +{{ row.pointsAwarded || 0 }} pts
            </el-tag>
            <span v-else class="text-placeholder">-</span>
          </template>
        </el-table-column>

        <el-table-column prop="signupTime" label="报名时间" width="170" align="center" />

        <el-table-column prop="checkinTime" label="打卡完成时间" width="170" align="center">
          <template #default="{ row }">
            <span v-if="row.checkinTime" class="text-success">{{ row.checkinTime }}</span>
            <span v-else class="text-placeholder">尚未打卡</span>
          </template>
        </el-table-column>

        <el-table-column label="打卡距离" width="120" align="center">
          <template #default="{ row }">
            <span v-if="row.checkinDistance !== undefined && row.checkinDistance !== null" class="distance-badge">
              <el-icon><Location /></el-icon>
              {{ row.checkinDistance }}m
            </span>
            <span v-else class="text-placeholder">-</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              :icon="View"
              @click="handleViewDetail(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 底部分页栏 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 记录详情侧拉抽屉 (Drawer) -->
    <el-drawer
      v-model="drawerVisible"
      title="学生活动考勤记录详情"
      size="480px"
      direction="rtl"
      destroy-on-close
    >
      <div v-if="currentDetail" class="detail-drawer-content">
        <div class="drawer-header-summary">
          <div class="summary-status-badge">
            <el-tag :type="statusTagType(currentDetail.status)" size="default">
              {{ statusLabel(currentDetail.status) }}
            </el-tag>
          </div>
          <h3 class="summary-title">{{ currentDetail.activityTitle || '校园活动' }}</h3>
          <p class="summary-subtitle">记录流水 ID: #{{ currentDetail.id }}</p>
        </div>

        <el-descriptions title="学生身份档案" :column="1" border class="drawer-desc-block">
          <el-descriptions-item label="学生姓名">
            <div class="desc-with-icon">
              <el-icon><User /></el-icon>
              <span>{{ currentDetail.studentName || '-' }}</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="学号">
            <span class="code-badge">{{ currentDetail.studentNo || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="学生主键 ID">
            <span>{{ currentDetail.studentId || '-' }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <el-descriptions title="活动参与明细" :column="1" border class="drawer-desc-block">
          <el-descriptions-item label="关联活动 ID">
            <div class="desc-with-icon">
              <el-icon><Ticket /></el-icon>
              <span>#{{ currentDetail.activityId }}</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="报名创建时间">
            <span>{{ currentDetail.signupTime || currentDetail.createTime || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="出勤打卡时间">
            <span :class="currentDetail.checkinTime ? 'text-success font-bold' : 'text-muted'">
              {{ currentDetail.checkinTime || '尚未核验打卡' }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="实得奖励学分">
            <span class="points-highlight">
              +{{ currentDetail.pointsAwarded || 0 }} 积分
            </span>
          </el-descriptions-item>
        </el-descriptions>

        <el-descriptions title="考勤核验与防伪数据" :column="1" border class="drawer-desc-block">
          <el-descriptions-item label="GPS 测距偏差">
            <span v-if="currentDetail.checkinDistance !== undefined && currentDetail.checkinDistance !== null">
              距活动目标中心 <strong>{{ currentDetail.checkinDistance }}</strong> 米
            </span>
            <span v-else class="text-muted">无定位打卡数据</span>
          </el-descriptions-item>
          <el-descriptions-item label="打卡位置坐标">
            <span v-if="currentDetail.checkinLongitude && currentDetail.checkinLatitude">
              {{ currentDetail.checkinLongitude }}, {{ currentDetail.checkinLatitude }}
            </span>
            <span v-else class="text-muted">未记录地理坐标</span>
          </el-descriptions-item>
          <el-descriptions-item label="防伪随机 Nonce">
            <span class="code-mono">{{ currentDetail.qrNonceUsed || '非扫码或系统免核验' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="审核备注">
            <span>{{ currentDetail.remark || '正常出勤完成打卡，无异常标注。' }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.student-activity-management {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 顶部概览指标卡片 */
.stat-overview-row {
  margin-bottom: 0;
}

.stat-mini-card {
  border-radius: 12px;
  border: 1px solid #edf2f7;
  transition: all 0.2s ease;
}

.stat-mini-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.stat-mini-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.icon-total {
  background: #eff6ff;
  color: #3b82f6;
}

.icon-pending {
  background: #fffbeb;
  color: #f59e0b;
}

.icon-success {
  background: #ecfdf5;
  color: #10b981;
}

.icon-cancelled {
  background: #f1f5f9;
  color: #64748b;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.text-warning {
  color: #f59e0b;
}

.text-success {
  color: #10b981;
}

.text-muted {
  color: #94a3b8;
}

.text-placeholder {
  color: #cbd5e1;
}

.font-bold {
  font-weight: 600;
}

/* 筛选过滤卡片 */
.filter-card {
  border-radius: 12px;
  border: 1px solid #edf2f7;
}

.filter-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.filter-tab-item {
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
  background: #f8fafc;
  transition: all 0.2s ease;
  font-weight: 500;
}

.filter-tab-item:hover {
  color: #3b82f6;
  background: #eff6ff;
}

.filter-tab-item.active {
  color: #ffffff;
  background: #2563eb;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 0;
}

.form-btn-group {
  margin-left: auto;
}

/* 主数据表格 */
.table-card {
  border-radius: 12px;
  border: 1px solid #edf2f7;
}

.table-card :deep(.el-card__body) {
  padding: 0;
}

.student-info-cell {
  display: flex;
  flex-direction: column;
}

.student-no-text {
  font-size: 13px;
  font-family: monospace;
  font-weight: 600;
  color: #1e293b;
}

.student-name-text {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.activity-title-link {
  font-weight: 500;
  color: #1e293b;
}

.status-badge-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  font-weight: 500;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.dot-success {
  background-color: #10b981;
}

.dot-warning {
  background-color: #f59e0b;
}

.dot-info {
  background-color: #94a3b8;
}

.points-tag {
  font-weight: 600;
  font-family: monospace;
}

.distance-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #475569;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid #f1f5f9;
}

/* 详情抽屉 */
.detail-drawer-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.drawer-header-summary {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.summary-title {
  margin: 8px 0 4px;
  font-size: 17px;
  color: #0f172a;
  line-height: 1.4;
}

.summary-subtitle {
  margin: 0;
  font-size: 12px;
  color: #64748b;
  font-family: monospace;
}

.drawer-desc-block {
  margin-top: 8px;
}

.desc-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.code-badge {
  font-family: monospace;
  font-weight: 600;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}

.code-mono {
  font-family: monospace;
  font-size: 12px;
  color: #475569;
}

.points-highlight {
  font-size: 14px;
  font-weight: 700;
  color: #d97706;
}
</style>
