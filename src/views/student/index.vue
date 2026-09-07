<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Search } from '@element-plus/icons-vue'

const students = ref([
  { id: 1, studentNo: '20240101', name: '张伟', className: '软件2201', phone: '13800000001', points: 380, status: 1 },
  { id: 2, studentNo: '20240102', name: '李娜', className: '信管2202', phone: '13800000002', points: 350, status: 1 },
  { id: 3, studentNo: '20240103', name: '王强', className: '软件2202', phone: '13800000003', points: 290, status: 1 },
  { id: 4, studentNo: '20240104', name: '陈晨', className: '数媒2201', phone: '13800000004', points: 420, status: 1 }
])
</script>

<template>
  <el-card shadow="never">
    <div class="filter-bar">
      <div class="filter-left">
        <el-input placeholder="学号/姓名检索" style="width: 200px;" :prefix-icon="Search" />
        <el-select placeholder="选择班级" style="width: 160px;" clearable>
          <el-option label="软件2201" value="软件2201" />
          <el-option label="软件2202" value="软件2202" />
          <el-option label="信管2202" value="信管2202" />
        </el-select>
        <el-button type="primary">查询</el-button>
      </div>
      <el-button type="primary" :icon="Plus">录入新学生</el-button>
    </div>

    <el-table :data="students" stripe style="width: 100%; margin-top: 16px;">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="studentNo" label="学号" width="130" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="className" label="班级" width="140" />
      <el-table-column prop="phone" label="联系电话" width="140" />
      <el-table-column prop="points" label="当前积分" width="110">
        <template #default="{ row }">
          <el-tag type="warning" size="small">{{ row.points }} 分</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="账号状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
            {{ row.status === 1 ? '正常' : '冻结' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="180" fixed="right">
        <template #default>
          <el-button link type="primary" size="small">修改资料</el-button>
          <el-button link type="primary" size="small">重置密码</el-button>
          <el-button link type="danger" size="small">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<style scoped>
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filter-left {
  display: flex;
  gap: 12px;
}
</style>
