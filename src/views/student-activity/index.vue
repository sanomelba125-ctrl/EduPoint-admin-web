<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
  View
} from '@element-plus/icons-vue'
import {
  getActivityRecordList,
  type StudentActivityRecordVO,
  type ActivityRecordQuery
} from '@/api/activity'

// 详情弹窗
const detailDialogVisible = ref(false)
const currentRecord = ref<StudentActivityRecordVO | null>(null)

import { usePageList } from '@/hooks/usePageList'
import { downloadFile } from '@/utils/download'

// 导出状态
const exportLoading = ref(false)

// 列表与分页状态及检索
const {
  loading,
  list: recordList,
  total,
  queryParams,
  load: fetchRecords,
  handleSearch,
  handleReset,
  handlePageChange,
  handleSizeChange
} = usePageList<Omit<ActivityRecordQuery, 'page' | 'size'>, StudentActivityRecordVO>({
  initialFilters: {
    studentName: '',
    studentNo: '',
    activityTitle: '',
    status: undefined
  },
  fetcher: (params) => {
    return getActivityRecordList({
      ...params,
      studentName: params.studentName?.trim() || undefined,
      studentNo: params.studentNo?.trim() || undefined,
      activityTitle: params.activityTitle?.trim() || undefined,
      status: params.status !== undefined && params.status !== '' ? Number(params.status) : undefined
    })
  }
})

// 业务统计指标：严格遵循 API.md 规范，基于已有的全量记录总数与当前记录数据进行统计，严禁调用未定义接口
const metrics = computed(() => {
  const list = recordList.value || []
  return {
    totalRecords: total.value || 0,
    completedCount: list.filter((r) => r.status === 2).length,
    pendingCount: list.filter((r) => r.status === 1).length,
    cancelledCount: list.filter((r) => r.status === 3).length,
    pointsDistributed: list.filter((r) => r.status === 2).reduce((sum, r) => sum + (r.pointsAwarded || 0), 0)
  }
})

const handleRefreshAll = () => {
  fetchRecords()
}



// 打开记录详情
const openDetail = (row: StudentActivityRecordVO) => {
  currentRecord.value = row
  detailDialogVisible.value = true
}

// 导出 Excel 报表（基于 Blob + Header 鉴权，避免 Token 泄露至 URL）
const handleExport = async () => {
  exportLoading.value = true
  try {
    await downloadFile(
      '/admin/export/activity-records',
      {
        studentName: queryParams.studentName?.trim() || undefined,
        studentNo: queryParams.studentNo?.trim() || undefined,
        activityTitle: queryParams.activityTitle?.trim() || undefined,
        status: queryParams.status !== undefined && queryParams.status !== '' ? String(queryParams.status) : undefined
      },
      '学生活动打卡记录.xlsx'
    )
    ElMessage.success('报表导出成功')
  } catch (err: any) {
    ElMessage.error(err.message || '导出失败')
  } finally {
    exportLoading.value = false
  }
}

// 格式化时间
const formatTime = (timeStr?: string) => {
  if (!timeStr) return '-'
  return timeStr.replace('T', ' ').substring(0, 19)
}

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
              <div class="stat-value text-blue">{{ metrics.totalRecords }}</div>
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
              <div class="stat-value text-green">{{ metrics.completedCount }}</div>
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
              <div class="stat-value text-orange">{{ metrics.pendingCount }}</div>
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
              <div class="stat-value text-purple">{{ metrics.cancelledCount }}</div>
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
          <el-button :icon="Refresh" @click="handleRefreshAll">刷新</el-button>
          <el-button type="success" plain :icon="Download" :loading="exportLoading" @click="handleExport">导出考勤明细</el-button>
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
