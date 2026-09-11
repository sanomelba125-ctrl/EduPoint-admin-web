import { http } from '@/utils/request'
import type { PageQuery, PageResult } from './types'

export type QaCategory = 'RULE' | 'ACTIVITY' | 'GIFT' | 'SCORE' | 'OTHER'

export interface QaKnowledgeVO {
  id: number
  category: QaCategory
  question: string
  answer: string
  keywords?: string
  status: number // 0-禁用 1-启用
  sortOrder: number
  viewCount: number
  createTime?: string
  updateTime?: string
}

export interface QaKnowledgeDTO {
  id?: number
  category: string
  question: string
  answer: string
  keywords?: string
  sortOrder?: number
  status?: number
}

export interface QaKnowledgeQuery extends PageQuery {
  category?: string
  keyword?: string
  status?: number | string
}

/**
 * 分页获取知识库条目列表 (GET /api/admin/qa-knowledge/page)
 */
export function getQaKnowledgePage(params: QaKnowledgeQuery): Promise<PageResult<QaKnowledgeVO>> {
  return http.get<PageResult<QaKnowledgeVO>>('/admin/qa-knowledge/page', params)
}

/**
 * 根据 ID 获取单条知识库详情 (GET /api/admin/qa-knowledge/{id})
 */
export function getQaKnowledgeById(id: number): Promise<QaKnowledgeVO> {
  return http.get<QaKnowledgeVO>(`/admin/qa-knowledge/${id}`)
}

/**
 * 新增知识库条目 (POST /api/admin/qa-knowledge)
 */
export function createQaKnowledge(data: QaKnowledgeDTO): Promise<boolean> {
  return http.post<boolean>('/admin/qa-knowledge', data)
}

/**
 * 更新知识库条目 (PUT /api/admin/qa-knowledge)
 */
export function updateQaKnowledge(data: QaKnowledgeDTO): Promise<boolean> {
  return http.put<boolean>('/admin/qa-knowledge', data)
}

/**
 * 删除知识库条目 (DELETE /api/admin/qa-knowledge/{id})
 */
export function deleteQaKnowledge(id: number): Promise<boolean> {
  return http.delete<boolean>(`/admin/qa-knowledge/${id}`)
}

/**
 * 切换知识库条目启用状态 (PUT /api/admin/qa-knowledge/{id}/status?status=0|1)
 */
export function toggleQaKnowledgeStatus(id: number, status: number): Promise<boolean> {
  return http.put<boolean>(`/admin/qa-knowledge/${id}/status`, null, {
    params: { status }
  })
}
