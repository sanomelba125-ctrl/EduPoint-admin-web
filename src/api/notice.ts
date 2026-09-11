import { http } from '@/utils/request'
import type { PageQuery, PageResult } from './types'

export interface SysNoticeVO {
  id: number
  receiverType: number // 1-管理员 2-学生
  receiverId: number
  type: string // new_activity, gift_exchange, activity_card, gift_send, points_adjusted, waitlist_promoted
  typeName: string
  title: string
  content: string
  bizId?: number
  isRead: number // 0-未读 1-已读
  readTime?: string
  createTime: string
}

export interface NoticeQuery extends PageQuery {
  isRead?: number
  keyword?: string
}

/**
 * 分页查询当前用户系统通知列表
 * GET /api/notice/my-list
 */
export function getMyNoticesApi(params?: NoticeQuery) {
  return http.get<PageResult<SysNoticeVO>>('/notice/my-list', params)
}

/**
 * 获取未读通知数量
 * GET /api/notice/unread-count
 */
export function getUnreadNoticeCountApi() {
  return http.get<number>('/notice/unread-count')
}

/**
 * 标记单条通知为已读
 * PUT /api/notice/{id}/read
 */
export function markNoticeAsReadApi(id: number) {
  return http.put<boolean>(`/notice/${id}/read`)
}

/**
 * 一键全部标记为已读
 * PUT /api/notice/read-all
 */
export function markAllNoticesAsReadApi() {
  return http.put<boolean>('/notice/read-all')
}

/**
 * 删除通知 (逻辑删除)
 * DELETE /api/notice/{id}
 */
export function deleteNoticeApi(id: number) {
  return http.delete<boolean>(`/notice/${id}`)
}
