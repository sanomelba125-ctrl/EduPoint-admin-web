<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, markRaw } from 'vue'
import { User, Checked, PieChart, Coin, Refresh, TrendCharts, Trophy } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts/core'
import {
  LineChart,
  PieChart as EPieChart,
  type LineSeriesOption,
  type PieSeriesOption
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  type GridComponentOption,
  type TooltipComponentOption,
  type LegendComponentOption,
  type TitleComponentOption
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 按需注册 ECharts 核心模块与组件
echarts.use([
  LineChart,
  EPieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer
])

// 组合按需图表类型定义
type ECOption = echarts.ComposeOption<
  | LineSeriesOption
  | PieSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | TitleComponentOption
>
import {
  getDashboardOverview,
  getDashboardTopStudents,
  type CategoryStatVO,
  type DailyTrendVO,
  type TopStudentVO,
  type RecentCheckinVO
} from '@/api/dashboard'

// ────────── 响应式状态 ──────────
const loading = ref(false)
const lastUpdatedTime = ref('')

const statCards = ref([
  { title: '注册学生总数', value: '0', unit: '人', icon: markRaw(User), color: '#409EFF', subText: '全校认证学籍' },
  { title: '累计打卡人次', value: '0', unit: '人次', icon: markRaw(Checked), color: '#67C23A', subText: '活动完成履约' },
  { title: '平均签到履约率', value: '0.0%', unit: '', icon: markRaw(PieChart), color: '#E6A23C', subText: '报名即履约比例' },
  { title: '积分流通总量', value: '0', unit: '分', icon: markRaw(Coin), color: '#F56C6C', subText: '当前学生可用余额' }
])

const recentCheckins = ref<RecentCheckinVO[]>([])
const topStudents = ref<TopStudentVO[]>([])

// ECharts 实例引用与 DOM 容器
const trendChartRef = ref<HTMLElement | null>(null)
const categoryChartRef = ref<HTMLElement | null>(null)
let trendChartInstance: echarts.ECharts | null = null
let categoryChartInstance: echarts.ECharts | null = null

// 格式化数字（千分位）
function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString()
}

// 初始化 7 日打卡趋势折线图
function initTrendChart(trendData: DailyTrendVO[]) {
  if (!trendChartRef.value) return
  if (!trendChartInstance) {
    trendChartInstance = echarts.init(trendChartRef.value)
  }

  const dates = trendData && trendData.length > 0 
    ? trendData.map(item => item.date) 
    : ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const counts = trendData && trendData.length > 0 
    ? trendData.map(item => item.count) 
    : [0, 0, 0, 0, 0, 0, 0]

  const option: ECOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#ebeef5',
      borderWidth: 1,
      textStyle: { color: '#303133', fontSize: 13 },
      formatter: '{b}<br/><span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:#409EFF;"></span>打卡人次: <b>{c}</b> 人'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '5%',
      top: '12%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: { color: '#606266', fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#f2f6fc', type: 'dashed' } },
      axisLabel: { color: '#909399', fontSize: 12 }
    },
    series: [
      {
        name: '打卡人次',
        type: 'line',
        smooth: 0.35,
        symbol: 'circle',
        symbolSize: 7,
        itemStyle: {
          color: '#409EFF',
          borderWidth: 2,
          borderColor: '#ffffff'
        },
        lineStyle: {
          width: 3,
          color: '#409EFF'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.38)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.02)' }
          ])
        },
        data: counts
      }
    ]
  }

  trendChartInstance.setOption(option)
}

// 初始化活动分类分布环形饼图
function initCategoryChart(categoryData: CategoryStatVO[]) {
  if (!categoryChartRef.value) return
  if (!categoryChartInstance) {
    categoryChartInstance = echarts.init(categoryChartRef.value)
  }

  const seriesData = categoryData && categoryData.length > 0
    ? categoryData.map(item => ({ name: item.name || item.category, value: item.count }))
    : [{ name: '暂无数据', value: 0 }]

  const option: ECOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#ebeef5',
      borderWidth: 1,
      textStyle: { color: '#303133', fontSize: 13 },
      formatter: '{b}: <b>{c}</b> 项 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'middle',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#606266', fontSize: 12 }
    },
    color: ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#9b59b6', '#34495e'],
    series: [
      {
        name: '活动分类',
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 15,
            fontWeight: 'bold',
            formatter: '{b}\n{d}%'
          }
        },
        labelLine: {
          show: false
        },
        data: seriesData
      }
    ]
  }

  categoryChartInstance.setOption(option)
}

// 窗口尺寸变化自适应
function handleResize() {
  trendChartInstance?.resize()
  categoryChartInstance?.resize()
}

// 加载仪表盘全部数据
async function loadDashboardData() {
  loading.value = true
  try {
    const [overview, topData] = await Promise.all([
      getDashboardOverview(),
      getDashboardTopStudents()
    ])

    // 1. 更新卡片
    if (overview) {
      statCards.value[0].value = formatNumber(overview.totalStudents)
      statCards.value[1].value = formatNumber(overview.totalCheckins)
      statCards.value[2].value = overview.checkinRate || '0.0%'
      statCards.value[3].value = formatNumber(overview.circulatingPoints)

      // 渲染图表
      await nextTick()
      initTrendChart(overview.weeklyCheckinTrend || [])
      initCategoryChart(overview.categoryDistribution || [])
    }

    // 2. 更新表格
    if (topData) {
      recentCheckins.value = topData.recentCheckins || []
      topStudents.value = topData.topStudents || []
    }

    const now = new Date()
    lastUpdatedTime.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  } catch (err: any) {
    console.error('加载看板数据失败:', err)
    ElMessage.error(err.message || '加载仪表盘实时数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDashboardData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChartInstance?.dispose()
  categoryChartInstance?.dispose()
})
</script>

<template>
  <div class="dashboard" v-loading="loading">
    <!-- 头部工具栏 -->
    <div class="dashboard-header">
      <div class="header-left">
        <h2 class="page-title">数据监控与分析大屏</h2>
        <span class="page-sub">实时汇聚全校活动参与、签到核销与积分流转核心指标</span>
      </div>
      <div class="header-right">
        <span class="update-hint" v-if="lastUpdatedTime">上次更新: {{ lastUpdatedTime }}</span>
        <el-button type="primary" :icon="Refresh" plain size="small" @click="loadDashboardData" :loading="loading">
          刷新实时数据
        </el-button>
      </div>
    </div>

    <!-- 1. 核心 KPI 统计卡片区 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="24" :sm="12" :md="6" v-for="item in statCards" :key="item.title">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">{{ item.title }}</div>
              <div class="stat-value">
                {{ item.value }} <span class="stat-unit">{{ item.unit }}</span>
              </div>
              <div class="stat-subtext">{{ item.subText }}</div>
            </div>
            <div class="stat-icon" :style="{ backgroundColor: item.color + '15', color: item.color }">
              <el-icon :size="30"><component :is="item.icon" /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 2. 可视化图表区：近7天打卡趋势 + 活动类别分布 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :lg="15">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon class="mr-1 text-primary"><TrendCharts /></el-icon>
                <span>近 7 天活动打卡履约趋势</span>
              </div>
              <el-tag size="small" type="primary" effect="plain">按日统计 (人次)</el-tag>
            </div>
          </template>
          <div ref="trendChartRef" class="echarts-container"></div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="9">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon class="mr-1 text-warning"><PieChart /></el-icon>
                <span>活动类别占比分布</span>
              </div>
              <el-tag size="small" type="warning" effect="plain">分类维度</el-tag>
            </div>
          </template>
          <div ref="categoryChartRef" class="echarts-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 3. 数据明细两栏：最新打卡流水与积分排行榜 -->
    <el-row :gutter="16" class="table-row">
      <el-col :xs="24" :lg="15">
        <el-card shadow="never" class="table-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon class="mr-1 text-success"><Checked /></el-icon>
                <span>最新打卡明细流水</span>
              </div>
              <el-tag size="small" type="success" effect="light">实时流水 Top 10</el-tag>
            </div>
          </template>
          <el-table :data="recentCheckins" stripe style="width: 100%" empty-text="暂无打卡记录">
            <el-table-column prop="studentNo" label="学号" width="115" />
            <el-table-column label="姓名" width="105">
              <template #default="{ row }">
                <div class="student-cell">
                  <el-avatar :size="24" :src="row.avatar" class="mr-1">
                    {{ (row.name || '学').slice(0, 1) }}
                  </el-avatar>
                  <span class="student-name">{{ row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="className" label="班级" width="125" show-overflow-tooltip />
            <el-table-column prop="activity" label="参与活动" min-width="160" show-overflow-tooltip />
            <el-table-column prop="points" label="奖励积分" width="90" align="center">
              <template #default="{ row }">
                <el-tag size="small" type="warning" effect="dark">+{{ row.points || 0 }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="time" label="打卡时间" width="95" align="center" />
          </el-table>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="9">
        <el-card shadow="never" class="table-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon class="mr-1 text-warning"><Trophy /></el-icon>
                <span>学生总积分排行榜 (Top 5)</span>
              </div>
              <el-tag size="small" type="danger" effect="plain">风云榜</el-tag>
            </div>
          </template>
          <el-table :data="topStudents" style="width: 100%" empty-text="暂无排名数据">
            <el-table-column prop="rank" label="排名" width="65" align="center">
              <template #default="{ row }">
                <span v-if="row.rank === 1" class="rank-badge rank-1">1</span>
                <span v-else-if="row.rank === 2" class="rank-badge rank-2">2</span>
                <span v-else-if="row.rank === 3" class="rank-badge rank-3">3</span>
                <span v-else class="rank-badge rank-normal">{{ row.rank }}</span>
              </template>
            </el-table-column>
            <el-table-column label="学生信息" min-width="130">
              <template #default="{ row }">
                <div class="top-student-cell">
                  <el-avatar :size="24" :src="row.avatar" class="mr-1">
                    {{ (row.name || '学').slice(0, 1) }}
                  </el-avatar>
                  <div class="top-student-info">
                    <span class="top-name">{{ row.name }}</span>
                    <span class="top-class">{{ row.className || '' }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="points" label="累计总积分" width="95" align="right">
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
.dashboard {
  padding-bottom: 24px;
}

/* 顶部标题栏 */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.5px;
}

.page-sub {
  font-size: 13px;
  color: #6b7280;
  margin-top: 4px;
  display: inline-block;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.update-hint {
  font-size: 12px;
  color: #9ca3af;
}

/* 统计卡片区 */
.stat-row {
  margin-bottom: 16px;
}

.stat-card {
  border-radius: 12px;
  border: 1px solid #f0f2f5;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06) !important;
}

.stat-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-title {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 6px;
  font-weight: 500;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
}

.stat-unit {
  font-size: 13px;
  font-weight: normal;
  color: #9ca3af;
  margin-left: 2px;
}

.stat-subtext {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 6px;
}

.stat-icon {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 图表区 */
.chart-row {
  margin-bottom: 16px;
}

.chart-card {
  border-radius: 12px;
  border: 1px solid #f0f2f5;
}

.echarts-container {
  width: 100%;
  height: 280px;
}

/* 卡片通用头 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 14px;
  color: #374151;
}

.mr-1 {
  margin-right: 6px;
}

.text-primary {
  color: #409eff;
}

.text-warning {
  color: #e6a23c;
}

.text-success {
  color: #67c23a;
}

/* 表格区 */
.table-card {
  border-radius: 12px;
  border: 1px solid #f0f2f5;
}

.student-cell,
.top-student-cell {
  display: flex;
  align-items: center;
}

.student-name {
  font-weight: 500;
  color: #303133;
}

/* 积分排行榜徽章 */
.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
}

.rank-1 {
  background: linear-gradient(135deg, #f56c6c, #e74c3c);
  box-shadow: 0 2px 6px rgba(245, 108, 108, 0.4);
}

.rank-2 {
  background: linear-gradient(135deg, #e6a23c, #f39c12);
  box-shadow: 0 2px 6px rgba(230, 162, 60, 0.4);
}

.rank-3 {
  background: linear-gradient(135deg, #67c23a, #2ecc71);
  box-shadow: 0 2px 6px rgba(103, 194, 58, 0.4);
}

.rank-normal {
  background-color: #909399;
}

.top-student-info {
  display: flex;
  flex-direction: column;
}

.top-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 13px;
}

.top-class {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 1px;
}

.rank-points {
  font-weight: 700;
  font-size: 15px;
  color: #e6a23c;
}
</style>
