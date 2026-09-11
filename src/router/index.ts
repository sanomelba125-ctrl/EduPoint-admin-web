import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
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
        meta: { title: '数据可视化看板', icon: 'DataBoard' }
      },
      {
        path: 'user',
        name: 'User',
        component: () => import('@/views/user/index.vue'),
        meta: { title: '系统用户管理', icon: 'User' }
      },
      {
        path: 'student',
        name: 'Student',
        component: () => import('@/views/student/index.vue'),
        meta: { title: '学生档案管理', icon: 'School' }
      },
      {
        path: 'activity',
        name: 'Activity',
        component: () => import('@/views/activity/index.vue'),
        meta: { title: '活动发布管理', icon: 'Calendar' }
      },
      {
        path: 'activity/edit',
        name: 'ActivityEdit',
        component: () => import('@/views/activity/edit.vue'),
        meta: { title: '活动发布与编辑', icon: 'Calendar', hidden: true }
      },
      {
        path: 'student-activity',
        name: 'StudentActivity',
        component: () => import('@/views/student-activity/index.vue'),
        meta: { title: '学生活动管理', icon: 'Checked' }
      },
      {
        path: 'student-point',
        name: 'StudentPoint',
        component: () => import('@/views/student-point/index.vue'),
        meta: { title: '学生积分管理', icon: 'Coin' }
      },
      {
        path: 'gift',
        name: 'Gift',
        component: () => import('@/views/gift/index.vue'),
        meta: { title: '礼物库管理', icon: 'Present' }
      },
      {
        path: 'student-gift',
        name: 'StudentGift',
        component: () => import('@/views/student-gift/index.vue'),
        meta: { title: '礼物兑换审核', icon: 'ShoppingCart' }
      },
      {
        path: 'certificate',
        name: 'Certificate',
        component: () => import('@/views/certificate/index.vue'),
        meta: { title: '电子证书防伪', icon: 'Medal' }
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

// 简单路由守卫
router.beforeEach((to, _from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - 学生活动打卡与积分管理系统`
  }
  const token = localStorage.getItem('admin_token')
  if (!token && to.path !== '/login') {
    next('/login')
  } else if (token && to.path === '/login') {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
