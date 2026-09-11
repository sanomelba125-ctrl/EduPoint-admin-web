<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  Search,
  Aim,
  Location,
  CircleCheck,
  Warning
} from '@element-plus/icons-vue'
import {
  getActivityDetail,
  createActivity,
  updateActivity,
  type ActivitySaveDTO
} from '@/api/activity'
import { loadAMapSDK, getAddressByCoords } from '@/utils/amap'

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

// ──────── 预设校园地点 ────────
const presetLocations = [
  { name: '信息学部 401 报告厅', address: '信息学部主楼4层学术报告厅', lng: 118.156821, lat: 24.629104 },
  { name: '大学生活动中心', address: '大学生活动中心青年广场', lng: 118.154210, lat: 24.628041 },
  { name: '东区主体育场', address: '东校区主体育场主席台', lng: 118.159330, lat: 24.631220 },
  { name: '工程训练中心', address: '工程训练中心综合实验楼', lng: 118.152190, lat: 24.626880 },
  { name: '图书馆报告厅', address: '图书馆A区一层东侧多功能厅', lng: 118.155600, lat: 24.628800 }
]

// ──────── 高德地图 2.0 选址与打卡点集成 ────────
const amapInstance = ref<any>(null)
const markerInstance = ref<any>(null)
const circleInstance = ref<any>(null)
const searchKeyword = ref('')
const searchingPoi = ref(false)
const locatingCurrent = ref(false)
const mapLoaded = ref(false)

/**
 * 初始化高德 2.0 地图实例
 */
async function initAMap() {
  await nextTick()
  try {
    const AMap = await loadAMapSDK()
    const container = document.getElementById('amapContainer')
    if (!container) return

    // 获取初始坐标：已有则用已有的（如活动109），否则取默认基准点
    const lng = form.longitude || 118.156821
    const lat = form.latitude || 24.629104
    const center = [lng, lat]

    if (amapInstance.value) {
      amapInstance.value.destroy()
    }

    const map = new AMap.Map('amapContainer', {
      zoom: 16,
      center,
      resizeEnable: true
    })
    amapInstance.value = map

    // 1. 创建红色中心打卡图钉 Marker（可直接拖拽调整）
    const marker = new AMap.Marker({
      position: center,
      draggable: true,
      cursor: 'move',
      title: '可直接拖拽调整打卡中心点'
    })
    marker.setMap(map)
    markerInstance.value = marker

    // 2. 创建半透明核验半径覆盖圆 Circle
    const circle = new AMap.Circle({
      center,
      radius: form.locationRadius || 500,
      strokeColor: '#409EFF',
      strokeOpacity: 0.85,
      strokeWeight: 2,
      fillColor: '#409EFF',
      fillOpacity: 0.22
    })
    circle.setMap(map)
    circleInstance.value = circle

    // 3. 拖拽 Marker 松手时，选址并逆地理编码回填
    marker.on('dragend', async (e: any) => {
      const p = e.lnglat
      await applyPickedLocation(p.getLng(), p.getLat())
    })

    // 4. 单击地图任意位置选址并导入打卡点
    map.on('click', async (e: any) => {
      const p = e.lnglat
      await applyPickedLocation(p.getLng(), p.getLat())
    })

    mapLoaded.value = true
  } catch (err: any) {
    console.error('高德地图初始化异常:', err)
  }
}

/**
 * 选址应用与逆地理编码数据回填
 */
async function applyPickedLocation(lng: number, lat: number, customName?: string) {
  const roundedLng = Number(lng.toFixed(6))
  const roundedLat = Number(lat.toFixed(6))
  form.longitude = roundedLng
  form.latitude = roundedLat

  if (markerInstance.value) {
    markerInstance.value.setPosition([roundedLng, roundedLat])
  }
  if (circleInstance.value) {
    circleInstance.value.setCenter([roundedLng, roundedLat])
  }
  if (amapInstance.value) {
    amapInstance.value.panTo([roundedLng, roundedLat])
  }

  try {
    const geo = await getAddressByCoords(roundedLng, roundedLat)
    if (geo.formattedAddress) {
      form.locationAddress = geo.formattedAddress
    }
    if (customName) {
      form.locationName = customName
    } else if (geo.poiName) {
      form.locationName = geo.poiName
    }
    ElMessage.success(`已选址并导入打卡点：${form.locationName || geo.formattedAddress}`)
  } catch {
    ElMessage.success(`坐标已更新：(${roundedLng}, ${roundedLat})`)
  }
}

/**
 * 核验半径实时响应更新
 */
function updateRadiusCircle(val: number) {
  if (circleInstance.value) {
    circleInstance.value.setRadius(val)
  }
}

/**
 * 快速选择校园地点
 */
async function setPresetLocation(preset: typeof presetLocations[0]) {
  await applyPickedLocation(preset.lng, preset.lat, preset.name)
  form.locationAddress = preset.address
}

/**
 * 高德 POI 智能搜索选址
 */
async function handleSearchPOI() {
  const kw = searchKeyword.value.trim()
  if (!kw) {
    ElMessage.warning('请输入搜索关键字，如建筑名、图书馆等')
    return
  }

  searchingPoi.value = true
  try {
    const AMap = await loadAMapSDK()
    const placeSearch = new AMap.PlaceSearch({
      city: '全国',
      pageSize: 5
    })

    placeSearch.search(kw, async (status: string, result: any) => {
      searchingPoi.value = false
      if (status === 'complete' && result.poiList && result.poiList.pois && result.poiList.pois.length > 0) {
        const firstPoi = result.poiList.pois[0]
        const lng = firstPoi.location.getLng()
        const lat = firstPoi.location.getLat()
        await applyPickedLocation(lng, lat, firstPoi.name)
        form.locationAddress = firstPoi.address || firstPoi.name
        ElMessage.success(`已定位并导入选址：${firstPoi.name}`)
      } else {
        ElMessage.warning('未搜索到相关地点，请尝试更精确的名称')
      }
    })
  } catch (err: any) {
    searchingPoi.value = false
    ElMessage.error(err.message || '高德 POI 搜索失败')
  }
}

/**
 * 一键定位到当前设备真实位置
 */
async function handleLocateCurrent() {
  locatingCurrent.value = true
  try {
    const AMap = await loadAMapSDK()
    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 10000
    })

    geolocation.getCurrentPosition(async (status: string, result: any) => {
      locatingCurrent.value = false
      if (status === 'complete' && result.position) {
        const lng = result.position.getLng()
        const lat = result.position.getLat()
        await applyPickedLocation(lng, lat)
        ElMessage.success('已自动导入当前设备位置为活动打卡点')
      } else {
        ElMessage.warning('获取设备定位超时，可在地图上直接点击选址')
      }
    })
  } catch (err: any) {
    locatingCurrent.value = false
    ElMessage.error(err.message || '定位插件调用失败')
  }
}

// ──────── 初始化 ────────
onMounted(async () => {
  const id = route.query.id
  if (id) {
    isEdit.value = true
    activityId.value = Number(id)
    await loadDetail(activityId.value)
  }
  await initAMap()
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
            <el-form-item label="候补队列机制">
              <el-switch
                v-model="form.waitlistEnabled"
                :active-value="1"
                :inactive-value="0"
                active-text="开启候补"
                inactive-text="关闭"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="活动开始时间" prop="startTime">
              <el-date-picker
                v-model="form.startTime"
                type="datetime"
                placeholder="选择活动开始时间"
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
                placeholder="选择活动结束时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="活动封面 URL">
          <el-input v-model="form.coverImage" placeholder="请输入图片网络直链地址（如七牛云 OSS 图片链接）" clearable />
        </el-form-item>

        <el-form-item label="活动简介">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="简要介绍活动背景、主讲嘉宾或核心内容"
          />
        </el-form-item>

        <el-form-item label="规则与注意事项">
          <el-input
            v-model="form.ruleDescription"
            type="textarea"
            :rows="2"
            placeholder="签到考勤规则、迟到扣分说明等"
          />
        </el-form-item>
      </el-card>

      <!-- ② 现场签到打卡地理围栏（高德 2.0 地图选址导入） -->
      <el-card shadow="never" class="form-section">
        <template #header>
          <div class="section-header">
            <span class="section-title">② 现场签到打卡地理围栏（高德 2.0 地图智能选址）</span>
            <el-switch
              v-model="form.locationCheckEnabled"
              :active-value="1"
              :inactive-value="0"
              active-text="开启定位核验"
              inactive-text="关闭定位核验"
            />
          </div>
        </template>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="打卡场地名称">
              <el-input v-model="form.locationName" placeholder="例：信息学部 401 报告厅" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="详细结构化地址">
              <el-input v-model="form.locationAddress" placeholder="高德地图选址后自动回填详细地址" clearable />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="打卡中心经度">
              <el-input-number
                v-model="form.longitude"
                :precision="6"
                :step="0.0001"
                placeholder="经度 (Lng)"
                style="width: 100%;"
                @change="(val) => val && form.latitude && applyPickedLocation(val, form.latitude)"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="打卡中心纬度">
              <el-input-number
                v-model="form.latitude"
                :precision="6"
                :step="0.0001"
                placeholder="纬度 (Lat)"
                style="width: 100%;"
                @change="(val) => val && form.longitude && applyPickedLocation(form.longitude, val)"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="打卡核验半径(米)">
              <el-input-number
                v-model="form.locationRadius"
                :min="50"
                :max="3000"
                :step="50"
                style="width: 100%;"
                @change="updateRadiusCircle"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 预设校园地点快捷选址 -->
        <el-form-item label="校园快捷打卡点">
          <div class="preset-btns">
            <el-button
              v-for="loc in presetLocations"
              :key="loc.name"
              size="small"
              plain
              @click="setPresetLocation(loc)"
            >
              <el-icon><Location /></el-icon>
              {{ loc.name }}
            </el-button>
          </div>
        </el-form-item>

        <!-- 高德地图选址交互工具栏 -->
        <el-form-item label="地图选址交互">
          <div class="amap-wrapper">
            <div class="amap-toolbar">
              <div class="search-input-group">
                <el-input
                  v-model="searchKeyword"
                  placeholder="搜索校园大楼、场馆或地名（按回车或点搜索直接导入）"
                  clearable
                  @keyup.enter="handleSearchPOI"
                >
                  <template #append>
                    <el-button :loading="searchingPoi" :icon="Search" @click="handleSearchPOI">
                      高德选址导入
                    </el-button>
                  </template>
                </el-input>
              </div>

              <el-button type="success" plain :icon="Aim" :loading="locatingCurrent" @click="handleLocateCurrent">
                导入当前设备定位
              </el-button>
            </div>

            <!-- 高德地图 2.0 容器 -->
            <div class="map-container-box">
              <div id="amapContainer" class="amap-dom"></div>

              <!-- 覆盖提示小浮条 -->
              <div class="map-status-overlay">
                <div class="overlay-row">
                  <el-icon color="#67c23a"><CircleCheck /></el-icon>
                  <span><strong>已绑定打卡坐标：</strong>{{ form.longitude || '-' }}, {{ form.latitude || '-' }}</span>
                </div>
                <div class="overlay-row hint">
                  <span>💡 提示：点击地图任意位置或拖拽红色图钉，即可自动导入打卡点并反查地址</span>
                </div>
              </div>
            </div>
          </div>
        </el-form-item>
      </el-card>

      <!-- ③ 电子证书配置 -->
      <el-card shadow="never" class="form-section">
        <template #header>
          <div class="section-header">
            <span class="section-title">③ 权威凭证（结营电子证书）</span>
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
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        保存并{{ isEdit ? '更新' : '发布' }}活动
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.edit-page {
  padding: 16px 20px 80px;
  background-color: var(--el-bg-color-page, #f5f7fa);
  min-height: calc(100vh - 84px);
}

.page-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.divider {
  color: var(--el-text-color-placeholder);
}
.page-title {
  font-size: 16px;
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
  gap: 16px;
}

.form-section {
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preset-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 高德地图 2.0 选址区域 */
.amap-wrapper {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
}

.amap-toolbar {
  padding: 12px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input-group {
  flex: 1;
  min-width: 280px;
}

.map-container-box {
  position: relative;
  width: 100%;
  height: 380px;
}

.amap-dom {
  width: 100%;
  height: 100%;
}

.map-status-overlay {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(6px);
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
}

.overlay-row {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #1e293b;
}

.overlay-row.hint {
  color: #64748b;
  font-size: 11px;
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
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}
</style>
