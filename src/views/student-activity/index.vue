<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search,
  RefreshRight,
  Refresh,
  Checked,
  Calendar,
  Timer,
  Close,
  Location,
  User,
  Ticket,
  View
} from '@element-plus/icons-vue'
import {
  getActivityRecordList,
  type StudentActivityRecordVO,
  type ActivityRecordQuery
} from '@/api/activity'

// 列表与加载状态
const loading = ref(false)
const recordList = ref<StudentActivityRecordVO[]>([])
const total = ref(0)

// 详情弹窗与抽屉
const detailDialogVisible = ref(false)
const currentRecord = ref<StudentActivityRecordVO | null>(null)

// 检索过滤条件
const queryParams = reactive<ActivityRecordQuery>({
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
  { label: '已出勤/已发分', value: 2 },
  { label: '已取消/已失效', value: 3 }
]

// 统计指标计算
const stats = computed(() => {
  const list = recordList.value
  return {
    total: total.value,
    enrolled: list.filter(r => r.status === 1).length,
    completed: list.filter(r => r.status === 2).length,
    cancelled: list.filter(r => r.status === 3).length
  }
})

// 格式化时间
function formatTime(val?: string) {
  if (!val) return '-'
  return val.replace('T', ' ').substring(0, 19)
}

// 状态文本与样式
function statusLabel(status?: number) {
  switch (status) {
    case 1:
      return '已报名·待打卡'
    case 2:
      return '已出勤·已发分'
    case 3:
      return '已取消/已失效'
    default:
      return '未知状态'
  }
}

function statusTagType(status?: number): '' | 'success' | 'warning' | 'info' | 'danger' {
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

// 加载数据
async function fetchRecords() {
  loading.value = true
  try {
    const params: ActivityRecordQuery = {
      page: queryParams.page,
      size: queryParams.size,
      studentName: queryParams.studentName?.trim() || undefined,
      studentNo: queryParams.studentNo?.trim() || undefined,
      activityTitle: queryParams.activityTitle?.trim() || undefined,
      status: queryParams.status !== '' ? Number(queryParams.status) : undefined
    }
    const res = await getActivityRecordList(params)
    recordList.value = res.records || []
    total.value = res.total || 0
  } catch (err: any) {
    ElMessage.error(err.message || '获取活动记录失败')
  } finally {
    loading.value = false
  }
}

// 快捷标签切换
function handleTabChange(val: string | number) {
  queryParams.status = val
  queryParams.page = 1
  fetchRecords()
}

// 查询与重置
function handleSearch() {
  queryParams.page = 1
  fetchRecords()
}

function handleReset() {
  queryParams.studentName = ''
  queryParams.studentNo = ''
  queryParams.activityTitle = ''
  queryParams.status = ''
  queryParams.page = 1
  fetchRecords()
}

// 查看详情
function openDetail(row: StudentActivityRecordVO) {
  currentRecord.value = row
  detailDialogVisible.value = true
}

function handleSizeChange(size: number) {
  queryParams.size = size
  queryParams.page = 1
  fetchRecords()
}

function handlePageChange(page: number) {
  queryParams.page = page
  fetchRecords()
}

onMounted(() => {
  fetchRecords()
})
</script>

<template>
  <div class="student-activity-container">
    <!-- 顶部统计指标卡 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon-wrap icon-blue">
          <el-icon :size="24"><Calendar /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-label">总参与记录</span>
          <span class="stat-value text-blue">{{ stats.total }} <small>条</small></span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrap icon-green">
          <el-icon :size="24"><Checked /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-label">已出勤·已发分</span>
          <span class="stat-value text-green">{{ stats.completed }} <small>人次</small></span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrap icon-orange">
          <el-icon :size="24"><Timer /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-label">已报名·待打卡</span>
          <span class="stat-value text-orange">{{ stats.enrolled }} <small>人次</small></span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrap icon-gray">
          <el-icon :size="24"><Close /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-label">已取消 / 失效</span>
          <span class="stat-value text-muted">{{ stats.cancelled }} <small>条</small></span>
        </div>
      </div>
    </div>

    <!-- 筛选面板 -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-header">
        <div class="filter-tabs">
          <span
            v-for="tab in statusTabs"
            :key="tab.value"
            class="filter-tab-item"
            :class="{ active: queryParams.status === tab.value }"
            @click="handleTabChange(tab.value)"
          >
            {{ tab.label }}
          </span>
        </div>
        <el-button link type="primary" :icon="Refresh" @click="fetchRecords">刷新数据</el-button>
      </div>

      <el-form :model="queryParams" inline class="filter-form">
        <el-form-item label="学号">
          <el-input
            v-model="queryParams.studentNo"
            placeholder="按学号检索"
            clearable
            style="width: 150px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="学生姓名">
          <el-input
            v-model="queryParams.studentName"
            placeholder="按姓名检索"
            clearable
            style="width: 140px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="活动名称">
          <el-input
            v-model="queryParams.activityTitle"
            placeholder="活动标题关键字"
            clearable
            style="width: 180px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="参与状态">
          <el-select
            v-model="queryParams.status"
            placeholder="全部状态"
            clearable
            style="width: 140px"
          >
            <el-option
              v-for="opt in statusTabs"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item class="actions-item">
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="RefreshRight" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 主数据表格 -->
    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="loading"
        :data="recordList"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column prop="id" label="记录ID" width="85" align="center" />

        <el-table-column prop="studentNo" label="学号" width="130">
          <template #default="{ row }">
            <span class="mono-code">{{ row.studentNo || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="studentName" label="学生姓名" width="120">
          <template #default="{ row }">
            <span class="student-name-text">{{ row.studentName || '匿名学生' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="activityTitle" label="参与活动名称" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="activity-title-link">{{ row.activityTitle || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="参与状态" width="130" align="center">
          <template #default="{ row }">
            <el-tag
              v-if="row.status === 2"
              type="success"
              effect="light"
              round
            >
              已出勤·已发分
            </el-tag>
            <el-tag
              v-else-if="row.status === 1"
              type="warning"
              effect="light"
              round
            >
              已报名·待打卡
            </el-tag>
            <el-tag
              v-else-if="row.status === 3"
              type="info"
              effect="light"
              round
            >
              已取消 / 失效
            </el-tag>
            <el-tag v-else type="info" round>未知状态</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="pointsAwarded" label="发放学分" width="105" align="center">
          <template #default="{ row }">
            <span v-if="row.status === 2 && row.pointsAwarded > 0" class="points-awarded-text">
              +{{ row.pointsAwarded }} 分
            </span>
            <span v-else class="text-muted">0 分</span>
          </template>
        </el-table-column>

        <el-table-column prop="signupTime" label="报名时间" width="165" align="center">
          <template #default="{ row }">
            <span class="time-text">{{ formatTime(row.signupTime) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="checkinTime" label="打卡签到时间" width="165" align="center">
          <template #default="{ row }">
            <span v-if="row.checkinTime" class="time-text text-success">
              {{ formatTime(row.checkinTime) }}
            </span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>

        <el-table-column label="打卡距离/位置" width="150" align="center">
          <template #default="{ row }">
            <div v-if="row.status === 2 && row.checkinDistance !== undefined && row.checkinDistance !== null">
              <el-tooltip
                :content="`打卡坐标: (${row.checkinLatitude || '-'}, ${row.checkinLongitude || '-'})`"
                placement="top"
              >
                <el-tag size="small" type="success" effect="plain">
                  <el-icon><Location /></el-icon> {{ row.checkinDistance }} 米 (正常)
                </el-tag>
              </el-tooltip>
            </div>
            <span v-else-if="row.status === 2" class="text-muted">现场扫码</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              :icon="View"
              @click="openDetail(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页区域 -->
      <div class="pagination-box">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.size"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 记录详情模态框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="学生活动参与考勤详情"
      width="540px"
      destroy-on-close
    >
      <div v-if="currentRecord" class="detail-container">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="记录 ID">
            <code>#{{ currentRecord.id }}</code>
          </el-descriptions-item>

          <el-descriptions-item label="获奖/参与学生">
            <div class="desc-user-block">
              <span class="font-bold">{{ currentRecord.studentName || '学生' }}</span>
              <span class="mono-code" style="margin-left: 8px;">{{ currentRecord.studentNo }}</span>
            </div>
          </el-descriptions-item>

          <el-descriptions-item label="活动项目">
            <span class="font-bold">{{ currentRecord.activityTitle }}</span>
          </el-descriptions-item>

          <el-descriptions-item label="当前状态">
            <el-tag :type="statusTagType(currentRecord.status)" size="small">
              {{ statusLabel(currentRecord.status) }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="发放学分奖励">
            <span class="points-awarded-text">{{ currentRecord.pointsAwarded || 0 }} 积分</span>
          </el-descriptions-item>

          <el-descriptions-item label="报名时间">
            {{ formatTime(currentRecord.signupTime) }}
          </el-descriptions-item>

          <el-descriptions-item label="打卡签到时间">
            <span :class="{ 'text-success': currentRecord.checkinTime }">
              {{ formatTime(currentRecord.checkinTime) }}
            </span>
          </el-descriptions-item>

          <el-descriptions-item label="打卡核验距离">
            <span v-if="currentRecord.checkinDistance !== undefined && currentRecord.checkinDistance !== null">
              {{ currentRecord.checkinDistance }} 米
            </span>
            <span v-else class="text-muted">未记录距离</span>
          </el-descriptions-item>

          <el-descriptions-item label="动态防作弊 Nonce">
            <code class="text-muted" style="font-size: 11px;">
              {{ currentRecord.qrNonceUsed || '非动态二维码打卡' }}
            </code>
          </el-descriptions-item>

          <el-descriptions-item v-if="currentRecord.remark" label="审核备注">
            {{ currentRecord.remark }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.student-activity-container {
  padding: 16px;
  background-color: #f8fafc;
  min-height: calc(100vh - 84px);
}

/* 统计卡片区 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

@media (max-width: 992px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.stat-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-blue { background: #eff6ff; color: #2563eb; }
.icon-green { background: #f0fdf4; color: #16a34a; }
.icon-orange { background: #fffbeb; color: #d97706; }
.icon-gray { background: #f1f5f9; color: #64748b; }

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
}

.stat-value small {
  font-size: 12px;
  font-weight: normal;
}

.text-blue { color: #1d4ed8; }
.text-green { color: #059669; }
.text-orange { color: #d97706; }
.text-muted { color: #94a3b8; }

/* 筛选面板 */
.filter-card {
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.filter-tab-item {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 4px;
  color: #64748b;
  cursor: pointer;
  background: #f1f5f9;
  transition: all 0.2s;
}

.filter-tab-item:hover {
  background: #e2e8f0;
}

.filter-tab-item.active {
  background: #2563eb;
  color: #ffffff;
  font-weight: 600;
}

.filter-form {
  margin-bottom: -18px;
}

.actions-item {
  margin-left: auto;
}

/* 表格区域 */
.table-card {
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.mono-code {
  font-family: Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  color: #2563eb;
  background-color: #eff6ff;
  padding: 2px 6px;
  border-radius: 4px;
}

.student-name-text {
  font-weight: 600;
  color: #1e293b;
}

.activity-title-link {
  font-weight: 500;
  color: #1e293b;
}

.points-awarded-text {
  color: #d97706;
  font-weight: bold;
  font-size: 13px;
}

.time-text {
  font-size: 12px;
  color: #475569;
}

.text-success {
  color: #16a34a;
  font-weight: 500;
}

.pagination-box {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

.font-bold {
  font-weight: 600;
}
</style>
