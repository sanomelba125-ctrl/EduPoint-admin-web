import { http } from '@/utils/request'
import type { UserInfo } from '@/store/user'

export interface LoginParams {
  username: string
  password?: string
  captcha?: string
}

export interface LoginResult {
  token: string
  userInfo: UserInfo
}

/**
 * 管理员登录 (POST /api/auth/login)
 */
export function loginApi(params: LoginParams): Promise<LoginResult> {
  return http.post<LoginResult>('/auth/login', params)
}

/**
 * 退出登录 (POST /api/auth/logout)
 */
export function logoutApi(): Promise<void> {
  return http.post<void>('/auth/logout')
}

/**
 * 获取当前登录用户信息 (GET /api/auth/me)
 */
export function getCurrentUserApi(): Promise<UserInfo> {
  return http.get<UserInfo>('/auth/me')
}
