import { http } from '@/utils/request'

export interface CategoryStatVO {
  category: string
  name: string
  count: number
}

export interface DailyTrendVO {
  date: string
  count: number
}

export interface DashboardOverviewVO {
  totalStudents: number
  totalCheckins: number
  checkinRate: string
  circulatingPoints: number
  totalPoints: number
  totalActivities: number
  categoryDistribution: CategoryStatVO[]
  weeklyCheckinTrend: DailyTrendVO[]
}

export interface TopStudentVO {
  rank: number
  id: number
  studentNo: string
  name: string
  className: string
  points: number        // 累计总积分
  currentPoints: number // 可用积分
  avatar?: string
}

export interface RecentCheckinVO {
  id: number
  studentNo: string
  name: string
  className: string
  activity: string
  points: number
  time: string
  status?: number
}

export interface DashboardTopStudentsVO {
  topStudents: TopStudentVO[]
  recentCheckins: RecentCheckinVO[]
}

/**
 * 获取仪表盘核心指标概览 (KPI、7天签到趋势、活动分类分布)
 * GET /dashboard/overview
 */
export function getDashboardOverview(): Promise<DashboardOverviewVO> {
  return http.get<DashboardOverviewVO>('/dashboard/overview')
}

/**
 * 获取仪表盘排行榜与最新签到动态 (Top 5 积分榜、实时签到动态流水)
 * GET /dashboard/top-students
 */
export function getDashboardTopStudents(): Promise<DashboardTopStudentsVO> {
  return http.get<DashboardTopStudentsVO>('/dashboard/top-students')
}
