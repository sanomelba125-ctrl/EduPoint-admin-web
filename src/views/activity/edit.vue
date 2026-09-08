<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Upload } from '@element-plus/icons-vue'
import {
  getActivityDetail,
  createActivity,
  updateActivity,
  type ActivitySaveDTO
} from '@/api/activity'

const route = useRoute()
const router = useRouter()

const isEdit = ref(false)
const activityId = ref<number | null>(null)
const submitting = ref(false)
const formRef = ref()

// ──────── 表单数据 ────────
const form = reactive<ActivitySaveDTO>({
  title: '',
  description: '',
  ruleDescription: '',
  coverImage: '',
  category: 'ACADEMIC',
  points: 30,
  startTime: '',
  endTime: '',
  registrationLimit: 100,
  waitlistEnabled: 1,
  locationName: '',
  locationAddress: '',
  longitude: undefined,
  latitude: undefined,
  locationRadius: 500,
  locationCheckEnabled: 1,
  certificateEnabled: 0,
  certificateTitle: '',
  certificateIssuer: ''
})

// ──────── 表单校验规则 ────────
const rules = {
  title: [{ required: true, message: '请输入活动标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择活动分类', trigger: 'change' }],
  points: [
    { required: true, message: '请输入奖励积分', trigger: 'blur' },
    { type: 'number', min: 1, max: 500, message: '积分范围 1-500', trigger: 'blur' }
  ],
  startTime: [{ required: true, message: '请选择活动开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择活动结束时间', trigger: 'change' }],
  registrationLimit: [
    { required: true, message: '请输入容量上限', trigger: 'blur' },
    { type: 'number', min: 0, max: 2000, message: '容量范围 0-2000，0 表示不限人数', trigger: 'blur' }
  ]
}

// ──────── 分类枚举 ────────
const categoryOptions = [
  { value: 'ACADEMIC', label: '学术科技' },
  { value: 'VOLUNTEER', label: '志愿公益' },
  { value: 'SPORTS', label: '体育竞技' },
  { value: 'PRACTICE', label: '实践文娱' },
  { value: 'OTHER', label: '其他拓展' }
]

// ──────── 预设地点 ────────
const presetLocations = [
  { name: '信息学部 401 报告厅', address: '信息学部主楼4层', lng: 118.156821, lat: 24.629104 },
  { name: '大学生活动中心', address: '大学生活动中心一层', lng: 118.154210, lat: 24.628041 },
  { name: '东区主体育场', address: '东校区主体育场', lng: 118.159330, lat: 24.631220 },
  { name: '工程训练中心', address: '工程训练中心实验楼', lng: 118.152190, lat: 24.626880 },
  { name: '图书馆报告厅', address: '图书馆A区一层东侧', lng: 118.155600, lat: 24.628800 }
]

// ──────── 地图标记位置（模拟展示） ────────
const mapPinStyle = ref({ left: '50%', top: '50%' })
const mapCircleStyle = ref({ left: '50%', top: '50%', width: '140px', height: '140px' })

function handleMapClick(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  mapPinStyle.value = { left: `${x}px`, top: `${y}px` }
  mapCircleStyle.value = {
    left: `${x}px`,
    top: `${y}px`,
    width: `${Math.round((form.locationRadius! / 500) * 140)}px`,
    height: `${Math.round((form.locationRadius! / 500) * 140)}px`
  }
  // 模拟坐标生成
  form.longitude = parseFloat((118.15 + x / 2000).toFixed(6))
  form.latitude = parseFloat((24.62 + y / 2000).toFixed(6))
}

function setPresetLocation(preset: typeof presetLocations[0]) {
  form.locationName = preset.name
  form.locationAddress = preset.address
  form.longitude = preset.lng
  form.latitude = preset.lat
  ElMessage.success(`已设置中心点：${preset.name}`)
}

function updateRadiusCircle(val: number) {
  const size = Math.round((val / 500) * 140)
  mapCircleStyle.value = { ...mapCircleStyle.value, width: `${size}px`, height: `${size}px` }
}

// ──────── 图片上传（占位） ────────
function handleCoverUpload(info: any) {
  // 实际项目中调用 /common/upload 接口
  ElMessage.info('上传功能需对接七牛云 /common/upload 接口')
}

// ──────── 初始化 ────────
onMounted(async () => {
  const id = route.query.id
  if (id) {
    isEdit.value = true
    activityId.value = Number(id)
    await loadDetail(activityId.value)
  }
})

async function loadDetail(id: number) {
  try {
    const res = await getActivityDetail(id)
    Object.assign(form, {
      title: res.title,
      description: res.description ?? '',
      ruleDescription: res.ruleDescription ?? '',
      coverImage: res.coverImage ?? '',
      category: res.category ?? 'ACADEMIC',
      points: res.points,
      startTime: res.startTime,
      endTime: res.endTime,
      registrationLimit: res.registrationLimit ?? 100,
      waitlistEnabled: res.waitlistEnabled ?? 1,
      locationName: res.locationName ?? '',
      locationAddress: res.locationAddress ?? '',
      longitude: res.longitude,
      latitude: res.latitude,
      locationRadius: res.locationRadius ?? 500,
      locationCheckEnabled: res.locationCheckEnabled ?? 1,
      certificateEnabled: res.certificateEnabled ?? 0,
      certificateTitle: res.certificateTitle ?? '',
      certificateIssuer: res.certificateIssuer ?? ''
    })
  } catch {
    ElMessage.error('活动信息加载失败')
    router.back()
  }
}

// ──────── 提交 ────────
async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    ElMessage.warning('请检查表单填写是否完整')
    return
  }

  submitting.value = true
  try {
    if (isEdit.value && activityId.value) {
      await updateActivity({ ...form, id: activityId.value })
      ElMessage.success('活动修改成功')
    } else {
      await createActivity(form)
      ElMessage.success('活动发布成功')
    }
    router.push('/activity')
  } catch {
    // 错误已由拦截器处理
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.push('/activity')
}
</script>

<template>
  <div class="edit-page">
    <!-- 顶部操作栏 -->
    <div class="page-header">
      <el-button text :icon="ArrowLeft" @click="goBack">返回活动列表</el-button>
      <span class="divider">/</span>
      <span class="page-title">{{ isEdit ? '编辑活动' : '发布新活动' }}</span>
      <div class="header-actions">
        <el-button @click="goBack">取消返回</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          保存并{{ isEdit ? '更新' : '发布' }}活动
        </el-button>
      </div>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="140px" class="edit-form">

      <!-- ① 基本信息 -->
      <el-card shadow="never" class="form-section">
        <template #header>
          <span class="section-title">① 活动基本信息</span>
        </template>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="活动标题" prop="title">
              <el-input v-model="form.title" placeholder="例：开源鸿蒙生态前沿技术公开课" maxlength="80" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="业务分类" prop="category">
              <el-select v-model="form.category" style="width: 100%;">
                <el-option
                  v-for="opt in categoryOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="奖励积分" prop="points">
              <el-input-number
                v-model="form.points"
                :min="1"
                :max="500"
                controls-position="right"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="报名容量上限" prop="registrationLimit">
              <el-input-number
                v-model="form.registrationLimit"
                :min="0"
                :max="2000"
                controls-position="right"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="候补排队机制">
              <el-select v-model="form.waitlistEnabled" style="width: 100%;">
                <el-option :value="1" label="启用候补队列（满额自动排队）" />
                <el-option :value="0" label="关闭候补（满额即停止报名）" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="活动详细描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="填写活动介绍、主讲人背景、面向专业等..."
          />
        </el-form-item>

        <el-form-item label="打卡规则说明">
          <el-input
            v-model="form.ruleDescription"
            type="textarea"
            :rows="2"
            placeholder="例：入场扫码打卡，全程参与方可颁发荣誉证书"
          />
        </el-form-item>

        <el-form-item label="活动封面图">
          <div class="cover-upload-area">
            <el-input v-model="form.coverImage" placeholder="粘贴图片 URL，或点击右侧上传" style="flex: 1;" />
            <el-button :icon="Upload" @click="handleCoverUpload" style="margin-left: 8px;">上传图片</el-button>
          </div>
          <div v-if="form.coverImage" class="cover-preview">
            <el-image :src="form.coverImage" fit="cover" style="width: 120px; height: 80px; border-radius: 4px;" />
          </div>
        </el-form-item>
      </el-card>

      <!-- ② 时间规划 -->
      <el-card shadow="never" class="form-section">
        <template #header>
          <span class="section-title">② 时间周期与报名窗口</span>
        </template>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="活动开始时间" prop="startTime">
              <el-date-picker
                v-model="form.startTime"
                type="datetime"
                placeholder="选择开始时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="活动结束时间" prop="endTime">
              <el-date-picker
                v-model="form.endTime"
                type="datetime"
                placeholder="选择结束时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- ③ GPS 打卡围栏 -->
      <el-card shadow="never" class="form-section">
        <template #header>
          <div class="section-header">
            <span class="section-title">③ 现场签到打卡地理围栏（GPS 定位）</span>
            <el-switch
              v-model="form.locationCheckEnabled"
              :active-value="1"
              :inactive-value="0"
              active-text="开启定位核验"
              inactive-text="关闭"
            />
          </div>
        </template>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="场地名称">
              <el-input v-model="form.locationName" placeholder="例：信息学部 401 报告厅" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="详细地址">
              <el-input v-model="form.locationAddress" placeholder="例：图书馆A区一层东侧报告厅" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="经度">
              <el-input-number v-model="form.longitude" :precision="6" :step="0.001" placeholder="经度" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="纬度">
              <el-input-number v-model="form.latitude" :precision="6" :step="0.001" placeholder="纬度" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="核验半径(米)">
              <el-input-number
                v-model="form.locationRadius"
                :min="50"
                :max="2000"
                :step="50"
                style="width: 100%;"
                @change="updateRadiusCircle"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 预设地点快速选择 -->
        <el-form-item label="快速选择校园地点">
          <div class="preset-btns">
            <el-button
              v-for="loc in presetLocations"
              :key="loc.name"
              size="small"
              @click="setPresetLocation(loc)"
            >{{ loc.name }}</el-button>
          </div>
        </el-form-item>

        <!-- 地图网格模拟 -->
        <el-form-item label="点击调整中心点">
          <div class="map-picker" @click="handleMapClick">
            <svg
              class="map-pin"
              :style="mapPinStyle"
              viewBox="0 0 24 24"
              fill="var(--el-color-danger)"
            >
              <path d="M12,2C15.31,2 18,4.69 18,8C18,12.5 12,22 12,22C12,22 6,12.5 6,8C6,4.69 8.69,2 12,2M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6Z"/>
            </svg>
            <div class="map-circle" :style="mapCircleStyle" />
            <div class="map-hint">提示：可在网格区域点击微调中心点坐标</div>
          </div>
        </el-form-item>
      </el-card>

      <!-- ④ 电子证书配置 -->
      <el-card shadow="never" class="form-section">
        <template #header>
          <div class="section-header">
            <span class="section-title">④ 权威凭证（结营电子证书）</span>
            <el-switch
              v-model="form.certificateEnabled"
              :active-value="1"
              :inactive-value="0"
              active-text="颁发电子证书"
              inactive-text="不颁发"
            />
          </div>
        </template>

        <template v-if="form.certificateEnabled">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="证书名称">
                <el-input v-model="form.certificateTitle" placeholder="例：AI前沿学术讲座结业证书" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="签发单位">
                <el-input v-model="form.certificateIssuer" placeholder="例：校科技创新协会" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-alert
            title="出勤打卡合格后系统将自动生成防伪电子证书并推送给学生"
            type="info"
            show-icon
            :closable="false"
          />
        </template>
        <el-empty v-else description="当前活动不颁发电子证书，仅奖励积分" :image-size="60" />
      </el-card>

    </el-form>

    <!-- 底部固定操作栏 -->
    <div class="bottom-bar">
      <el-button @click="goBack">取消</el-button>
      <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
        保存并{{ isEdit ? '更新' : '发布' }}活动
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.edit-page {
  padding-bottom: 80px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}
.divider {
  color: var(--el-text-color-placeholder);
}
.page-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  flex: 1;
}
.header-actions {
  display: flex;
  gap: 8px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-section {
  border-radius: 8px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 封面上传 */
.cover-upload-area {
  display: flex;
  align-items: center;
  width: 100%;
}
.cover-preview {
  margin-top: 8px;
}

/* 预设地点 */
.preset-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 地图模拟 */
.map-picker {
  width: 100%;
  height: 220px;
  background-color: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-base);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
  cursor: crosshair;
  background-image: radial-gradient(var(--el-border-color-base) 1px, transparent 1px);
  background-size: 16px 16px;
}
.map-pin {
  position: absolute;
  width: 24px;
  height: 24px;
  transform: translate(-50%, -100%);
  pointer-events: none;
}
.map-circle {
  position: absolute;
  border-radius: 50%;
  border: 1.5px dashed var(--el-color-primary);
  background-color: rgba(64, 158, 255, 0.12);
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: width 0.2s, height 0.2s;
}
.map-hint {
  position: absolute;
  bottom: 8px;
  left: 10px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 8px;
  border-radius: 3px;
  border: 1px solid var(--el-border-color-light);
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #fff;
  border-top: 1px solid var(--el-border-color-lighter);
  padding: 12px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
