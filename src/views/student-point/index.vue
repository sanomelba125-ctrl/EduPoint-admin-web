<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search,
  Refresh,
  Plus,
  Coin,
  ShoppingCart,
  RefreshRight,
  Tickets,
  EditPen
} from '@element-plus/icons-vue'
import {
  getAdminPointRecords,
  getLedgerMetrics,
  searchStudentForAdjust,
  adjustStudentPoints,
  type StudentPointRecordVO,
  type AdminPointRecordQuery,
  type LedgerMetricsVO,
  type PointAdjustDTO
} from '@/api/point'
import type { StudentVO } from '@/api/student'

import { usePageList } from '@/hooks/usePageList'

// 列表与分页状态及检索
const {
  loading,
  list: recordList,
  total,
  queryParams,
  load: fetchRecords,
  handleSearch,
  handleReset,
  handleSizeChange,
  handleCurrentChange
} = usePageList<Omit<AdminPointRecordQuery, 'page' | 'size'>, StudentPointRecordVO>({
  initialFilters: {
    keyword: '',
    type: undefined
  },
  fetcher: (params) => getAdminPointRecords(params)
})

// 大盘指标
const metrics = ref<LedgerMetricsVO>({
  totalEarnedPoints: 0,
  totalSpentPoints: 0,
  totalRefundedPoints: 0,
  adjustCount: 0
})

// 调账弹窗状态
const adjustDialogVisible = ref(false)
const submitLoading = ref(false)
const studentOptions = ref<StudentVO[]>([])
const studentSearchLoading = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const adjustForm = reactive({
  studentId: undefined as number | undefined,
  direction: 'PLUS', // PLUS / MINUS
  amount: 50,
  approvalNo: '',
  reason: ''
})

// 当前选中的目标学生
const selectedStudent = computed(() => {
  if (!adjustForm.studentId) return null
  return studentOptions.value.find(s => s.id === adjustForm.studentId) || null
})

// 调账试算
const prevBalance = computed(() => {
  return selectedStudent.value?.currentPoints ?? 0
})

const changeValue = computed(() => {
  return adjustForm.direction === 'PLUS' ? adjustForm.amount : -adjustForm.amount
})

const afterBalance = computed(() => {
  return prevBalance.value + changeValue.value
})

const isNegativeWarning = computed(() => {
  return afterBalance.value < 0
})



const fetchMetrics = async () => {
  try {
    const res: any = await getLedgerMetrics()
    if (res) {
      metrics.value = res
    }
  } catch (err) {
    console.warn('获取对账指标失败', err)
  }
}

/**
 * 远程防抖检索候选学生，全校学生均可直接按学号或姓名精确/模糊检索
 */
const handleStudentSearch = (keyword: string) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    studentSearchLoading.value = true
    try {
      studentOptions.value = await searchStudentForAdjust(keyword)
    } catch (error) {
      console.warn('搜索学生失败:', error)
      studentOptions.value = []
    } finally {
      studentSearchLoading.value = false
    }
  }, 300)
}

const openAdjustModal = async () => {
  adjustForm.studentId = undefined
  adjustForm.direction = 'PLUS'
  adjustForm.amount = 50
  adjustForm.approvalNo = 'OA-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-01'
  adjustForm.reason = ''
  adjustDialogVisible.value = true

  // 弹窗初次唤起时，预加载前 20 位学生供即点即选
  studentSearchLoading.value = true
  try {
    studentOptions.value = await searchStudentForAdjust('')
  } catch (err) {
    studentOptions.value = []
  } finally {
    studentSearchLoading.value = false
  }
}

const handleSubmitAdjust = async () => {
  if (!adjustForm.studentId) {
    ElMessage.warning('请选择目标调账学生')
    return
  }
  if (!adjustForm.amount || adjustForm.amount <= 0) {
    ElMessage.warning('请输入大于 0 的调账分值')
    return
  }
  if (isNegativeWarning.value) {
    ElMessage.error('扣减后学生可用积分余额将变负数，系统拦截操作！')
    return
  }
  if (!adjustForm.reason.trim()) {
    ElMessage.warning('请输入调账原因事由')
    return
  }

  submitLoading.value = true
  try {
    const payload: PointAdjustDTO = {
      studentId: adjustForm.studentId,
      points: changeValue.value,
      reason: adjustForm.reason.trim(),
      approvalNo: adjustForm.approvalNo.trim()
    }
    await adjustStudentPoints(payload)
    ElMessage.success('人工积分调账执行成功，审计流水已入账')
    adjustDialogVisible.value = false
    fetchRecords()
    fetchMetrics()
  } catch (err: any) {
    ElMessage.error(err.message || '调账失败')
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  fetchMetrics()
})
</script>

<template>
  <div class="point-record-page">
    <!-- 统计指标面板 -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-info">
          <span class="metric-title">活动打卡发放 (EARN)</span>
          <div class="metric-number success">
            +{{ metrics.totalEarnedPoints }} <span class="metric-unit">pts</span>
          </div>
        </div>
        <div class="metric-icon-box success">
          <el-icon><Coin /></el-icon>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-info">
          <span class="metric-title">商城兑换消耗 (EXCHANGE)</span>
          <div class="metric-number danger">
            -{{ metrics.totalSpentPoints }} <span class="metric-unit">pts</span>
          </div>
        </div>
        <div class="metric-icon-box danger">
          <el-icon><ShoppingCart /></el-icon>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-info">
          <span class="metric-title">退单返还积分 (REFUND)</span>
          <div class="metric-number primary">
            +{{ metrics.totalRefundedPoints }} <span class="metric-unit">pts</span>
          </div>
        </div>
        <div class="metric-icon-box primary">
          <el-icon><RefreshRight /></el-icon>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-info">
          <span class="metric-title">人工特殊调账笔数</span>
          <div class="metric-number">
            {{ metrics.adjustCount }} <span class="metric-unit">笔</span>
          </div>
        </div>
        <div class="metric-icon-box info">
          <el-icon><Tickets /></el-icon>
        </div>
      </div>
    </div>

    <!-- 筛选面板 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="检索流水">
          <el-input
            v-model="queryParams.keyword"
            placeholder="学号 / 姓名 / 流水号 / 备注..."
            clearable
            @keyup.enter="handleSearch"
            style="width: 280px;"
          />
        </el-form-item>

        <el-form-item label="业务类型">
          <el-select
            v-model="queryParams.type"
            placeholder="全部业务类型"
            clearable
            style="width: 170px;"
            @change="handleSearch"
          >
            <el-option label="活动打卡发放 (EARN)" :value="1" />
            <el-option label="商城兑换消耗 (EXCHANGE)" :value="2" />
            <el-option label="系统人工调账 (MANUAL)" :value="3" />
            <el-option label="取消订单退单 (REFUND)" :value="4" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>

        <div class="filter-right">
          <el-button type="warning" :icon="EditPen" @click="openAdjustModal">
            人工积分调账
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 流水数据表格 -->
    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="loading"
        :data="recordList"
        stripe
        style="width: 100%"
        row-key="id"
      >
        <el-table-column label="流水单号 / 时间" width="180">
          <template #default="{ row }">
            <div class="record-no-text">{{ row.recordNo }}</div>
            <div class="sub-text">{{ row.createTime }}</div>
          </template>
        </el-table-column>

        <el-table-column label="关联学生" min-width="150">
          <template #default="{ row }">
            <div class="student-name">{{ row.studentName }}</div>
            <div class="sub-text">
              {{ row.studentNo }}
              <span v-if="row.className">· {{ row.className }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="业务行为" width="130" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.type === 1 ? 'success' : row.type === 2 ? 'warning' : row.type === 4 ? 'primary' : 'info'"
              effect="light"
              size="small"
            >
              {{ row.typeDesc }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="变动分值" width="130" align="right">
          <template #default="{ row }">
            <span :class="['change-val', row.changePoints > 0 ? 'plus' : 'minus']">
              {{ row.changePoints > 0 ? '+' : '' }}{{ row.changePoints }}
            </span>
            <span class="pts-unit"> pts</span>
          </template>
        </el-table-column>

        <el-table-column label="可用余额轨迹 (前后)" width="160" align="center">
          <template #default="{ row }">
            <div class="balance-track">
              <span>{{ row.beforePoints }}</span>
              <span class="track-arrow">&rarr;</span>
              <strong>{{ row.afterPoints }}</strong>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="关联单据" width="140">
          <template #default="{ row }">
            <span class="biz-tag">{{ row.businessType }}: {{ row.businessId }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="description" label="变动备注说明" min-width="200" show-overflow-tooltip />

        <el-table-column prop="operatorName" label="操作人" width="140">
          <template #default="{ row }">
            <span class="operator-text">{{ row.operatorName }}</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.size"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 系统人工积分调账弹窗 -->
    <el-dialog
      v-model="adjustDialogVisible"
      title="系统人工积分调账 (MANUAL_ADJUST)"
      width="500px"
      destroy-on-close
    >
      <div class="dialog-tip">
        调账将直接变更学生的 <code>current_points</code> (加分同步更新 <code>total_points</code>)，操作不可撤销并记入财务审计日志。
      </div>

      <el-form label-width="100px" label-position="right">
        <el-form-item label="目标学生" required>
          <el-select
            v-model="adjustForm.studentId"
            filterable
            remote
            clearable
            reserve-keyword
            :remote-method="handleStudentSearch"
            :loading="studentSearchLoading"
            placeholder="输入学号或姓名搜索学生..."
            style="width: 100%;"
          >
            <el-option
              v-for="s in studentOptions"
              :key="s.id"
              :label="`${s.name} (${s.studentNo}) · 当前可用 ${s.currentPoints ?? 0} pts`"
              :value="s.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="调账方向" required>
          <el-radio-group v-model="adjustForm.direction">
            <el-radio-button label="PLUS">增加积分 (+)</el-radio-button>
            <el-radio-button label="MINUS">扣减积分 (-)</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="分值数量" required>
          <el-input-number
            v-model="adjustForm.amount"
            :min="1"
            :max="2000"
            :step="10"
            controls-position="right"
            style="width: 100%;"
          />
        </el-form-item>

        <!-- 试算预览卡片 -->
        <div v-if="selectedStudent" class="adjust-preview-card">
          <div class="preview-row">
            <span>调账前可用分：</span>
            <strong>{{ prevBalance }} pts</strong>
          </div>
          <div class="preview-row">
            <span>变更分值：</span>
            <strong :class="changeValue > 0 ? 'text-success' : 'text-danger'">
              {{ changeValue > 0 ? '+' : '' }}{{ changeValue }} pts
            </strong>
          </div>
          <div class="preview-row">
            <span>调账后可用分：</span>
            <strong :class="isNegativeWarning ? 'text-danger' : 'text-success'">
              {{ afterBalance }} pts
              <span v-if="isNegativeWarning">（扣减后变负数，系统不允许提交!）</span>
            </strong>
          </div>
        </div>

        <el-form-item label="审批工单号">
          <el-input v-model="adjustForm.approvalNo" placeholder="例: OA-20260908-01" />
        </el-form-item>

        <el-form-item label="事由说明" required>
          <el-input
            v-model="adjustForm.reason"
            type="textarea"
            :rows="2"
            placeholder="例如: 优秀志愿者工作专项奖励 / 违规行为积分纠正扣减"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="adjustDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="submitLoading"
            :disabled="isNegativeWarning"
            @click="handleSubmitAdjust"
          >
            确认执行调账
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.point-record-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.metric-card {
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-title {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.metric-number {
  font-size: 24px;
  font-weight: 700;
  margin-top: 4px;
}

.metric-number.success {
  color: var(--el-color-success);
}

.metric-number.danger {
  color: var(--el-color-danger);
}

.metric-number.primary {
  color: var(--el-color-primary);
}

.metric-unit {
  font-size: 13px;
  font-weight: normal;
  color: var(--el-text-color-secondary);
}

.metric-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.metric-icon-box.success {
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.metric-icon-box.danger {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.metric-icon-box.primary {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.metric-icon-box.info {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
}

.filter-card, .table-card {
  border-radius: 6px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.filter-right {
  margin-left: auto;
}

.record-no-text {
  font-family: monospace;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.sub-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.student-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.change-val {
  font-weight: 700;
  font-family: monospace;
  font-size: 14px;
}

.change-val.plus {
  color: var(--el-color-success);
}

.change-val.minus {
  color: var(--el-color-danger);
}

.pts-unit {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.balance-track {
  font-family: monospace;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.track-arrow {
  color: var(--el-text-color-placeholder);
  margin: 0 4px;
}

.biz-tag {
  font-family: monospace;
  font-size: 11px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--el-text-color-regular);
}

.operator-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-family: monospace;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.dialog-tip {
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin-bottom: 16px;
}

.adjust-preview-card {
  background: var(--el-color-primary-light-9);
  border: 1px dashed var(--el-color-primary-light-7);
  padding: 10px 14px;
  border-radius: 4px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
}

.text-success {
  color: var(--el-color-success);
}

.text-danger {
  color: var(--el-color-danger);
}
</style>
