<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { loginApi } from '@/api/auth'

const router = useRouter()
const userStore = useUserStore()

const loginFormRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = reactive<FormRules>({
  username: [
    { required: true, message: '请输入管理员用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入统一认证密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 位', trigger: 'blur' }
  ]
})

const handleLogin = async () => {
  if (!loginFormRef.value) return
  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true

    try {
      // 发起真实后端管理员认证接口
      const res = await loginApi({
        username: form.username.trim(),
        password: form.password.trim()
      })

      if (res && res.token) {
        userStore.setToken(res.token)
        const info = res.userInfo || res.user || {
          id: 1,
          username: form.username,
          nickname: '超级管理员'
        }
        userStore.setUserInfo(info)
        ElMessage.success('管理员身份鉴权成功，正在进入系统...')
        router.push('/dashboard')
      }
    } catch (err: any) {
      // 若后端离线或未启动，提供高保真原型容灾演示模式
      console.warn('后端连接异常或鉴权失败，尝试容灾匹配:', err)
      if (form.username === 'admin_super' && form.password === 'admin123') {
        userStore.setToken('token_adm_mock_' + Date.now())
        userStore.setUserInfo({
          id: 1,
          username: 'admin_super',
          nickname: '超级管理员'
        })
        ElMessage.success('演示模式鉴权通过')
        router.push('/dashboard')
      } else if (err?.message) {
        ElMessage.error(err.message || '登录失败：用户名或密码错误')
      }
    } finally {
      loading.value = false
    }
  })
}

// 一键填入演示账号
const prefillTestAccount = () => {
  form.username = 'admin_super'
  form.password = 'admin123'
}
</script>

<template>
  <div class="login-wrapper">
    <div class="login-card">
      <!-- 品牌头部区 -->
      <div class="brand-header">
        <div class="brand-logo-icon">
          <svg viewBox="0 0 24 24">
            <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z" />
          </svg>
        </div>
        <h1 class="brand-title">EduPoint 管理控制台</h1>
        <p class="brand-sub">校园活动发布、积分核销与防伪凭证管理系统</p>
      </div>

      <!-- 登录表单 -->
      <el-form ref="loginFormRef" :model="form" :rules="rules" class="login-form" @keyup.enter="handleLogin">
        <el-form-item label="管理员账号" prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入管理员用户名"
            size="large"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>

        <el-form-item label="统一认证密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入系统口令"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          class="login-btn"
          :loading="loading"
          @click="handleLogin"
        >
          {{ loading ? '身份鉴权中...' : '安全登录系统' }}
        </el-button>
      </el-form>

      <!-- 业务安全规约说明卡片 -->
      <div class="auth-alert-box">
        <strong>安全规约说明：</strong><br />
        管理端采用独立权限隔离策略，与移动端学生 Token 严格隔离。登录凭证有效期 2 小时，所有接口请求均受 Spring Security RBAC 鉴权保护并审计留痕。
      </div>

      <!-- 快捷填入演示账号 -->
      <div class="quick-prefill-bar">
        <el-button type="info" text size="small" @click="prefillTestAccount">
          一键填入演示账号 (admin_super / admin123)
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  width: 100vw;
  background-color: #2d3a4b;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 36px 32px 28px;
  box-sizing: border-box;
}

.brand-header {
  text-align: center;
  margin-bottom: 24px;
}

.brand-logo-icon {
  width: 44px;
  height: 44px;
  margin: 0 auto 12px;
  background: #409eff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.brand-logo-icon svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.brand-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  letter-spacing: 0.5px;
}

.brand-sub {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
  margin-bottom: 0;
}

.login-form {
  margin-top: 20px;
}

.login-form :deep(.el-form-item__label) {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
  padding-bottom: 4px;
}

.login-btn {
  width: 100%;
  height: 42px;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
  margin-top: 8px;
  border-radius: 4px;
}

.auth-alert-box {
  margin-top: 22px;
  padding: 12px;
  background: #f4f4f5;
  border: 1px solid #e9e9eb;
  border-radius: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

.auth-alert-box strong {
  color: #303133;
}

.quick-prefill-bar {
  margin-top: 16px;
  text-align: center;
  border-top: 1px solid #ebeef5;
  padding-top: 12px;
}
</style>
