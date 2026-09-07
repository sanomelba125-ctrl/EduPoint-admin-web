<script setup lang="ts">
import { ref } from 'vue'

const checkinRecords = ref([
  { id: 101, studentNo: '20240101', studentName: '张伟', activityName: '迎新志愿服务打卡', checkinTime: '2024-09-07 10:24', points: 10, status: 1 },
  { id: 102, studentNo: '20240102', studentName: '李娜', activityName: '图书馆早读自习打卡', checkinTime: '2024-09-07 10:18', points: 5, status: 1 },
  { id: 103, studentNo: '20240105', studentName: '王强', activityName: '迎新志愿服务打卡', checkinTime: '2024-09-07 09:30', points: 10, status: 0 },
  { id: 104, studentNo: '20240108', studentName: '赵敏', activityName: '迎新志愿服务打卡', checkinTime: '2024-09-07 09:12', points: 10, status: 2 }
])
</script>

<template>
  <el-card shadow="never">
    <el-table :data="checkinRecords" stripe style="width: 100%">
      <el-table-column prop="id" label="记录ID" width="90" />
      <el-table-column prop="studentNo" label="学号" width="130" />
      <el-table-column prop="studentName" label="学生姓名" width="120" />
      <el-table-column prop="activityName" label="参与活动" min-width="180" />
      <el-table-column prop="points" label="打卡积分" width="100">
        <template #default="{ row }">
          <el-tag type="warning" size="small">+{{ row.points }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="checkinTime" label="提交打卡时间" width="160" />
      <el-table-column prop="status" label="打卡状态" width="110">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : row.status === 0 ? 'warning' : 'danger'" size="small">
            {{ row.status === 1 ? '已完成' : row.status === 0 ? '待审核' : '已驳回' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="审核操作" width="160" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 0">
            <el-button link type="success" size="small">通过</el-button>
            <el-button link type="danger" size="small">驳回</el-button>
          </template>
          <span v-else style="color: #909399; font-size: 13px;">无需处理</span>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>
