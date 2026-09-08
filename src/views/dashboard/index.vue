<script setup lang="ts">
import { ref, markRaw } from 'vue'
import { User, Checked, PieChart, Coin } from '@element-plus/icons-vue'

const statCards = ref([
  { title: '当前总人数', value: '1,280', unit: '人', icon: markRaw(User), color: '#409EFF' },
  { title: '签到总人数', value: '1,126', unit: '人次', icon: markRaw(Checked), color: '#67C23A' },
  { title: '平均签到率', value: '87.9%', unit: '', icon: markRaw(PieChart), color: '#E6A23C' },
  { title: '积分流通总量', value: '45,820', unit: '分', icon: markRaw(Coin), color: '#F56C6C' }
])

const recentCheckins = ref([
  { studentNo: '20240101', name: '张伟', className: '软件2201', activity: '迎新志愿服务打卡', time: '10:24:15', points: 10 },
  { studentNo: '20240102', name: '李娜', className: '信管2202', activity: '图书馆早读打卡', time: '10:18:32', points: 5 },
  { studentNo: '20240105', name: '王强', className: '软件2202', activity: '操场夜跑打卡', time: '10:05:08', points: 5 },
  { studentNo: '20240108', name: '陈晨', className: '数媒2201', activity: '青年大学习打卡', time: '09:42:19', points: 15 }
])

const topStudents = ref([
  { rank: 1, name: '陈晨', className: '数媒2201', points: 420 },
  { rank: 2, name: '张伟', className: '软件2201', points: 380 },
  { rank: 3, name: '李娜', className: '信管2202', points: 350 },
  { rank: 4, name: '刘洋', className: '计科2201', points: 310 },
  { rank: 5, name: '王强', className: '软件2202', points: 290 }
])
</script>

<template>
  <div class="dashboard">
    <!-- 统计卡片区 -->
    <el-row :gutter="16">
      <el-col :xs="24" :sm="12" :md="6" v-for="item in statCards" :key="item.title">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div>
              <div class="stat-title">{{ item.title }}</div>
              <div class="stat-value">
                {{ item.value }} <span class="stat-unit">{{ item.unit }}</span>
              </div>
            </div>
            <div class="stat-icon" :style="{ backgroundColor: item.color + '15', color: item.color }">
              <el-icon :size="28"><component :is="item.icon" /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 下方两栏：最新打卡与排行榜 -->
    <el-row :gutter="16" class="mt-4">
      <el-col :xs="24" :lg="15">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>最新打卡明细</span>
              <el-tag size="small" type="success">实时更新</el-tag>
            </div>
          </template>
          <el-table :data="recentCheckins" stripe style="width: 100%">
            <el-table-column prop="studentNo" label="学号" width="120" />
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="className" label="班级" width="130" />
            <el-table-column prop="activity" label="参与活动" min-width="160" />
            <el-table-column prop="points" label="奖励积分" width="100">
              <template #default="{ row }">
                <el-tag size="small" type="warning">+{{ row.points }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="time" label="打卡时间" width="100" />
          </el-table>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="9">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>学生积分排行榜 (Top 5)</span>
            </div>
          </template>
          <el-table :data="topStudents" style="width: 100%">
            <el-table-column prop="rank" label="排名" width="60">
              <template #default="{ row }">
                <el-tag :type="row.rank === 1 ? 'danger' : row.rank === 2 ? 'warning' : row.rank === 3 ? 'success' : 'info'" effect="dark" round size="small">
                  {{ row.rank }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="className" label="班级" />
            <el-table-column prop="points" label="总积分" width="90" align="right">
              <template #default="{ row }">
                <span class="rank-points">{{ row.points }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.stat-card {
  border-radius: 8px;
}

.stat-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #303133;
}

.stat-unit {
  font-size: 13px;
  font-weight: normal;
  color: #909399;
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mt-4 {
  margin-top: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.rank-points {
  font-weight: bold;
  color: #E6A23C;
}
</style>
