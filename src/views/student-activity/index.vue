<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search,
  RefreshRight,
  Refresh,
  Download,
  Checked,
  Calendar,
  Timer,
  Close,
  Location,
  InfoFilled,
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

// 详情弹窗
const detailDialogVisible = ref(false)
const currentRecord = ref<StudentActivityRecordVO | null>(null)

// 检索过滤条件
const queryParams = reactive<ActivityRecordQuery>({
  page: 1,
  size: 10,
  studentName: '',
  studentNo: '',
  activityTitle: '',
  status: undefined
})

// 统计指标计算（基于当前加载页及统计概况）
const stats = computed(() => {
  let completed = 0
  let pending = 0
  let cancelled = 0
  let pointsTotal = 0

  recordList.value.forEach((r) => {
    if (r.status === 2) {
      completed++
      pointsTotal += r.pointsAwarded || 0
    } else if (r.status === 1) {
      pending++
    } else if (r.status === 3) {
      cancelled++
    }
  })

  return {
    totalRecords: total.value,
    completedCount: completed,
    pendingCount: pending,
    cancelledCount: cancelled,
    pointsDistributed: pointsTotal
  }
})

// 异步拉取后端学生活动打卡/参与记录
const fetchRecords = async () => {
  loading.value = true
  try {
    const params: ActivityRecordQuery = {
      page: queryParams.page,
      size: queryParams.size,
      studentName: queryParams.studentName?.trim() || undefined,
      studentNo: queryParams.studentNo?.trim() || undefined,
      activityTitle: queryParams.activityTitle?.trim() || undefined,
      status: queryParams.status !== undefined && queryParams.status !== ('' as any) ? Number(queryParams.status) : undefined
    }

    const res: any = await getActivityRecordList(params)
    if (res && res.records) {
      recordList.value = res.records
      total.value = res.total || 0
    } else if (Array.isArray(res)) {
      recordList.value = res
      total.value = res.length
    } else {
      recordList.value = []
      total.value = 0
    }
  } catch (err: any) {
    ElMessage.error(err.message || '获取学生活动记录失败')
  } finally {
    loading.value = false
  }
}

// 搜索操作
const handleSearch = () => {
  queryParams.page = 1
  fetchRecords()
}

// 重置查询条件
const handleReset = () => {
  queryParams.studentName = ''
  queryParams.studentNo = ''
  queryParams.activityTitle = ''
  queryParams.status = undefined
  queryParams.page = 1
  fetchRecords()
}

// 分页变更
const handlePageChange = (val: number) => {
  queryParams.page = val
  fetchRecords()
}

const handleSizeChange = (val: number) => {
  queryParams.size = val
  queryParams.page = 1
  fetchRecords()
}

// 打开记录详情
const openDetail = (row: StudentActivityRecordVO) => {
  currentRecord.value = row
  detailDialogVisible.value = true
}

// 导出 Excel 报表
const handleExport = () => {
  const token = localStorage.getItem('admin_token') || ''
  const params = new URLSearchParams()
  if (queryParams.studentName?.trim()) params.append('studentName', queryParams.studentName.trim())
  if (queryParams.studentNo?.trim()) params.append('studentNo', queryParams.studentNo.trim())
  if (queryParams.activityTitle?.trim()) params.append('activityTitle', queryParams.activityTitle.trim())
  if (queryParams.status !== undefined && queryParams.status !== ('' as any)) {
    params.append('status', String(queryParams.status))
  }
  if (token) {
    params.append('satoken', token)
  }
  const exportUrl = `/api/admin/export/activity-records?${params.toString()}`
  window.open(exportUrl, '_blank')
}

// 格式化时间
const formatTime = (timeStr?: string) => {
  if (!timeStr) return '-'
  return timeStr.replace('T', ' ').substring(0, 19)
}

onMounted(() => {
  fetchRecords()
})
</script>

<template>
  <div class="activity-records-page">
    <!-- 顶部 KPI 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon-wrapper bg-blue">
              <el-icon :size="24"><Calendar /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">全校报名参与人次</div>
              <div class="stat-value text-blue">{{ stats.totalRecords }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="12" :sm="6" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon-wrapper bg-green">
              <el-icon :size="24"><Checked /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">已出勤打卡人数</div>
              <div class="stat-value text-green">{{ stats.completedCount }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="12" :sm="6" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon-wrapper bg-orange">
              <el-icon :size="24"><Timer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">待打卡履约人次</div>
              <div class="stat-value text-orange">{{ stats.pendingCount }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="12" :sm="6" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon-wrapper bg-purple">
              <el-icon :size="24"><Close /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">取消 / 未履约失效</div>
              <div class="stat-value text-purple">{{ stats.cancelledCount }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选工具栏 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="queryParams" class="filter-form">
        <el-form-item label="学生学号">
          <el-input
            v-model="queryParams.studentNo"
            placeholder="精确检索学号"
            clearable
            style="width: 150px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="学生姓名">
          <el-input
            v-model="queryParams.studentName"
            placeholder="输入姓名"
            clearable
            style="width: 140px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="参与活动">
          <el-input
            v-model="queryParams.activityTitle"
            placeholder="活动标题模糊匹配"
            clearable
            style="width: 180px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="打卡状态">
          <el-select
            v-model="queryParams.status"
            placeholder="全部状态"
            clearable
            style="width: 150px"
            @change="handleSearch"
          >
            <el-option label="全部状态" :value="undefined" />
            <el-option label="已报名·待打卡" :value="1" />
            <el-option label="已出勤·已发分" :value="2" />
            <el-option label="已取消/失效" :value="3" />
          </el-select>
        </el-form-item>

        <el-form-item class="actions-item">
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="RefreshRight" @click="handleReset">重置</el-button>
          <el-button :icon="Refresh" @click="fetchRecords">刷新</el-button>
          <el-button type="success" plain :icon="Download" @click="handleExport">导出报表</el-button>
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

    <!-- 详情抽屉/弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="学生活动打卡参与详细信息"
      width="640px"
      destroy-on-close
    >
      <div v-if="currentRecord" class="detail-container">
        <el-descriptions :column="2" border size="default">
          <el-descriptions-item label="参与记录编号">
            <span class="mono-code">#{{ currentRecord.id }}</span>
          </el-descriptions-item>

          <el-descriptions-item label="参与活动名称" :span="2">
            <span style="font-weight: 600; color: #303133;">{{ currentRecord.activityTitle }}</span>
            <span class="text-muted" style="margin-left: 8px;">(ID: {{ currentRecord.activityId }})</span>
          </el-descriptions-item>

          <el-descriptions-item label="学生学号">
            <span class="mono-code">{{ currentRecord.studentNo }}</span>
          </el-descriptions-item>

          <el-descriptions-item label="学生姓名">
            <span style="font-weight: 500;">{{ currentRecord.studentName }}</span>
          </el-descriptions-item>

          <el-descriptions-item label="当前履约状态">
            <el-tag
              :type="currentRecord.status === 2 ? 'success' : currentRecord.status === 1 ? 'warning' : 'info'"
            >
              {{ currentRecord.status === 2 ? '已出勤·打卡完成' : currentRecord.status === 1 ? '已报名·待打卡' : '已取消/失效' }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="获得奖励学分">
            <span style="color: #e6a23c; font-weight: bold; font-size: 15px;">
              +{{ currentRecord.pointsAwarded || 0 }} 积分
            </span>
          </el-descriptions-item>

          <el-descriptions-item label="报名成功时间">
            {{ formatTime(currentRecord.signupTime) }}
          </el-descriptions-item>

          <el-descriptions-item label="签到出勤时间">
            {{ formatTime(currentRecord.checkinTime) }}
          </el-descriptions-item>

          <el-descriptions-item label="打卡现场距离">
            <span v-if="currentRecord.checkinDistance !== undefined && currentRecord.checkinDistance !== null">
              {{ currentRecord.checkinDistance }} 米
            </span>
            <span v-else>-</span>
          </el-descriptions-item>

          <el-descriptions-item label="签到坐标 (经纬度)">
            <span v-if="currentRecord.checkinLatitude">
              {{ currentRecord.checkinLatitude }}, {{ currentRecord.checkinLongitude }}
            </span>
            <span v-else>-</span>
          </el-descriptions-item>

          <el-descriptions-item label="动态验签 Nonce" :span="2">
            <span class="mono-code" style="font-size: 12px; color: #606266;">
              {{ currentRecord.qrNonceUsed || '未扫码' }}
            </span>
          </el-descriptions-item>

          <el-descriptions-item label="系统考勤反馈" :span="2">
            <span>{{ currentRecord.remark || '正常完成考勤签到' }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="detailDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.activity-records-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 顶部统计卡片 */
.stats-row {
  margin-bottom: 4px;
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
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.text-blue { color: #1d4ed8; }
.text-green { color: #059669; }
.text-orange { color: #d97706; }
.text-purple { color: #6d28d9; }

/* 筛选表单 */
.filter-card {
  border-radius: 8px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: -18px;
}

.actions-item {
  margin-left: auto;
}

/* 表格区域 */
.table-card {
  border-radius: 8px;
}

.mono-code {
  font-family: Menlo, Monaco, Consolas, 'Courier New', monospace;
  font-size: 13px;
  color: #409eff;
  background-color: #ecf5ff;
  padding: 2px 6px;
  border-radius: 4px;
}

.student-name-text {
  font-weight: 500;
  color: #303133;
}

.activity-title-link {
  font-weight: 600;
  color: #303133;
}

.points-awarded-text {
  color: #e6a23c;
  font-weight: bold;
  font-size: 14px;
}

.time-text {
  font-size: 13px;
  color: #606266;
}

.text-success {
  color: #67c23a;
  font-weight: 500;
}

.text-muted {
  color: #c0c4cc;
  font-size: 13px;
}

.pagination-box {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

.detail-container {
  padding: 8px 0;
}
</style>
