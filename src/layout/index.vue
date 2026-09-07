<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import {
  DataBoard,
  User,
  School,
  Calendar,
  Checked,
  Coin,
  Present,
  ShoppingCart,
  Fold,
  Expand,
  SwitchButton
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="userStore.isCollapse ? '64px' : '230px'" class="aside">
      <div class="logo-box">
        <el-icon :size="24" color="#409EFF"><Calendar /></el-icon>
        <span v-if="!userStore.isCollapse" class="logo-title">活动打卡管理系统</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="userStore.isCollapse"
        :collapse-transition="false"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
        class="menu"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <template #title>数据可视化看板</template>
        </el-menu-item>

        <el-menu-item index="/user">
          <el-icon><User /></el-icon>
          <template #title>系统用户管理</template>
        </el-menu-item>

        <el-menu-item index="/student">
          <el-icon><School /></el-icon>
          <template #title>学生信息管理</template>
        </el-menu-item>

        <el-menu-item index="/activity">
          <el-icon><Calendar /></el-icon>
          <template #title>活动发布管理</template>
        </el-menu-item>

        <el-menu-item index="/student-activity">
          <el-icon><Checked /></el-icon>
          <template #title>学生活动打卡</template>
        </el-menu-item>

        <el-menu-item index="/student-point">
          <el-icon><Coin /></el-icon>
          <template #title>学生积分管理</template>
        </el-menu-item>

        <el-menu-item index="/gift">
          <el-icon><Present /></el-icon>
          <template #title>礼物库管理</template>
        </el-menu-item>

        <el-menu-item index="/student-gift">
          <el-icon><ShoppingCart /></el-icon>
          <template #title>礼物兑换审核</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 右侧内容区 -->
    <el-container>
      <!-- 顶栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="userStore.toggleCollapse">
            <component :is="userStore.isCollapse ? Expand : Fold" />
          </el-icon>
          <span class="page-title">{{ route.meta.title || '系统管理' }}</span>
        </div>

        <div class="header-right">
          <el-dropdown>
            <span class="user-dropdown">
              <el-avatar :size="32" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
              <span class="username">管理员</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主视图 -->
      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.aside {
  background-color: #304156;
  transition: width 0.28s;
  display: flex;
  flex-direction: column;
}

.logo-box {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background-color: #2b3648;
  color: #fff;
}

.logo-title {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}

.menu {
  border-right: none;
  flex: 1;
  overflow-y: auto;
}

.header {
  height: 56px;
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
}

.page-title {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.username {
  font-size: 14px;
  color: #606266;
}

.main {
  background-color: #f0f2f5;
  padding: 16px;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
