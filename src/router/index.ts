import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { markRaw } from 'vue'
import {
  DataBoard,
  User,
  School,
  Calendar,
  Checked,
  Coin,
  Present,
  ShoppingCart,
  ChatDotRound,
  Medal
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import Layout from '@/layout/index.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '系统登录', hidden: true }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { 
          title: '数据可视化看板', 
          icon: markRaw(DataBoard),
          roles: ['SUPER_ADMIN', 'ADMIN', 'COUNSELOR']
        }
      },
      {
        path: 'user',
        name: 'User',
        component: () => import('@/views/user/index.vue'),
        meta: { 
          title: '系统用户管理', 
          icon: markRaw(User),
          roles: ['SUPER_ADMIN'] // 仅超级管理员有权访问
        }
      },
      {
        path: 'student',
        name: 'Student',
        component: () => import('@/views/student/index.vue'),
        meta: { 
          title: '学生档案管理', 
          icon: markRaw(School),
          roles: ['SUPER_ADMIN', 'ADMIN', 'COUNSELOR']
        }
      },
      {
        path: 'activity',
        name: 'Activity',
        component: () => import('@/views/activity/index.vue'),
        meta: { 
          title: '活动发布管理', 
          icon: markRaw(Calendar),
          roles: ['SUPER_ADMIN', 'ADMIN', 'COUNSELOR']
        }
      },
      {
        path: 'activity/edit',
        name: 'ActivityEdit',
        component: () => import('@/views/activity/edit.vue'),
        meta: { 
          title: '活动发布与编辑', 
          icon: markRaw(Calendar), 
          hidden: true, 
          activeMenu: '/activity',
          roles: ['SUPER_ADMIN', 'ADMIN', 'COUNSELOR']
        }
      },
      {
        path: 'student-activity',
        name: 'StudentActivity',
        component: () => import('@/views/student-activity/index.vue'),
        meta: { 
          title: '学生活动打卡', 
          icon: markRaw(Checked),
          roles: ['SUPER_ADMIN', 'ADMIN', 'COUNSELOR']
        }
      },
      {
        path: 'student-point',
        name: 'StudentPoint',
        component: () => import('@/views/student-point/index.vue'),
        meta: { 
          title: '学生积分管理', 
          icon: markRaw(Coin),
          roles: ['SUPER_ADMIN', 'ADMIN', 'COUNSELOR']
        }
      },
      {
        path: 'gift',
        name: 'Gift',
        component: () => import('@/views/gift/index.vue'),
        meta: { 
          title: '礼物库管理', 
          icon: markRaw(Present),
          roles: ['SUPER_ADMIN', 'ADMIN'] // 辅导员无权访问礼物进销存
        }
      },
      {
        path: 'student-gift',
        name: 'StudentGift',
        component: () => import('@/views/student-gift/index.vue'),
        meta: { 
          title: '礼物兑换审核', 
          icon: markRaw(ShoppingCart),
          roles: ['SUPER_ADMIN', 'ADMIN']
        }
      },
      {
        path: 'certificate',
        name: 'Certificate',
        component: () => import('@/views/certificate/index.vue'),
        meta: { title: '电子证书防伪', icon: markRaw(Medal) }
      },
      {
        path: 'qa-knowledge',
        name: 'QaKnowledge',
        component: () => import('@/views/qa-knowledge/index.vue'),
        meta: { 
          title: '知识库管理 (QA)', 
          icon: markRaw(ChatDotRound),
          roles: ['SUPER_ADMIN', 'ADMIN']
        }
      },
      {
        path: 'ai-simulator',
        name: 'AiSimulator',
        component: () => import('@/views/ai-simulator/index.vue'),
        meta: { 
          title: '🤖 AI 对话与工具调度', 
          icon: markRaw(ChatDotRound),
          roles: ['SUPER_ADMIN', 'ADMIN']
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

import { useUserStore } from '@/store/user'
import { getCurrentUserApi } from '@/api/auth'

// 权限路由守卫：防止未登录访问或非授权角色 URL 越权偷渡
router.beforeEach(async (to, _from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - 学生活动打卡与积分管理系统`
  }
  const token = localStorage.getItem('admin_token')
  if (!token) {
    return to.path === '/login' ? next() : next('/login')
  }
  if (to.path === '/login') {
    return next('/dashboard')
  }

  const userStore = useUserStore()
  if (!userStore.userInfo) {
    try {
      const user = await getCurrentUserApi()
      userStore.setUserInfo(user)
    } catch {
      userStore.logout()
      return next('/login')
    }
  }

  // 严格角色权限校验拦截
  const userRole = userStore.userInfo?.role
  const requiredRoles = to.meta.roles as string[] | undefined
  if (requiredRoles && requiredRoles.length > 0) {
    if (!userRole || !requiredRoles.includes(userRole)) {
      ElMessage.warning('权限不足：当前角色无权访问该功能模块')
      return next({ path: '/dashboard', replace: true })
    }
  }

  next()
})

export default router
