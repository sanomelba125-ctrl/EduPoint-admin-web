<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useWebSocket, onWsMessage } from '@/hooks/useWebSocket'
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
  SwitchButton,
  Bell,
  Refresh,
  Check,
  Delete
} from '@element-plus/icons-vue'
import {
  getMyNoticesApi,
  getUnreadNoticeCountApi,
  markNoticeAsReadApi,
  markAllNoticesAsReadApi,
  deleteNoticeApi,
  type SysNoticeVO
} from '@/api/notice'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { connect, disconnect, isConnected } = useWebSocket()

const activeMenu = computed(() => route.path)

// ================= 系统通知中心相关逻辑 =================
const drawerVisible = ref(false)
const noticeTab = ref<'all' | 'unread' | 'read'>('all')
const noticeLoading = ref(false)
const noticeList = ref<SysNoticeVO[]>([])
const unreadCount = ref(0)
const noticePage = ref(1)
const noticeTotal = ref(0)
let unsubscribeWs: (() => void) | null = null

// 拉取未读通知条数
const fetchUnreadCount = async () => {
  try {
    const res = await getUnreadNoticeCountApi()
    unreadCount.value = res || 0
  } catch (err) {
    console.warn('获取未读通知数失败:', err)
  }
}

// 分页拉取通知列表
const fetchNotices = async (reset = true) => {
  if (reset) {
    noticePage.value = 1
  }
  noticeLoading.value = true
  try {
    const isReadParam = noticeTab.value === 'unread' ? 0 : noticeTab.value === 'read' ? 1 : undefined
    const res = await getMyNoticesApi({
      page: noticePage.value,
      size: 20,
      isRead: isReadParam
    })
    const records = res?.records || []
    noticeList.value = records
    noticeTotal.value = res?.total || records.length
  } catch (err) {
    console.warn('获取通知列表失败:', err)
  } finally {
    noticeLoading.value = false
  }
}

// 打开抽屉
const openNoticeDrawer = () => {
  drawerVisible.value = true
  fetchNotices(true)
  fetchUnreadCount()
}

// 切换标签
const handleTabChange = () => {
  fetchNotices(true)
}

// 标记单条已读
const handleMarkRead = async (item: SysNoticeVO) => {
  if (item.isRead === 1) return
  try {
    await markNoticeAsReadApi(item.id)
    item.isRead = 1
    if (unreadCount.value > 0) unreadCount.value--
  } catch (err) {
    console.warn('标记已读失败:', err)
  }
}

// 全部标为已读
const handleMarkAllRead = async () => {
  try {
    await markAllNoticesAsReadApi()
    ElMessage.success('已全部标记为已读')
    unreadCount.value = 0
    fetchNotices(true)
  } catch (err) {
    ElMessage.error('操作失败')
  }
}

// 删除通知
const handleDeleteNotice = async (item: SysNoticeVO, e: Event) => {
  e.stopPropagation()
  try {
    await deleteNoticeApi(item.id)
    ElMessage.success('通知已删除')
    noticeList.value = noticeList.value.filter((n) => n.id !== item.id)
    if (item.isRead === 0 && unreadCount.value > 0) {
      unreadCount.value--
    }
  } catch (err) {
    ElMessage.error('删除通知失败')
  }
}

// 格式化时间
const formatNoticeTime = (timeStr?: string) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  if (isNaN(date.getTime())) return timeStr
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

// 获取通知标签样式
const getNoticeTagType = (type?: string) => {
  switch (type) {
    case 'gift_exchange':
      return 'warning'
    case 'gift_send':
      return 'success'
    case 'points_adjusted':
      return 'danger'
    case 'activity_card':
    case 'activity_checkin_reward':
      return 'success'
    case 'new_activity':
      return 'primary'
    default:
      return 'info'
  }
}

onMounted(() => {
  const adminId = userStore.userInfo?.id || 1
  connect('admin', adminId)
  fetchUnreadCount()

  // 监听实时 WebSocket 消息，自动刷新未读数及抽屉
  unsubscribeWs = onWsMessage(() => {
    fetchUnreadCount()
    if (drawerVisible.value) {
      fetchNotices(true)
    }
  })
})

onUnmounted(() => {
  if (unsubscribeWs) {
    unsubscribeWs()
  }
  disconnect()
})

const handleLogout = () => {
  disconnect()
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
          <!-- 实时推送就绪指示灯 -->
          <el-tag
            size="small"
            :type="isConnected ? 'success' : 'info'"
            effect="plain"
            round
            class="ws-status-tag"
          >
            <span class="ws-dot" :class="{ 'is-active': isConnected }"></span>
            {{ isConnected ? '实时推送就绪' : '推送连接中' }}
          </el-tag>

          <!-- 消息通知铃铛按钮与红点 -->
          <el-badge :value="unreadCount" :max="99" :hidden="unreadCount === 0" class="notice-badge">
            <el-button
              circle
              :icon="Bell"
              class="notice-bell-btn"
              @click="openNoticeDrawer"
              title="系统消息通知"
            />
          </el-badge>

          <!-- 管理员下拉菜单 -->
          <el-dropdown>
            <span class="user-dropdown">
              <el-avatar :size="32" :src="userStore.userInfo?.avatar || 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'" />
              <span class="username">{{ userStore.userInfo?.nickname || userStore.userInfo?.username || '管理员' }}</span>
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

  <!-- 系统通知中心侧边抽屉 -->
  <el-drawer
    v-model="drawerVisible"
    title="系统消息中心"
    direction="rtl"
    size="400px"
    class="notice-drawer"
  >
    <div class="drawer-header-actions">
      <el-radio-group v-model="noticeTab" size="small" @change="handleTabChange">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="unread">未读 ({{ unreadCount }})</el-radio-button>
        <el-radio-button value="read">已读</el-radio-button>
      </el-radio-group>

      <div class="actions-btn-group">
        <el-button
          link
          type="primary"
          size="small"
          :icon="Check"
          :disabled="unreadCount === 0"
          @click="handleMarkAllRead"
        >
          全部已读
        </el-button>
        <el-button
          link
          size="small"
          :icon="Refresh"
          @click="() => fetchNotices(true)"
        >
          刷新
        </el-button>
      </div>
    </div>

    <!-- 通知列表容器 -->
    <div v-loading="noticeLoading" class="notice-list-container">
      <div v-if="noticeList.length === 0" class="empty-box">
        <el-empty description="暂无通知记录" :image-size="80" />
      </div>

      <div
        v-for="item in noticeList"
        :key="item.id"
        class="notice-item"
        :class="{ 'is-unread': item.isRead === 0 }"
        @click="handleMarkRead(item)"
      >
        <div class="notice-item-top">
          <div class="tag-and-title">
            <span v-if="item.isRead === 0" class="unread-dot"></span>
            <el-tag size="small" :type="getNoticeTagType(item.type)" effect="light">
              {{ item.typeName || '通知' }}
            </el-tag>
            <span class="notice-title" :title="item.title">{{ item.title }}</span>
          </div>
          <el-button
            link
            type="danger"
            size="small"
            class="delete-btn"
            :icon="Delete"
            @click="(e) => handleDeleteNotice(item, e)"
          />
        </div>

        <div class="notice-content">{{ item.content }}</div>

        <div class="notice-footer">
          <span class="notice-time">{{ formatNoticeTime(item.createTime) }}</span>
          <span v-if="item.isRead === 1" class="read-status text-muted">已读</span>
          <span v-else class="read-status text-primary">点击标记已读</span>
        </div>
      </div>
    </div>
  </el-drawer>
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

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ws-status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  font-size: 12px;
}

.ws-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #909399;
  display: inline-block;
}

.ws-dot.is-active {
  background-color: #67c23a;
  box-shadow: 0 0 8px #67c23a;
  animation: ws-pulse 2s infinite;
}

@keyframes ws-pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(103, 194, 58, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0);
  }
}

.notice-badge {
  display: flex;
  align-items: center;
}

.notice-bell-btn {
  font-size: 16px;
  color: #606266;
  background-color: #f4f4f5;
  border: none;
  transition: all 0.2s ease;
}

.notice-bell-btn:hover {
  color: #409eff;
  background-color: #ecf5ff;
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

/* 抽屉样式 */
.drawer-header-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 12px;
}

.actions-btn-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.notice-list-container {
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  padding-right: 4px;
}

.empty-box {
  padding: 40px 0;
}

.notice-item {
  position: relative;
  background-color: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.notice-item:hover {
  border-color: #c6e2ff;
  box-shadow: 0 2px 10px rgba(64, 158, 255, 0.1);
}

.notice-item.is-unread {
  background-color: #f0f7ff;
  border-color: #b3d8ff;
}

.notice-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.tag-and-title {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.unread-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #f56c6c;
  flex-shrink: 0;
}

.notice-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-btn {
  opacity: 0.6;
}

.delete-btn:hover {
  opacity: 1;
}

.notice-content {
  font-size: 13px;
  line-height: 1.5;
  color: #606266;
  margin-bottom: 10px;
  word-break: break-all;
}

.notice-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.notice-time {
  color: #909399;
}

.read-status.text-muted {
  color: #c0c4cc;
}

.read-status.text-primary {
  color: #409eff;
  font-weight: 500;
}
</style>
