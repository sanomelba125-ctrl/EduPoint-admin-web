import { http } from '@/utils/request'
import type { PageQuery, PageResult } from './types'

// ────────── VO / DTO 类型定义 ──────────

export interface ActivityVO {
  id: number
  title: string
  description?: string
  ruleDescription?: string
  coverImage?: string
  category?: string
  points: number
  startTime: string
  endTime: string
  registrationLimit?: number
  participantCount?: number
  waitlistEnabled?: number  // 0-关闭 1-开启
  locationName?: string
  locationAddress?: string
  longitude?: number
  latitude?: number
  locationRadius?: number
  locationCheckEnabled?: number  // 0-关闭 1-开启
  certificateEnabled?: number    // 0-关闭 1-开启
  certificateTitle?: string
  certificateIssuer?: string
  status: number  // 0-未开始 1-进行中 2-已截止 3-已关闭
  createTime?: string
}

export interface ActivitySaveDTO {
  id?: number
  title: string
  description?: string
  ruleDescription?: string
  coverImage?: string
  category?: string
  points: number
  startTime: string
  endTime: string
  registrationLimit?: number
  waitlistEnabled?: number
  locationName?: string
  locationAddress?: string
  longitude?: number
  latitude?: number
  locationRadius?: number
  locationCheckEnabled?: number
  certificateEnabled?: number
  certificateTitle?: string
  certificateIssuer?: string
}

export interface ActivityPageQuery extends PageQuery {
  keyword?: string
  status?: number | string
  category?: string
}

export interface QrCodeVO {
  activityId: number
  nonce: string
  sign: string
  expireTime: string
  validSeconds: number
  qrContent: string
}

/**
 * 管理端全量查询学生活动记录 GET /activity/record/list
 */
export interface ActivityRecordQuery {
  page?: number
  size?: number
  studentName?: string
  studentNo?: string
  activityTitle?: string
  status?: number | string
}

export interface ActivityRecordVO {
  id: number
  studentId?: number
  activityId?: number
  studentNo?: string
  studentName?: string
  activityTitle?: string
  signupTime?: string
  checkinTime?: string
  pointsAwarded?: number
  status?: number
  remark?: string
  createTime?: string
  updateTime?: string
}

// ────────── API 函数 ──────────

/**
 * 分页查询活动列表 GET /activity/page
 */
export function getActivityPage(params: ActivityPageQuery): Promise<PageResult<ActivityVO>> {
  return http.get<PageResult<ActivityVO>>('/activity/page', params)
}

/**
 * 查询活动详情 GET /activity/{id}
 */
export function getActivityDetail(id: number): Promise<ActivityVO> {
  return http.get<ActivityVO>(`/activity/${id}`)
}

/**
 * 管理端创建活动 POST /activity/create
 */
export function createActivity(data: ActivitySaveDTO): Promise<ActivityVO> {
  return http.post<ActivityVO>('/activity/create', data)
}

/**
 * 管理端修改活动 PUT /activity/update
 */
export function updateActivity(data: ActivitySaveDTO): Promise<ActivityVO> {
  return http.put<ActivityVO>('/activity/update', data)
}

/**
 * 管理端删除/归档活动 DELETE /activity/{id}
 */
export function archiveActivity(id: number): Promise<void> {
  return http.delete<void>(`/activity/${id}`)
}

/**
 * 管理端生成/刷新活动动态签到二维码 GET /activity/{id}/qrcode
 */
export function getActivityQrCode(id: number): Promise<QrCodeVO> {
  return http.get<QrCodeVO>(`/activity/${id}/qrcode`)
}

/**
 * 管理端全量查询学生活动记录 GET /activity/record/list
 */
export function getActivityRecords(params: ActivityRecordQuery): Promise<PageResult<ActivityRecordVO>> {
  return http.get<PageResult<ActivityRecordVO>>('/activity/record/list', params)
}
