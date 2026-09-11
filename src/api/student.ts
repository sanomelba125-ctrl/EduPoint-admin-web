import { http } from '@/utils/request'
import type { PageQuery, PageResult } from './types'

export interface StudentVO {
  id: number
  studentNo: string
  name: string
  gender?: number
  avatar?: string
  openid?: string
  college?: string
  major?: string
  className: string
  phone?: string
  totalPoints: number
  currentPoints: number
  status: number // 0-冻结 1-正常
  createTime?: string
}

export interface StudentQuery extends PageQuery {
  className?: string
  college?: string
  major?: string
  status?: number
}

export interface StudentCreateDTO {
  studentNo: string
  name: string
  gender?: number
  className: string
  college?: string
  major?: string
  phone?: string
  avatar?: string
  password?: string
}

export interface StudentAdminUpdateDTO {
  id: number
  name?: string
  gender?: number
  className?: string
  college?: string
  major?: string
  phone?: string
  avatar?: string
  status?: number
  password?: string
}

export interface StudentResetPasswordDTO {
  newPassword?: string
}

/**
 * 管理端分页多条件查询学生档案列表 (GET /api/student/list)
 */
export function getStudentList(params: StudentQuery): Promise<PageResult<StudentVO>> {
  return http.get<PageResult<StudentVO>>('/student/list', params)
}

/**
 * 管理端录入新学生档案 (POST /api/student/create)
 */
export function createStudent(data: StudentCreateDTO): Promise<StudentVO> {
  return http.post<StudentVO>('/student/create', data)
}

/**
 * 管理端修改学生档案信息 (PUT /api/student/update)
 */
export function updateStudent(data: StudentAdminUpdateDTO): Promise<StudentVO> {
  return http.put<StudentVO>('/student/update', data)
}

/**
 * 管理端冻结/解冻学生账号 (PUT /api/student/{id}/status)
 */
export function updateStudentStatus(id: number, status: number): Promise<void> {
  return http.put<void>(`/student/${id}/status?status=${status}`, { status })
}

/**
 * 管理端重置学生密码 (PUT /api/student/{id}/reset-password)
 */
export function resetStudentPassword(id: number, data?: StudentResetPasswordDTO): Promise<void> {
  return http.put<void>(`/student/${id}/reset-password`, data || { newPassword: '123456' })
}

/**
 * 管理端删除/注销学生档案 (DELETE /api/student/{id})
 */
export function deleteStudent(id: number): Promise<void> {
  return http.delete<void>(`/student/${id}`)
}

/**
 * 获取系统中所有不重复的有效班级列表 (GET /api/student/classes)
 */
export function getStudentClasses(): Promise<string[]> {
  return http.get<string[]>('/student/classes')
}
