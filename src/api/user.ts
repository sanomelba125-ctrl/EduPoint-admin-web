import { http } from '@/utils/request'
import type { PageQuery, PageResult } from './types'

export interface SysUserVO {
  id: number
  username: string
  nickname: string
  avatar?: string
  role: string
  phone?: string
  status: number // 0-禁用 1-启用
  createTime?: string
  updateTime?: string
}

export interface SysUserQuery extends PageQuery {
  username?: string
  nickname?: string
  role?: string
  status?: number
}

export interface SysUserCreateDTO {
  username: string
  password?: string
  nickname: string
  role: string
  phone?: string
  avatar?: string
}

export interface SysUserUpdateDTO {
  id: number
  nickname?: string
  role?: string
  phone?: string
  avatar?: string
  status?: number
  password?: string
}

export interface SysUserResetPasswordDTO {
  newPassword?: string
}

/**
 * 分页查询系统管理员列表 (GET /api/user/list)
 */
export function getUserList(params: SysUserQuery): Promise<PageResult<SysUserVO>> {
  return http.get<PageResult<SysUserVO>>('/user/list', params)
}

/**
 * 新增管理员账号 (POST /api/user/create)
 */
export function createUser(data: SysUserCreateDTO): Promise<SysUserVO> {
  return http.post<SysUserVO>('/user/create', data)
}

/**
 * 修改管理员信息 (PUT /api/user/update)
 */
export function updateUser(data: SysUserUpdateDTO): Promise<SysUserVO> {
  return http.put<SysUserVO>('/user/update', data)
}

/**
 * 启用/停用管理员账号 (PUT /api/user/{id}/status)
 */
export function updateUserStatus(id: number, status: number): Promise<void> {
  return http.put<void>(`/user/${id}/status?status=${status}`, { status })
}

/**
 * 删除/注销管理员账号 (DELETE /api/user/{id})
 */
export function deleteUser(id: number): Promise<void> {
  return http.delete<void>(`/user/${id}`)
}

/**
 * 重置管理员密码 (PUT /api/user/{id}/reset-password)
 */
export function resetUserPassword(id: number, data?: SysUserResetPasswordDTO): Promise<void> {
  return http.put<void>(`/user/${id}/reset-password`, data || { newPassword: '123456' })
}
