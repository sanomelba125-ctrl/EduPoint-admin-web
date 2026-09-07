<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'

const gifts = ref([
  { id: 1, name: '校园定制晴雨伞', pointsCost: 80, stock: 45, status: 1, description: '印有学校校徽的定制防紫外线折叠伞' },
  { id: 2, name: '保温咖啡随手杯 500ml', pointsCost: 120, stock: 18, status: 1, description: '316不锈钢食品级保温杯' },
  { id: 3, name: '校园文创帆布包', pointsCost: 60, stock: 90, status: 1, description: '厚实大容量，适合日常装书' },
  { id: 4, name: '青年书店 50元 购书代金券', pointsCost: 200, stock: 12, status: 1, description: '虚拟电子券，兑换后凭券码到校书店核销' }
])
</script>

<template>
  <el-card shadow="never">
    <div class="filter-bar">
      <el-button type="primary" :icon="Plus">上架新礼品</el-button>
    </div>

    <el-table :data="gifts" stripe style="width: 100%; margin-top: 16px;">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="礼品名称" min-width="160" />
      <el-table-column prop="pointsCost" label="所需积分" width="110">
        <template #default="{ row }">
          <el-tag type="warning" size="small">{{ row.pointsCost }} 积分</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="stock" label="当前库存" width="100" />
      <el-table-column prop="description" label="礼品说明" min-width="220" show-overflow-tooltip />
      <el-table-column prop="status" label="上架状态" width="100">
        <template #default="{ row }">
          <el-switch :model-value="row.status === 1" active-text="上架" inline-prompt />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default>
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
  justify-content: flex-start;
}
</style>
