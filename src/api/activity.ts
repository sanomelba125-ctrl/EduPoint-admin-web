import { http } from '@/utils/request'
import type { PageQuery, PageResult } from './types'

export interface ActivityVO {
  id: number
  title: string
  description?: string
  points: number
  startTime: string
  endTime: string
  location?: string
  status: number // 0-未开始 1-进行中 2-已截止
  participantCount?: number
  createTime?: string
}

export interface ActivityDTO {
  title: string
  description?: string
  points: number
  startTime: string
  endTime: string
  location?: string
  status?: number
}

export interface ActivityQuery extends PageQuery {
  status?: number
}

/**
 * 分页获取活动列表 (GET /api/activities)
 */
export function getActivityList(params: ActivityQuery): Promise<PageResult<ActivityVO>> {
  return http.get<PageResult<ActivityVO>>('/activities', params)
}

/**
 * 根据 ID 获取活动详情 (GET /api/activities/{id})
 */
export function getActivityById(id: number): Promise<ActivityVO> {
  return http.get<ActivityVO>(`/activities/${id}`)
}

/**
 * 新增活动 (POST /api/activities)
 */
export function createActivity(data: ActivityDTO): Promise<void> {
  return http.post<void>('/activities', data)
}

/**
 * 修改活动 (PUT /api/activities/{id})
 */
export function updateActivity(id: number, data: ActivityDTO): Promise<void> {
  return http.put<void>(`/activities/${id}`, data)
}

/**
 * 删除活动 (DELETE /api/activities/{id})
 */
export function deleteActivity(id: number): Promise<void> {
  return http.delete<void>(`/activities/${id}`)
}
