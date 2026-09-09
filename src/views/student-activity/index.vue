<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { getActivityRecords, type ActivityRecordQuery, type ActivityRecordVO } from '@/api/activity'

const loading = ref(false)
const checkinRecords = ref<ActivityRecordVO[]>([])
const total = ref(0)
const query = reactive<ActivityRecordQuery>({
  page: 1,
  size: 10,
  studentName: '',
  studentNo: '',
  activityTitle: '',
  status: ''
})

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 1, label: '已报名' },
  { value: 2, label: '已完成' },
  { value: 3, label: '未完成/已失效' }
]

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
    ElMessage.error(err.message || '获取学生活动记录失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadRecords()
}

function handleReset() {
  query.studentName = ''
  query.studentNo = ''
  query.activityTitle = ''
  query.status = ''
  query.page = 1
  loadRecords()
}

function handleSizeChange(size: number) {
  query.size = size
  query.page = 1
  loadRecords()
}

function handlePageChange(page: number) {
  query.page = page
  loadRecords()
}

function statusLabel(status?: number) {
  return ({ 1: '已报名', 2: '已完成', 3: '未完成/已失效' } as Record<number, string>)[status || 0] || '未知'
}

function statusType(status?: number): 'success' | 'warning' | 'danger' | 'info' {
  return status === 2 ? 'success' : status === 1 ? 'warning' : status === 3 ? 'danger' : 'info'
}

onMounted(loadRecords)
</script>

<template>
  <div class="student-activity-page">
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="学生姓名">
          <el-input v-model="query.studentName" placeholder="请输入姓名" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="学号">
          <el-input v-model="query.studentNo" placeholder="请输入学号" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="活动名称">
          <el-input v-model="query.activityTitle" placeholder="请输入活动标题" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="参与状态">
          <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 150px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="table-card">
    <el-table v-loading="loading" :data="checkinRecords" stripe style="width: 100%" row-key="id">
      <el-table-column prop="id" label="记录ID" width="90" />
      <el-table-column prop="studentNo" label="学号" width="130" />
      <el-table-column prop="studentName" label="学生姓名" width="120" />
      <el-table-column prop="activityTitle" label="参与活动" min-width="180" show-overflow-tooltip />
      <el-table-column prop="pointsAwarded" label="打卡积分" width="100">
        <template #default="{ row }">
          <el-tag type="warning" size="small">+{{ row.pointsAwarded || 0 }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="signupTime" label="报名时间" width="170" />
      <el-table-column prop="checkinTime" label="打卡时间" width="170" />
      <el-table-column prop="status" label="打卡状态" width="110">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.size"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
    </el-card>
  </div>
</template>

<style scoped>
.student-activity-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}
.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 12px;
}
.table-card :deep(.el-card__body) {
  padding: 0;
}
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 14px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>
