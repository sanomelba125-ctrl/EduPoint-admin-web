<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Search } from '@element-plus/icons-vue'

const searchKeyword = ref('')
const users = ref([
  { id: 1, username: 'admin', nickname: '系统超级管理员', role: '超级管理员', status: 1, createTime: '2024-09-01 10:00:00' },
  { id: 2, username: 'manager', nickname: '学工处张老师', role: '活动管理员', status: 1, createTime: '2024-09-02 14:30:00' }
])
</script>

<template>
  <el-card shadow="never">
    <div class="filter-bar">
      <el-input v-model="searchKeyword" placeholder="按用户名/姓名检索" style="width: 240px;" :prefix-icon="Search" clearable />
      <el-button type="primary" :icon="Plus">新增管理员</el-button>
    </div>

    <el-table :data="users" stripe style="width: 100%; margin-top: 16px;">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="登录账号" width="140" />
      <el-table-column prop="nickname" label="管理员姓名" width="160" />
      <el-table-column prop="role" label="权限角色" width="140">
        <template #default="{ row }">
          <el-tag size="small">{{ row.role }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-switch :model-value="row.status === 1" active-text="启用" inline-prompt />
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" min-width="180" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default>
          <el-button link type="primary" size="small">重置密码</el-button>
          <el-button link type="primary" size="small">编辑</el-button>
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
}
</style>
