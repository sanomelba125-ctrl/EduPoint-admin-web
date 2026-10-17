<template>
  <div class="not-found-wrap">
    <div class="not-found-card">
      <div class="code">404</div>
      <h2 class="title">页面不存在</h2>
      <p class="desc">你访问的页面可能已被移除、重命名，或地址输入有误。</p>
      <div class="actions">
        <el-button type="primary" @click="goHome">
          <el-icon class="mr-1"><HomeFilled /></el-icon>
          返回数据看板
        </el-button>
        <el-button @click="goBack">返回上一页</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { HomeFilled } from '@element-plus/icons-vue'

const router = useRouter()

const goHome = () => {
  router.push('/dashboard')
}

const goBack = () => {
  // 无历史栈时（直接粘贴链接进入）回退会失败，兜底回看板
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/dashboard')
  }
}
</script>

<style scoped>
.not-found-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 220px);
}

.not-found-card {
  text-align: center;
  padding: 48px 64px;
  background: #ffffff;
  border-radius: var(--app-radius-lg);
  box-shadow: var(--app-shadow-md);
}

.code {
  font-size: 84px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 4px;
  background: linear-gradient(135deg, var(--app-color-primary) 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.title {
  margin: 18px 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--app-text-1);
}

.desc {
  margin: 0 0 28px;
  font-size: 14px;
  color: var(--app-text-3);
}

.actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.mr-1 {
  margin-right: 4px;
}
</style>
