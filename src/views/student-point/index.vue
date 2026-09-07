<script setup lang="ts">
import { ref } from 'vue'

const studentPoints = ref([
  { id: 1, studentNo: '20240101', name: '张伟', className: '软件2201', currentPoints: 380, totalEarned: 450, totalSpent: 70 },
  { id: 2, studentNo: '20240102', name: '李娜', className: '信管2202', currentPoints: 350, totalEarned: 350, totalSpent: 0 },
  { id: 3, studentNo: '20240103', name: '王强', className: '软件2202', currentPoints: 290, totalEarned: 350, totalSpent: 60 },
  { id: 4, studentNo: '20240104', name: '陈晨', className: '数媒2201', currentPoints: 420, totalEarned: 500, totalSpent: 80 }
])
</script>

<template>
  <el-card shadow="never">
    <el-table :data="studentPoints" stripe style="width: 100%">
      <el-table-column prop="studentNo" label="学号" width="130" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="className" label="班级" width="140" />
      <el-table-column prop="currentPoints" label="当前可用积分" width="140">
        <template #default="{ row }">
          <span style="font-weight: bold; color: #E6A23C;">{{ row.currentPoints }} 分</span>
        </template>
      </el-table-column>
      <el-table-column prop="totalEarned" label="累计获得积分" width="140" />
      <el-table-column prop="totalSpent" label="累计消耗积分" width="140" />
      <el-table-column label="积分调整操作" min-width="160" fixed="right">
        <template #default>
          <el-button link type="primary" size="small">积分奖励/补偿</el-button>
          <el-button link type="danger" size="small">扣除积分</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>
