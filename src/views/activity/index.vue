<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'

const activities = ref([
  { id: 1, title: '迎新志愿服务打卡', points: 10, startTime: '2024-09-01 08:00', endTime: '2024-09-10 18:00', status: 1 },
  { id: 2, title: '图书馆早读自习打卡', points: 5, startTime: '2024-09-05 06:30', endTime: '2024-09-30 08:30', status: 1 },
  { id: 3, title: '操场阳光夜跑打卡', points: 5, startTime: '2024-09-01 19:00', endTime: '2024-10-01 21:30', status: 1 },
  { id: 4, title: '青年大学习打卡', points: 15, startTime: '2024-08-20 00:00', endTime: '2024-08-30 23:59', status: 2 }
])
</script>

<template>
  <el-card shadow="never">
    <div class="filter-bar">
      <el-button type="primary" :icon="Plus">发布新打卡活动</el-button>
    </div>

    <el-table :data="activities" stripe style="width: 100%; margin-top: 16px;">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="title" label="活动名称" min-width="180" />
      <el-table-column prop="points" label="打卡积分" width="110">
        <template #default="{ row }">
          <el-tag type="warning" size="small">+{{ row.points }} 分</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="startTime" label="开始时间" width="160" />
      <el-table-column prop="endTime" label="截止时间" width="160" />
      <el-table-column prop="status" label="活动状态" width="110">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
            {{ row.status === 1 ? '进行中' : '已截止' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default>
          <el-button link type="primary" size="small">编辑</el-button>
          <el-button link type="danger" size="small">下线</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<style scoped>
.filter-bar {
  display: flex;
  justify-content: flex-start;
}
</style>
