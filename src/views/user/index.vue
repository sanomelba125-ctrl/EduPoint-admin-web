<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  Plus,
  Search,
  Refresh,
  Edit,
  Key,
  Delete,
  User,
  Lock,
  Iphone
} from '@element-plus/icons-vue'
import ImageUploader from '@/components/ImageUploader.vue'
import {
  getUserList,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
  resetUserPassword,
  type SysUserVO,
  type SysUserQuery
} from '@/api/user'
import { useUserStore } from '@/store/user'
import { usePageList } from '@/hooks/usePageList'

const userStore = useUserStore()

// 列表与分页状态及检索
const statusLoadingId = ref<number | null>(null)

const {
  loading,
  list: userList,
  total,
  queryParams,
  load: fetchUserList,
  handleSearch,
  handleReset
} = usePageList<Omit<SysUserQuery, 'page' | 'size'>, SysUserVO>({
  initialFilters: {
    keyword: '',
    role: undefined,
    status: undefined
  },
  fetcher: (params) => getUserList(params)
})

// 表单弹窗状态
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const formData = reactive({
  id: 0,
  username: '',
  password: '',
  nickname: '',
  role: 'ADMIN',
  phone: '',
  avatar: '',
  status: 1
})

const formRules: FormRules = {
  username: [
    { required: true, message: '请输入管理员登录账号', trigger: 'blur' },
    { min: 3, max: 30, message: '账号长度在 3 到 30 个字符', trigger: 'blur' }
  ],
  nickname: [
    { required: true, message: '请输入管理员姓名或昵称', trigger: 'blur' },
    { max: 50, message: '姓名长度不能超过 50 个字符', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择权限角色', trigger: 'change' }
  ],
  phone: [
    { pattern: /^$|^1[3-9]\d{9}$/, message: '请输入有效的11位手机号码', trigger: 'blur' }
  ]
}

// 检查是否为初始超级管理员 (ID 为 1 或账号名为 admin)
const isSuperAdmin = (row?: { id?: number; username?: string }) => {
  if (!row) return false
  return row.id === 1 || row.username === 'admin'
}

// 当前登录用户 ID
const currentUserId = computed(() => userStore.userInfo?.id)

// 角色标签样式配置
const getRoleTag = (role?: string) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return { label: '超级管理员', type: 'danger' as const }
    case 'ADMIN':
      return { label: '普通管理员', type: 'primary' as const }
    case 'COUNSELOR':
      return { label: '辅导员', type: 'warning' as const }
    default:
      return { label: role || '未知角色', type: 'info' as const }
  }
}



// 状态快速切换
const handleToggleStatus = async (row: SysUserVO, newStatus: boolean) => {
  if (isSuperAdmin(row) && !newStatus) {
    ElMessage.warning('系统初始超级管理员不可停用！')
    return
  }

  const targetStatus = newStatus ? 1 : 0
  statusLoadingId.value = row.id
  try {
    await updateUserStatus(row.id, targetStatus)
    row.status = targetStatus
    ElMessage.success(targetStatus === 1 ? `已启用管理员账号: ${row.nickname}` : `已停用管理员账号: ${row.nickname}`)
  } catch (error) {
    console.error('更新管理员状态失败:', error)
  } finally {
    statusLoadingId.value = null
  }
}

// 打开新增弹窗
const handleOpenCreate = () => {
  isEdit.value = false
  formData.id = 0
  formData.username = ''
  formData.password = ''
  formData.nickname = ''
  formData.role = 'ADMIN'
  formData.phone = ''
  formData.avatar = ''
  formData.status = 1
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

// 打开编辑弹窗
const handleOpenEdit = (row: SysUserVO) => {
  isEdit.value = true
  formData.id = row.id
  formData.username = row.username
  formData.password = ''
  formData.nickname = row.nickname
  formData.role = row.role
  formData.phone = row.phone || ''
  formData.avatar = row.avatar || ''
  formData.status = row.status ?? 1
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      if (isEdit.value) {
        await updateUser({
          id: formData.id,
          nickname: formData.nickname,
          role: formData.role,
          phone: formData.phone || undefined,
          avatar: formData.avatar || undefined,
          status: formData.status,
          password: formData.password ? formData.password : undefined
        })
        ElMessage.success('管理员信息更新成功')
      } else {
        await createUser({
          username: formData.username,
          password: formData.password ? formData.password : '123',
          nickname: formData.nickname,
          role: formData.role,
          phone: formData.phone || undefined,
          avatar: formData.avatar || undefined
        })
        ElMessage.success('管理员账号新增成功（默认初始密码: 123）')
      }
      dialogVisible.value = false
      fetchUserList()
    } catch (error) {
      console.error('提交管理员信息失败:', error)
    } finally {
      submitting.value = false
    }
  })
}

// 重置管理员密码
const handleResetPassword = (row: SysUserVO) => {
  ElMessageBox.prompt(
    `请输入管理员 [${row.nickname} (${row.username})] 的新密码（留空默认重置为 123）：`,
    '重置管理员密码',
    {
      confirmButtonText: '确定重置',
      cancelButtonText: '取消',
      inputValue: '123',
      inputPattern: /^.{3,30}$/,
      inputErrorMessage: '密码长度需在 3 到 30 个字符之间'
    }
  ).then(async ({ value }) => {
    const pwd = value && value.trim() ? value.trim() : '123'
    await resetUserPassword(row.id, { newPassword: pwd })
    ElMessage.success(`管理员 [${row.nickname}] 密码已成功重置为: ${pwd}`)
  }).catch(() => {})
}

// 注销/删除管理员
const handleDelete = (row: SysUserVO) => {
  if (isSuperAdmin(row)) {
    ElMessage.warning('系统超级管理员账号受核心保护，禁止注销！')
    return
  }
  if (currentUserId.value && row.id === currentUserId.value) {
    ElMessage.warning('无法注销当前登录的操作员账号自身！')
    return
  }

  ElMessageBox.confirm(
    `确定要注销并删除管理员账号 [${row.nickname} (${row.username})] 吗？注销后该账号将无法再登录系统。`,
    '安全操作确认',
    {
      confirmButtonText: '确认注销',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    await deleteUser(row.id)
    ElMessage.success(`管理员 [${row.nickname}] 账号已成功注销`)
    fetchUserList()
  }).catch(() => {})
}

</script>

<template>
  <div class="user-management-container">
    <!-- 头部检索过滤区 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="queryParams" class="filter-form">
        <el-form-item label="关键字">
          <el-input
            v-model="queryParams.keyword"
            placeholder="搜索用户名或姓名"
            :prefix-icon="Search"
            clearable
            style="width: 200px;"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="权限角色">
          <el-select
            v-model="queryParams.role"
            placeholder="全部角色"
            clearable
            style="width: 150px;"
            @change="handleSearch"
            @clear="handleSearch"
          >
            <el-option label="超级管理员" value="SUPER_ADMIN" />
            <el-option label="普通管理员" value="ADMIN" />
            <el-option label="辅导员" value="COUNSELOR" />
          </el-select>
        </el-form-item>

        <el-form-item label="账号状态">
          <el-select
            v-model="queryParams.status"
            placeholder="全部状态"
            clearable
            style="width: 130px;"
            @change="handleSearch"
            @clear="handleSearch"
          >
            <el-option label="正常启用" :value="1" />
            <el-option label="已被禁用" :value="0" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>

        <div class="filter-right-action">
          <el-button type="success" :icon="Plus" @click="handleOpenCreate">新增管理员</el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 管理员表格展示区 -->
    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="loading"
        :data="userList"
        stripe
        border
        style="width: 100%"
        row-key="id"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />

        <el-table-column label="头像" width="75" align="center">
          <template #default="{ row }">
            <el-avatar :size="36" :src="row.avatar">
              {{ row.nickname ? row.nickname.charAt(0) : '管' }}
            </el-avatar>
          </template>
        </el-table-column>

        <el-table-column prop="username" label="登录账号" width="140">
          <template #default="{ row }">
            <span style="font-weight: 600; color: #303133;">{{ row.username }}</span>
            <el-tag
              v-if="isSuperAdmin(row)"
              size="small"
              type="danger"
              effect="plain"
              style="margin-left: 6px;"
            >
              内置
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="nickname" label="管理员姓名" min-width="140" />

        <el-table-column prop="role" label="权限角色" width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="getRoleTag(row.role).type" effect="light">
              {{ getRoleTag(row.role).label }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="phone" label="联系电话" width="140" align="center">
          <template #default="{ row }">
            {{ row.phone || '-' }}
          </template>
        </el-table-column>

        <el-table-column prop="status" label="账号状态" width="110" align="center">
          <template #default="{ row }">
            <el-tooltip
              :disabled="!isSuperAdmin(row)"
              content="系统初始超级管理员不可停用"
              placement="top"
            >
              <span>
                <el-switch
                  :model-value="row.status === 1"
                  :loading="statusLoadingId === row.id"
                  :disabled="isSuperAdmin(row)"
                  active-text="启用"
                  inactive-text="禁用"
                  inline-prompt
                  @change="(val) => handleToggleStatus(row, val as boolean)"
                />
              </span>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column prop="createTime" label="创建时间" min-width="170" align="center" />

        <el-table-column label="操作" width="230" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" size="small" @click="handleOpenEdit(row)">
              编辑
            </el-button>

            <el-button link type="warning" :icon="Key" size="small" @click="handleResetPassword(row)">
              重置密码
            </el-button>

            <el-tooltip
              :disabled="!isSuperAdmin(row) && row.id !== currentUserId"
              :content="isSuperAdmin(row) ? '系统内置超级管理员不可删除' : '当前登录账号不可自我注销'"
              placement="top"
            >
              <span>
                <el-button
                  link
                  type="danger"
                  :icon="Delete"
                  size="small"
                  :disabled="isSuperAdmin(row) || row.id === currentUserId"
                  @click="handleDelete(row)"
                >
                  注销
                </el-button>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="暂无符合条件的管理员记录" />
        </template>
      </el-table>

      <!-- 底部分页区 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.size"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchUserList"
          @current-change="fetchUserList"
        />
      </div>
    </el-card>

    <!-- 新增 / 编辑管理员弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '修改管理员信息' : '新增系统管理员账号'"
      width="560px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        style="padding-right: 20px; padding-top: 10px;"
      >
        <el-form-item label="登录账号" prop="username">
          <el-input
            v-model="formData.username"
            placeholder="请输入管理员登录账号 (如 counselor_li)"
            :prefix-icon="User"
            :disabled="isEdit"
          />
        </el-form-item>

        <el-form-item :label="isEdit ? '更新密码' : '登录密码'" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            show-password
            :placeholder="isEdit ? '若不修改请留空' : '默认初始密码为 123，可自定义'"
            :prefix-icon="Lock"
          />
        </el-form-item>

        <el-form-item label="姓名/昵称" prop="nickname">
          <el-input
            v-model="formData.nickname"
            placeholder="请输入管理员姓名或显示昵称"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item label="权限角色" prop="role">
          <el-select
            v-model="formData.role"
            placeholder="请分配权限角色"
            style="width: 100%;"
            :disabled="isEdit && isSuperAdmin(formData)"
          >
            <el-option label="超级管理员 (系统全局最高权限)" value="SUPER_ADMIN" />
            <el-option label="普通管理员 (活动、积分与对账管理)" value="ADMIN" />
            <el-option label="辅导员 (学生活动与基础信息审核)" value="COUNSELOR" />
          </el-select>
        </el-form-item>

        <el-form-item label="联系电话" prop="phone">
          <el-input
            v-model="formData.phone"
            placeholder="选填，11位手机号码"
            :prefix-icon="Iphone"
          />
        </el-form-item>

        <el-form-item label="用户头像" prop="avatar">
          <ImageUploader v-model="formData.avatar" label="头像" />
        </el-form-item>

        <el-form-item v-if="isEdit" label="账号状态" prop="status">
          <el-radio-group v-model="formData.status" :disabled="isSuperAdmin(formData)">
            <el-radio :value="1">正常启用</el-radio>
            <el-radio :value="0">停用禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ isEdit ? '保存修改' : '确认新增' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.user-management-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
  border-radius: 8px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  position: relative;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 18px;
}

.filter-right-action {
  margin-left: auto;
}

.table-card {
  border-radius: 8px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

</style>

