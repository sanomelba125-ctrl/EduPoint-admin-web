import { http } from '@/utils/request'
import type { PageQuery, PageResult } from './types'

export interface StudentPointRecordVO {
  id: number
  recordNo: string
  studentId: number
  studentNo: string
  studentName: string
  college?: string
  className?: string
  type: number // 1-打卡奖励 2-商城兑换 3-系统调账 4-订单取消返还
  typeDesc: string
  changePoints: number
  beforePoints: number
  afterPoints: number
  description: string
  refId?: number
  businessType?: string
  businessId?: string
  operatorId?: number
  operatorName?: string
  createTime: string
}

export interface AdminPointRecordQuery extends PageQuery {
  keyword?: string
  studentNo?: string
  studentName?: string
  recordNo?: string
  type?: number
}

export interface PointAdjustDTO {
  studentId: number
  points: number
  reason: string
  approvalNo?: string
}

export interface LedgerMetricsVO {
  totalEarnedPoints: number
  totalSpentPoints: number
  totalRefundedPoints: number
  adjustCount: number
}

/**
 * 管理端全量查询积分对账流水 (GET /api/point/record/list)
 */
export function getAdminPointRecords(params: AdminPointRecordQuery): Promise<PageResult<StudentPointRecordVO>> {
  return http.get<PageResult<StudentPointRecordVO>>('/point/record/list', params)
}

/**
 * 获取对账大盘统计指标 (GET /api/point/record/metrics)
 */
export function getLedgerMetrics(): Promise<LedgerMetricsVO> {
  return http.get<LedgerMetricsVO>('/point/record/metrics')
}

/**
 * 获取学生榜单/学生基本数据用于调账下拉 (GET /api/student/score/rank)
 */
export function getLeaderboard(params?: any): Promise<any> {
  return http.get('/student/score/rank', params)
}

/**
 * 管理端人工特殊积分调账 (POST /api/student/score/adjust)
 */
export function adjustStudentPoints(data: PointAdjustDTO): Promise<void> {
  return http.post<void>('/student/score/adjust', data)
}
