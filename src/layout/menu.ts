import type { RouteRecordRaw } from 'vue-router'
import { routes } from '@/router'

export interface MenuItem {
  path: string
  title: string
  icon?: unknown
}

/**
 * 从路由配置派生生成侧边栏菜单项
 * 支持根据当前用户的 RBAC 角色过滤未授权菜单，避免越权展示
 */
export function buildMenuItems(userRole?: string, customRoutes?: RouteRecordRaw[]): MenuItem[] {
  const targetRoutes = customRoutes || routes
  const layoutRoute = targetRoutes.find((r) => r.path === '/')
  return (layoutRoute?.children ?? [])
    .filter((child: RouteRecordRaw) => {
      // 1. 隐藏路由直接过滤
      if (child.meta?.hidden) {
        return false
      }
      // 2. 角色权限过滤
      const roles = child.meta?.roles as string[] | undefined
      if (roles && roles.length > 0) {
        return userRole ? roles.includes(userRole) : false
      }
      return true
    })
    .map((child) => ({
      path: `/${String(child.path).replace(/^\//, '')}`,
      title: (child.meta?.title as string) ?? '',
      icon: child.meta?.icon
    }))
}
