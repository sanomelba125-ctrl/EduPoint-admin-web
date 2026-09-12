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
  ChatDotRound
} from '@element-plus/icons-vue'
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
        meta: { title: '数据可视化看板', icon: markRaw(DataBoard) }
      },
      {
        path: 'user',
        name: 'User',
        component: () => import('@/views/user/index.vue'),
        meta: { title: '系统用户管理', icon: markRaw(User) }
      },
      {
        path: 'student',
        name: 'Student',
        component: () => import('@/views/student/index.vue'),
        meta: { title: '学生档案管理', icon: markRaw(School) }
      },
      {
        path: 'activity',
        name: 'Activity',
        component: () => import('@/views/activity/index.vue'),
        meta: { title: '活动发布管理', icon: markRaw(Calendar) }
      },
      {
        path: 'activity/edit',
        name: 'ActivityEdit',
        component: () => import('@/views/activity/edit.vue'),
        meta: { title: '活动发布与编辑', icon: markRaw(Calendar), hidden: true, activeMenu: '/activity' }
      },
      {
        path: 'student-activity',
        name: 'StudentActivity',
        component: () => import('@/views/student-activity/index.vue'),
        meta: { title: '学生活动打卡', icon: markRaw(Checked) }
      },
      {
        path: 'student-point',
        name: 'StudentPoint',
        component: () => import('@/views/student-point/index.vue'),
        meta: { title: '学生积分管理', icon: markRaw(Coin) }
      },
      {
        path: 'gift',
        name: 'Gift',
        component: () => import('@/views/gift/index.vue'),
        meta: { title: '礼物库管理', icon: markRaw(Present) }
      },
      {
        path: 'student-gift',
        name: 'StudentGift',
        component: () => import('@/views/student-gift/index.vue'),
        meta: { title: '礼物兑换审核', icon: markRaw(ShoppingCart) }
      },
      {
        path: 'qa-knowledge',
        name: 'QaKnowledge',
        component: () => import('@/views/qa-knowledge/index.vue'),
        meta: { title: 'AI 客服知识库', icon: markRaw(ChatDotRound) }
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

// 权限路由守卫：防止未登录访问或伪造/过期Token假登录
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
  if (userStore.userInfo) {
    return next()
  }

  try {
    const user = await getCurrentUserApi()
    userStore.setUserInfo(user)
    next()
  } catch {
    userStore.logout()
    next('/login')
  }
})

export default router
