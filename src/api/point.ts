import { http } from '@/utils/request'
import type { PageQuery, PageResult } from './types'
import { getStudentList, type StudentVO } from './student'

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
 * 调账目标学生搜索：复用学生档案检索接口，支持学号/姓名模糊搜索 + 动态分页（彻底摆脱榜单前100名限制）
 */
export async function searchStudentForAdjust(keyword: string = ''): Promise<StudentVO[]> {
  const res = await getStudentList({ page: 1, size: 20, keyword: keyword.trim() || undefined })
  return res?.records ?? []
}

/**
 * 管理端人工特殊积分调账 (POST /api/student/score/adjust)
 */
export function adjustStudentPoints(data: PointAdjustDTO): Promise<void> {
  return http.post<void>('/student/score/adjust', data)
}

