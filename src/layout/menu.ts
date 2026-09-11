import type { RouteRecordRaw } from 'vue-router'
import { routes } from '@/router'

export interface MenuItem {
  path: string
  title: string
  icon?: unknown
}

/**
 * 从路由配置派生生成侧边栏菜单项
 * 避免 Layout 侧边栏与 Router 路由表双重硬编码导致的文案和路径漂移
 */
export function buildMenuItems(customRoutes?: RouteRecordRaw[]): MenuItem[] {
  const targetRoutes = customRoutes || routes
  const layoutRoute = targetRoutes.find((r) => r.path === '/')
  return (layoutRoute?.children ?? [])
    .filter((child: RouteRecordRaw) => !child.meta?.hidden)
    .map((child) => ({
      path: `/${String(child.path).replace(/^\//, '')}`,
      title: (child.meta?.title as string) ?? '',
      icon: child.meta?.icon
    }))
}
