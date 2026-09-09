<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
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
  Iphone,
  School,
  Reading,
  Picture,
  UploadFilled,
  Check
} from '@element-plus/icons-vue'
import { uploadImageApi } from '@/api/common'
import {
  getStudentList,
  createStudent,
  updateStudent,
  updateStudentStatus,
  resetStudentPassword,
  deleteStudent,
  getStudentClasses,
  type StudentVO,
  type StudentQuery
} from '@/api/student'

// 头像上传七牛云状态
const uploadingAvatar = ref(false)

const beforeAvatarUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isImage) {
    ElMessage.error('只能上传图片格式文件 (JPG/PNG/WEBP)!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('上传头像图片不能超过 5MB!')
    return false
  }
  return true
}

const handleAvatarUpload = async (options: any) => {
  const { file } = options
  uploadingAvatar.value = true
  try {
    const url = await uploadImageApi(file)
    formData.avatar = url
    ElMessage.success('头像已成功上传至七牛云存储！')
  } catch (err: any) {
    console.error('上传七牛云异常:', err)
    ElMessage.error(err.message || '上传七牛云失败，请检查网络或后端配置')
  } finally {
    uploadingAvatar.value = false
  }
}

// 列表与分页状态
const loading = ref(false)
const studentList = ref<StudentVO[]>([])
const total = ref(0)
const classList = ref<string[]>([])
const statusLoadingId = ref<number | null>(null)

// 检索过滤参数
const queryParams = reactive<StudentQuery>({
  page: 1,
  size: 10,
  keyword: '',
  className: undefined,
  college: '',
  status: undefined
})

// 表单弹窗状态
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const formData = reactive({
  id: 0,
  studentNo: '',
  name: '',
  gender: 1,
  className: '',
  college: '',
  major: '',
  phone: '',
  avatar: '',
  password: '',
  status: 1
})

const formRules: FormRules = {
  studentNo: [
    { required: true, message: '请输入学生学号', trigger: 'blur' },
    { min: 3, max: 30, message: '学号长度需在 3 到 30 个字符之间', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入学生姓名', trigger: 'blur' },
    { max: 50, message: '姓名长度不能超过 50 个字符', trigger: 'blur' }
  ],
  className: [
    { required: true, message: '请输入或选择班级', trigger: ['blur', 'change'] }
  ],
  phone: [
    { pattern: /^$|^1[3-9]\d{9}$/, message: '请输入有效的11位手机号码', trigger: 'blur' }
  ]
}

// 加载可用班级列表
const fetchClasses = async () => {
  try {
    const res = await getStudentClasses()
    classList.value = res || []
  } catch (error) {
    console.error('获取班级列表失败:', error)
  }
}

// 加载学生档案列表
const fetchStudentList = async () => {
  loading.value = true
  try {
    const res = await getStudentList(queryParams)
    studentList.value = res.records || []
    total.value = res.total || 0
  } catch (error) {
    console.error('获取学生列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  queryParams.page = 1
  fetchStudentList()
}

// 重置
const handleReset = () => {
  queryParams.page = 1
  queryParams.keyword = ''
  queryParams.className = undefined
  queryParams.college = ''
  queryParams.status = undefined
  fetchStudentList()
}

// 状态快速切换 (正常/冻结)
const handleToggleStatus = async (row: StudentVO, newStatus: boolean) => {
  const targetStatus = newStatus ? 1 : 0
  statusLoadingId.value = row.id
  try {
    await updateStudentStatus(row.id, targetStatus)
    row.status = targetStatus
    ElMessage.success(targetStatus === 1 ? `学生 [${row.name}] 账号已恢复正常` : `学生 [${row.name}] 账号已被冻结`)
  } catch (error) {
    console.error('更新学生账号状态失败:', error)
  } finally {
    statusLoadingId.value = null
  }
}

// 打开录入学生弹窗
const handleOpenCreate = () => {
  isEdit.value = false
  formData.id = 0
  formData.studentNo = ''
  formData.name = ''
  formData.gender = 1
  formData.className = ''
  formData.college = ''
  formData.major = ''
  formData.phone = ''
  formData.avatar = ''
  formData.password = ''
  formData.status = 1
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

// 打开编辑弹窗
const handleOpenEdit = (row: StudentVO) => {
  isEdit.value = true
  formData.id = row.id
  formData.studentNo = row.studentNo
  formData.name = row.name
  formData.gender = row.gender ?? 1
  formData.className = row.className
  formData.college = row.college || ''
  formData.major = row.major || ''
  formData.phone = row.phone || ''
  formData.avatar = row.avatar || ''
  formData.password = ''
  formData.status = row.status ?? 1
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

// 提交表单保存
const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      if (isEdit.value) {
        await updateStudent({
          id: formData.id,
          name: formData.name,
          gender: formData.gender,
          className: formData.className,
          college: formData.college || undefined,
          major: formData.major || undefined,
          phone: formData.phone || undefined,
          avatar: formData.avatar || undefined,
          status: formData.status,
          password: formData.password ? formData.password : undefined
        })
        ElMessage.success('学生档案更新成功')
      } else {
        await createStudent({
          studentNo: formData.studentNo,
          name: formData.name,
          gender: formData.gender,
          className: formData.className,
          college: formData.college || undefined,
          major: formData.major || undefined,
          phone: formData.phone || undefined,
          avatar: formData.avatar || undefined,
          password: formData.password ? formData.password : '123456'
        })
        ElMessage.success('学生档案录入成功（初始密码: 123456）')
      }
      dialogVisible.value = false
      fetchStudentList()
      fetchClasses()
    } catch (error) {
      console.error('提交学生档案失败:', error)
    } finally {
      submitting.value = false
    }
  })
}

// 重置学生密码
const handleResetPassword = (row: StudentVO) => {
  ElMessageBox.prompt(
    `请输入学生 [${row.name} (${row.studentNo})] 的新密码（留空默认重置为 123456）：`,
    '重置学生登录密码',
    {
      confirmButtonText: '确定重置',
      cancelButtonText: '取消',
      inputValue: '123456',
      inputPattern: /^.{3,30}$/,
      inputErrorMessage: '密码长度需在 3 到 30 个字符之间'
    }
  ).then(async ({ value }) => {
    const pwd = value && value.trim() ? value.trim() : '123456'
    await resetStudentPassword(row.id, { newPassword: pwd })
    ElMessage.success(`学生 [${row.name}] 密码已成功重置为: ${pwd}，且该账号在线会话已被踢下线以强制重新认证`)
  }).catch(() => {})
}

// 注销删除学生
const handleDelete = (row: StudentVO) => {
  ElMessageBox.confirm(
    `确定要注销并删除学生 [${row.name} (${row.studentNo})] 的档案吗？注销后该学号将无法再登录移动端。`,
    '安全注销警告',
    {
      confirmButtonText: '确认注销',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    await deleteStudent(row.id)
    ElMessage.success(`学生 [${row.name}] 档案已成功注销`)
    fetchStudentList()
    fetchClasses()
  }).catch(() => {})
}

onMounted(() => {
  fetchStudentList()
  fetchClasses()
})
</script>

<template>
  <div class="student-management-container">
    <!-- 头部检索过滤区 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="queryParams" class="filter-form">
        <el-form-item label="学生信息">
          <el-input
            v-model="queryParams.keyword"
            placeholder="搜索学号或姓名"
            :prefix-icon="Search"
            clearable
            style="width: 190px;"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="所属班级">
          <el-select
            v-model="queryParams.className"
            placeholder="全部班级"
            clearable
            filterable
            style="width: 160px;"
            @change="handleSearch"
            @clear="handleSearch"
          >
            <el-option
              v-for="cls in classList"
              :key="cls"
              :label="cls"
              :value="cls"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="所属学院">
          <el-input
            v-model="queryParams.college"
            placeholder="学院名称模糊检索"
            clearable
            style="width: 160px;"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="账号状态">
          <el-select
            v-model="queryParams.status"
            placeholder="全部状态"
            clearable
            style="width: 120px;"
            @change="handleSearch"
            @clear="handleSearch"
          >
            <el-option label="正常启用" :value="1" />
            <el-option label="已冻结" :value="0" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>

        <div class="filter-right-action">
          <el-button type="success" :icon="Plus" @click="handleOpenCreate">录入新学生</el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 学生档案表格展示区 -->
    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="loading"
        :data="studentList"
        stripe
        border
        style="width: 100%"
        row-key="id"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />

        <el-table-column label="头像" width="75" align="center">
          <template #default="{ row }">
            <el-avatar :size="36" :src="row.avatar">
              {{ row.name ? row.name.charAt(0) : '生' }}
            </el-avatar>
          </template>
        </el-table-column>

        <el-table-column prop="studentNo" label="学号" width="130">
          <template #default="{ row }">
            <span style="font-weight: 600; color: #303133;">{{ row.studentNo }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="姓名" width="110" />

        <el-table-column prop="gender" label="性别" width="75" align="center">
          <template #default="{ row }">
            <el-tag :type="row.gender === 1 ? 'primary' : 'danger'" size="small">
              {{ row.gender === 1 ? '男' : (row.gender === 0 ? '女' : '未知') }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="className" label="班级" width="130" align="center">
          <template #default="{ row }">
            <el-tag effect="plain">{{ row.className }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="学院 / 专业" min-width="160">
          <template #default="{ row }">
            <span>{{ row.college || '-' }}</span>
            <span v-if="row.major" style="color: #909399; margin-left: 4px;">/ {{ row.major }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="phone" label="联系电话" width="130" align="center">
          <template #default="{ row }">
            {{ row.phone || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="可用 / 累计积分" width="150" align="center">
          <template #default="{ row }">
            <el-tag type="warning" size="small">{{ row.currentPoints ?? 0 }} 分</el-tag>
            <span style="color: #909399; font-size: 12px; margin-left: 4px;">(总 {{ row.totalPoints ?? 0 }})</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="账号状态" width="105" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              :loading="statusLoadingId === row.id"
              active-text="正常"
              inactive-text="冻结"
              inline-prompt
              @change="(val) => handleToggleStatus(row, val as boolean)"
            />
          </template>
        </el-table-column>

        <el-table-column prop="createTime" label="录入时间" min-width="165" align="center" />

        <el-table-column label="操作" width="230" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" size="small" @click="handleOpenEdit(row)">
              修改资料
            </el-button>

            <el-button link type="warning" :icon="Key" size="small" @click="handleResetPassword(row)">
              重置密码
            </el-button>

            <el-button link type="danger" :icon="Delete" size="small" @click="handleDelete(row)">
              注销
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="暂无符合条件的学生档案记录" />
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
          @size-change="fetchStudentList"
          @current-change="fetchStudentList"
        />
      </div>
    </el-card>

    <!-- 新增 / 编辑学生档案弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '修改学生档案' : '录入新学生档案'"
      width="560px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="90px"
        style="padding-right: 20px; padding-top: 10px;"
      >
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="学生学号" prop="studentNo">
              <el-input
                v-model="formData.studentNo"
                placeholder="如 20240101"
                :prefix-icon="User"
                :disabled="isEdit"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学生姓名" prop="name">
              <el-input
                v-model="formData.name"
                placeholder="学生真实姓名"
                :prefix-icon="User"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="所属班级" prop="className">
              <el-select
                v-model="formData.className"
                placeholder="选择或输入新班级"
                filterable
                allow-create
                default-first-option
                style="width: 100%;"
              >
                <el-option
                  v-for="cls in classList"
                  :key="cls"
                  :label="cls"
                  :value="cls"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学生性别" prop="gender">
              <el-radio-group v-model="formData.gender">
                <el-radio :value="1">男生</el-radio>
                <el-radio :value="0">女生</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="所属学院" prop="college">
              <el-input
                v-model="formData.college"
                placeholder="如 计算机科学学院"
                :prefix-icon="School"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所学专业" prop="major">
              <el-input
                v-model="formData.major"
                placeholder="如 软件工程"
                :prefix-icon="Reading"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input
                v-model="formData.phone"
                placeholder="11位手机号码"
                :prefix-icon="Iphone"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="isEdit ? '重设密码' : '初始密码'" prop="password">
              <el-input
                v-model="formData.password"
                type="password"
                show-password
                :placeholder="isEdit ? '留空则不修改密码' : '默认 123456'"
                :prefix-icon="Lock"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="学生头像" prop="avatar">
          <div class="avatar-uploader-container">
            <el-upload
              class="avatar-uploader"
              :show-file-list="false"
              :before-upload="beforeAvatarUpload"
              :http-request="handleAvatarUpload"
              accept="image/jpeg,image/png,image/jpg,image/webp"
            >
              <div v-if="formData.avatar" class="avatar-preview-box" v-loading="uploadingAvatar">
                <img :src="formData.avatar" class="avatar-img" />
                <div class="avatar-hover-mask">
                  <el-icon :size="16"><UploadFilled /></el-icon>
                  <span>更换图片</span>
                </div>
              </div>
              <div v-else class="avatar-placeholder" v-loading="uploadingAvatar">
                <el-icon class="uploader-icon" :size="20"><Plus /></el-icon>
                <span class="uploader-text">上传至七牛云</span>
              </div>
            </el-upload>
            <div class="avatar-info-box">
              <el-input
                v-model="formData.avatar"
                placeholder="支持直接上传图片，或在此粘贴外链 URL"
                clearable
                :prefix-icon="Picture"
              />
              <div class="avatar-tip">
                <span v-if="formData.avatar" class="qiniu-status">
                  <el-icon color="#67c23a"><Check /></el-icon> 七牛云存储地址就绪
                  <el-button link type="danger" size="small" @click="formData.avatar = ''" style="margin-left: 8px;">清空</el-button>
                </span>
                <span v-else class="tip-text">支持 JPG/PNG/WEBP，点击左侧按钮直接上传七牛云</span>
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item v-if="isEdit" label="账号状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :value="1">正常启用</el-radio>
            <el-radio :value="0">冻结禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ isEdit ? '保存修改' : '确认录入' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.student-management-container {
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

/* 头像上传组件样式 */
.avatar-uploader-container {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.avatar-uploader {
  flex-shrink: 0;
}

.avatar-preview-box {
  position: relative;
  width: 68px;
  height: 68px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  cursor: pointer;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-hover-mask {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.55);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.avatar-preview-box:hover .avatar-hover-mask {
  opacity: 1;
}

.avatar-placeholder {
  width: 68px;
  height: 68px;
  border: 1.5px dashed var(--el-border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  background-color: var(--el-fill-color-blank);
  transition: all 0.2s ease;
}

.avatar-placeholder:hover {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.uploader-icon {
  color: var(--el-text-color-secondary);
}

.uploader-text {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  line-height: 1;
}

.avatar-info-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.avatar-tip {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  display: flex;
  align-items: center;
}

.qiniu-status {
  color: var(--el-color-success);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
