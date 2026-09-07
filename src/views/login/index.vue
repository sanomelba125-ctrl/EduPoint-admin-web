<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const form = reactive({
  username: 'admin',
  password: '123'
})

const handleLogin = () => {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  // 模拟登录成功，写入 Token
  setTimeout(() => {
    loading.value = false
    userStore.setToken('mock_admin_token_' + Date.now())
    userStore.setUserInfo({ id: 1, username: form.username, nickname: '超级管理员' })
    ElMessage.success('登录成功')
    router.push('/dashboard')
  }, 600)
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h2>学生活动打卡与积分管理</h2>
        <p>系统管理后台登录</p>
      </div>

      <el-form :model="form" class="login-form">
        <el-form-item>
          <el-input v-model="form.username" size="large" placeholder="管理员账号" :prefix-icon="User" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" size="large" type="password" placeholder="登录密码" :prefix-icon="Lock" @keyup.enter="handleLogin" />
        </el-form-item>
        <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleLogin">
          立即登录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  height: 100vh;
  width: 100vw;
  background: linear-gradient(135deg, #2b3648 0%, #1a2332 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: 400px;
  background: #fff;
  border-radius: 12px;
  padding: 36px 32px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-header h2 {
  font-size: 20px;
  color: #303133;
  margin: 0 0 8px 0;
}

.login-header p {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.login-form {
  margin-top: 20px;
}

.login-btn {
  width: 100%;
  margin-top: 10px;
}
</style>
