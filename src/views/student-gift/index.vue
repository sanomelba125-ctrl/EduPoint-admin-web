<script setup lang="ts">
import { ref } from 'vue'

const orders = ref([
  { id: 201, orderNo: 'ORD20240907001', studentName: '张伟', className: '软件2201', giftName: '校园定制晴雨伞', pointsCost: 80, contactInfo: '南苑5号楼302室 13800000001', status: 1, createTime: '2024-09-07 09:40' },
  { id: 202, orderNo: 'ORD20240907002', studentName: '王强', className: '软件2202', giftName: '校园文创帆布包', pointsCost: 60, contactInfo: '北苑1号楼210室 13800000003', status: 2, createTime: '2024-09-07 10:15' },
  { id: 203, orderNo: 'ORD20240906005', studentName: '陈晨', className: '数媒2201', giftName: '青年书店 50元 代金券', pointsCost: 200, contactInfo: 'QQ: 100234567', status: 3, createTime: '2024-09-06 15:20' }
])
</script>

<template>
  <el-card shadow="never">
    <el-table :data="orders" stripe style="width: 100%">
      <el-table-column prop="orderNo" label="兑换单号" width="160" />
      <el-table-column prop="studentName" label="申请学生" width="100" />
      <el-table-column prop="className" label="班级" width="120" />
      <el-table-column prop="giftName" label="兑换礼品" min-width="160" />
      <el-table-column prop="pointsCost" label="扣减积分" width="100">
        <template #default="{ row }">
          <el-tag type="danger" size="small">-{{ row.pointsCost }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="contactInfo" label="收货/联系信息" min-width="180" show-overflow-tooltip />
      <el-table-column prop="status" label="订单状态" width="110">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'warning' : row.status === 2 ? 'primary' : 'success'" size="small">
            {{ row.status === 1 ? '待处理' : row.status === 2 ? '发放中' : '已完成' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="申请时间" width="160" />
      <el-table-column label="审核流转" width="160" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 1">
            <el-button link type="primary" size="small">开始发放</el-button>
            <el-button link type="danger" size="small">驳回退分</el-button>
          </template>
          <template v-else-if="row.status === 2">
            <el-button link type="success" size="small">确认完成</el-button>
          </template>
          <span v-else style="color: #67C23A; font-size: 13px;">已发货完成</span>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>
