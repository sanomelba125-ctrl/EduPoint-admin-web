<script setup lang="ts">
import { ref, shallowRef, reactive, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  Search,
  Aim,
  RefreshRight,
  CircleCheck,
  Warning,
  Position
} from '@element-plus/icons-vue'
import ImageUploader from '@/components/ImageUploader.vue'
import { useUserStore } from '@/store/user'
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

// ──────── 高德地图 2.0 选址与打卡点集成 ────────
const userStore = useUserStore()
const amapInstance = shallowRef<any>(null)
const markerInstance = shallowRef<any>(null)
const circleInstance = shallowRef<any>(null)
let resizeObserver: ResizeObserver | null = null
const searchKeyword = ref('')
const searchingPoi = ref(false)
const locatingCurrent = ref(false)
const mapLoading = ref(true)
const mapLoaded = ref(false)
const mapError = ref<string | null>(null)

// 校验经纬度是否在地球有效数值范围内
function isValidCoords(lng?: number | null, lat?: number | null): boolean {
  const longitude = Number(lng)
  const latitude = Number(lat)
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return false
  return longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90
}

/**
 * 安全清理地图实例
 */
function cleanupMap() {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (markerInstance.value) {
    try {
      markerInstance.value.setMap(null)
    } catch {
      // ignore
    }
    markerInstance.value = null
  }
  if (circleInstance.value) {
    try {
      circleInstance.value.setMap(null)
    } catch {
      // ignore
    }
    circleInstance.value = null
  }
  if (amapInstance.value) {
    try {
      amapInstance.value.destroy()
    } catch (e) {
      console.warn('[AMap] destroy error:', e)
    }
    amapInstance.value = null
  }
  mapLoaded.value = false
}

/**
 * 初始化高德 2.0 地图实例
 */
async function initAMap() {
  mapLoading.value = true
  mapError.value = null
  await nextTick()

  try {
    const container = document.getElementById('amapContainer')
    if (!container) {
      mapLoading.value = false
      return
    }

    cleanupMap()

    const AMap = await loadAMapSDK()

    // 埋点：设置应用标识，用于统计 skill 调用来源
    if (typeof AMap.getConfig === 'function') {
      AMap.getConfig().appname = 'amap-jsapi-skill'
    }

    // 确定初始视野中心：优先已配置的打卡点，默认采用校园中心经纬度
    const hasExistingCoords = isValidCoords(form.longitude, form.latitude)
    const initLng = hasExistingCoords ? Number(form.longitude) : 118.156821
    const initLat = hasExistingCoords ? Number(form.latitude) : 24.629104
    const center = [initLng, initLat]

    const map = new AMap.Map('amapContainer', {
      viewMode: '3D',
      zoom: 16,
      center,
      resizeEnable: true,
      scrollWheel: true,
      mapStyle: 'amap://styles/normal'
    })
    amapInstance.value = map

    map.on('complete', () => {
      mapLoaded.value = true
      mapLoading.value = false
      map.resize()
    })

    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        if (amapInstance.value) {
          amapInstance.value.resize()
        }
      })
      resizeObserver.observe(container)
    }

    // 延迟二次触发 resize，杜绝初次渲染容器尺寸微调引起的局部灰格
    setTimeout(() => {
      if (amapInstance.value) {
        amapInstance.value.resize()
      }
    }, 250)

    // 1. 创建中心打卡红色图钉 Marker（可拖拽）
    const marker = new AMap.Marker({
      position: center,
      draggable: true,
      cursor: 'move',
      title: '按住拖拽以微调打卡点中心'
    })
    marker.setMap(map)
    markerInstance.value = marker

    // 2. 创建打卡核验覆盖半透明圆 Circle
    const radius = form.locationRadius || 500
    const circle = new AMap.Circle({
      center,
      radius,
      strokeColor: '#409EFF',
      strokeOpacity: 0.85,
      strokeWeight: 2,
      fillColor: '#409EFF',
      fillOpacity: 0.18
    })
    circle.setMap(map)
    circleInstance.value = circle

    // 3. 拖拽 Marker 松手时，选址并逆地理编码回填
    marker.on('dragend', async (e: any) => {
      const p = e.lnglat
      if (p) {
        await applyPickedLocation(p.getLng(), p.getLat(), undefined, false)
      }
    })

    // 4. 单击地图任意位置选址并导入打卡点
    map.on('click', async (e: any) => {
      const p = e.lnglat
      if (p) {
        await applyPickedLocation(p.getLng(), p.getLat(), undefined, false)
      }
    })
  } catch (err: any) {
    console.error('高德地图初始化异常:', err)
    mapError.value = err?.message || '地图服务加载失败，请检查网络或刷新重试'
    mapLoading.value = false
  }
}

/**
 * 选址应用与逆地理编码数据回填
 * @param showToast 是否显式弹窗提示（默认 false，避免连续微调拖拽时频繁刷屏）
 */
async function applyPickedLocation(lng: number, lat: number, customName?: string, showToast = false) {
  if (!isValidCoords(lng, lat)) return

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
    amapInstance.value.resize()
  }

  try {
    const geo = await getAddressByCoords(roundedLng, roundedLat)
    if (geo.formattedAddress) {
      form.locationAddress = geo.formattedAddress
    }
    if (customName) {
      form.locationName = customName
    } else if (geo.poiName && (!form.locationName || form.locationName.trim() === '')) {
      form.locationName = geo.poiName
    }
    if (showToast) {
      ElMessage.success(`已更新打卡点：${form.locationName || geo.formattedAddress || `${roundedLng}, ${roundedLat}`}`)
    }
  } catch {
    if (showToast) {
      ElMessage.success(`打卡坐标已更新：(${roundedLng}, ${roundedLat})`)
    }
  }
}

/**
 * 经纬度输入框手动变更联动
 */
function handleManualCoordsChange() {
  if (isValidCoords(form.longitude, form.latitude)) {
    applyPickedLocation(Number(form.longitude), Number(form.latitude), undefined, false)
  }
}

/**
 * 核验半径实时响应更新
 */
function updateRadiusCircle(val: number) {
  if (circleInstance.value && typeof val === 'number') {
    circleInstance.value.setRadius(val)
  }
}

/**
 * 一键复位地图视野至当前打卡点
 */
function recenterMap() {
  if (isValidCoords(form.longitude, form.latitude) && amapInstance.value) {
    amapInstance.value.setZoomAndCenter(16, [Number(form.longitude), Number(form.latitude)])
    amapInstance.value.resize()
    ElMessage.info('已将地图视野复位至打卡点')
  } else if (amapInstance.value) {
    amapInstance.value.setZoomAndCenter(16, [118.156821, 24.629104])
    amapInstance.value.resize()
  }
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
    AMap.plugin(['AMap.PlaceSearch'], () => {
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
          await applyPickedLocation(lng, lat, firstPoi.name, true)
          form.locationAddress = firstPoi.address || firstPoi.name
          if (amapInstance.value) {
            amapInstance.value.setZoom(17)
          }
        } else {
          ElMessage.warning('未搜索到相关地点，请输入更具体的校园或城市地名')
        }
      })
    })
  } catch (err: any) {
    searchingPoi.value = false
    ElMessage.error(err?.message || '高德 POI 搜索失败')
  }
}

/**
 * 一键定位到当前设备真实位置
 */
async function handleLocateCurrent() {
  locatingCurrent.value = true
  try {
    const AMap = await loadAMapSDK()
    AMap.plugin(['AMap.Geolocation'], () => {
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 8000,
        needAddress: true
      })

      geolocation.getCurrentPosition(async (status: string, result: any) => {
        locatingCurrent.value = false
        if (status === 'complete' && result.position) {
          const lng = result.position.getLng()
          const lat = result.position.getLat()
          const formatted = result.formattedAddress || ''
          await applyPickedLocation(lng, lat, undefined, true)
          if (formatted) {
            form.locationAddress = formatted
          }
        } else {
          ElMessage.warning('未能获取高精度定位，建议在地图中直接点击或通过搜索定位')
        }
      })
    })
  } catch (err: any) {
    locatingCurrent.value = false
    ElMessage.warning('当前网络环境不支持高精度定位，可在地图上直接点击选址')
  }
}

// 页面销毁时清理地图
onBeforeUnmount(() => {
  cleanupMap()
})

// 监听侧边栏折叠/展开，平滑调整地图尺寸，防止出现未填满的灰色区域
watch(
  () => userStore.isCollapse,
  () => {
    nextTick(() => {
      setTimeout(() => {
        if (amapInstance.value) {
          amapInstance.value.resize()
        }
      }, 300)
    })
  }
)

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

  if (form.locationCheckEnabled === 1) {
    if (!form.locationName?.trim() || !form.locationAddress?.trim()) {
      ElMessage.warning('开启定位核验时，请配置打卡场地名称和详细地址')
      return
    }
    if (!isValidCoords(form.longitude, form.latitude)) {
      ElMessage.warning('开启定位核验时，请在地图上选择有效的打卡坐标')
      return
    }
    if (!form.locationRadius || form.locationRadius < 50) {
      ElMessage.warning('开启定位核验时，打卡半径不能小于 50 米')
      return
    }
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

        <el-form-item label="活动封面图" prop="coverImage">
          <ImageUploader v-model="form.coverImage" label="活动封面" :preview-size="80" />
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

        <el-row :gutter="20" class="map-location-row">
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

        <el-row :gutter="20" class="map-coords-row">
          <el-col :span="8">
            <el-form-item label="打卡中心经度">
              <el-input-number
                v-model="form.longitude"
                :precision="6"
                :step="0.0001"
                placeholder="经度 (Lng)"
                style="width: 100%;"
                @change="handleManualCoordsChange"
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
                @change="handleManualCoordsChange"
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

        <!-- 高德地图智能选址工作台（通栏独立排版，空间宽裕舒展） -->
        <div class="map-section-block">
          <div class="map-section-header">
            <span class="map-title-label">地图智能选址与打卡范围标定</span>
            <span class="map-title-sub">支持关键字检索建筑地点、设备定位、点击或拖拽红色图钉快速导入</span>
          </div>

          <div class="amap-wrapper">
            <!-- 工具操作栏 -->
            <div class="amap-toolbar">
              <!-- 左侧：POI 地点搜索区域 -->
              <div class="toolbar-search-zone">
                <el-input
                  v-model="searchKeyword"
                  placeholder="输入目标建筑、场馆或地名（按回车定位）"
                  clearable
                  class="search-input"
                  @keyup.enter="handleSearchPOI"
                >
                  <template #prefix>
                    <el-icon color="#94a3b8"><Search /></el-icon>
                  </template>
                </el-input>
                <el-button
                  type="primary"
                  :loading="searchingPoi"
                  :icon="Search"
                  class="btn-search"
                  @click="handleSearchPOI"
                >
                  搜索
                </el-button>
              </div>

              <!-- 中间区域分割线 -->
              <div class="toolbar-divider"></div>

              <!-- 右侧：地图快捷控制功能组 -->
              <div class="toolbar-actions-zone">
                <el-tooltip content="获取当前设备经纬度并快速导入为打卡点" placement="top">
                  <el-button
                    type="success"
                    plain
                    :icon="Aim"
                    :loading="locatingCurrent"
                    @click="handleLocateCurrent"
                  >
                    定位当前
                  </el-button>
                </el-tooltip>

                <el-tooltip content="将地图视口平移对准当前已选打卡标记" placement="top">
                  <el-button
                    plain
                    :icon="RefreshRight"
                    @click="recenterMap"
                  >
                    复位中心
                  </el-button>
                </el-tooltip>
              </div>
            </div>

            <!-- 高德地图 2.0 容器与交互层 -->
            <div class="map-container-box">
              <div id="amapContainer" class="amap-dom"></div>

              <!-- 加载中态 -->
              <div v-if="mapLoading" class="map-loading-mask">
                <el-icon class="is-loading" :size="28" color="#409EFF"><Position /></el-icon>
                <span class="loading-text">高德地图 2.0 空间引擎加载中...</span>
              </div>

              <!-- 加载失败容错态 -->
              <div v-else-if="mapError" class="map-error-mask">
                <el-icon :size="32" color="#f56c6c"><Warning /></el-icon>
                <span class="error-msg">{{ mapError }}</span>
                <el-button type="primary" size="small" @click="initAMap">重新载入地图</el-button>
              </div>

              <!-- 悬浮状态指示栏 -->
              <div v-if="mapLoaded" class="map-status-overlay">
                <div class="overlay-left">
                  <el-icon color="#67c23a"><CircleCheck /></el-icon>
                  <span class="coord-tag">
                    <strong>打卡坐标：</strong>{{ form.longitude !== undefined && form.longitude !== null ? `${form.longitude}, ${form.latitude}` : '未选择 (请点击地图选址)' }}
                  </span>
                  <span v-if="form.locationRadius" class="radius-tag">
                    (有效半径 {{ form.locationRadius }} 米)
                  </span>
                </div>
                <div class="overlay-right">
                  <span>💡 提示：在地图上任意点击或拖动红色图钉，即可精准导入打卡点并自动解析地址</span>
                </div>
              </div>
            </div>
          </div>
        </div>
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
  padding: 16px 20px 24px;
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

/* 高德地图 2.0 智能选址工作台（通栏布局） */
.map-section-block {
  margin-top: 10px;
  margin-bottom: 4px;
  width: 100%;
}

.map-section-header {
  display: flex;
  align-items: baseline;
  gap: 10px 14px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

/* 地图相关字段在中等宽度下改为纵向分区，避免长标签和输入控件互相挤压 */
.map-location-row,
.map-coords-row {
  row-gap: 4px;
}

.map-title-label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.map-title-sub {
  font-size: 12px;
  color: #64748b;
}

.amap-wrapper {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
}

.amap-toolbar {
  width: 100%;
  padding: 10px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 14px;
  box-sizing: border-box;
}

.toolbar-search-zone {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 320px;
  min-width: 240px;
  box-sizing: border-box;
}

.search-input {
  flex: 1;
}

.btn-search {
  flex-shrink: 0;
  padding: 8px 16px;
}

.toolbar-divider {
  width: 1px;
  height: 22px;
  background-color: #cbd5e1;
  margin: 0 4px;
}

.toolbar-actions-zone {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  box-sizing: border-box;
}

.toolbar-actions-zone .el-button {
  flex: 0 0 auto;
  min-width: 108px;
}

.toolbar-actions-zone .el-button + .el-button {
  margin-left: 0;
}

@media (max-width: 900px) {
  .amap-toolbar {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .toolbar-divider {
    display: none;
  }
  .toolbar-search-zone {
    width: 100%;
  }
  .toolbar-actions-zone {
    width: 100%;
    justify-content: flex-end;
    padding-top: 2px;
  }
}

@media (max-width: 1100px) {
  .map-location-row :deep(.el-col) {
    flex: 0 0 100%;
    max-width: 100%;
  }

  .map-coords-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 20px;
  }

  .map-coords-row :deep(.el-col) {
    width: 100%;
    max-width: 100%;
  }

  .amap-toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .toolbar-actions-zone {
    justify-content: flex-end;
  }
}

@media (max-width: 640px) {
  .map-location-row,
  .map-coords-row {
    row-gap: 0;
  }

  .map-coords-row {
    display: block;
  }

  .map-section-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .map-title-sub {
    line-height: 1.5;
  }

  .amap-toolbar {
    padding: 10px 12px;
  }

  .toolbar-search-zone {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-search {
    width: 100%;
  }

  .toolbar-actions-zone {
    justify-content: stretch;
  }

  .toolbar-actions-zone .el-button {
    flex: 1;
  }

  .map-container-box {
    height: min(58vh, 420px);
    min-height: 300px;
  }

  .map-status-overlay {
    left: 8px;
    right: 8px;
    bottom: 8px;
    padding: 8px 10px;
  }

  .overlay-left,
  .overlay-right {
    width: 100%;
  }

  .overlay-right {
    line-height: 1.4;
  }
}

.map-container-box {
  position: relative;
  width: 100%;
  height: 420px;
  background-color: #f1f5f9;
  box-sizing: border-box;
}

.amap-dom {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

/* 地图加载态遮罩 */
.map-loading-mask {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.88);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
}

.loading-text {
  font-size: 13px;
  color: #475569;
  font-weight: 500;
}

/* 地图异常遮罩 */
.map-error-mask {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
  z-index: 10;
}

.error-msg {
  color: #e11d48;
  font-size: 13px;
  max-width: 360px;
}

/* 底部状态悬浮条 */
.map-status-overlay {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(8px);
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 12px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  pointer-events: none;
  z-index: 5;
}

.overlay-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  min-width: 0;
  gap: 6px;
  color: #1e293b;
}

.coord-tag {
  font-family: 'Consolas', monospace;
  font-size: 12px;
  color: #0f172a;
  overflow-wrap: anywhere;
}

.radius-tag {
  color: #3b82f6;
  font-weight: 600;
}

.overlay-right {
  color: #64748b;
  font-size: 11px;
  min-width: 0;
  overflow-wrap: anywhere;
}

/* 底部操作栏（吸底且自适应内容区，绝不覆盖侧边栏与表单底层） */
.bottom-bar {
  position: sticky;
  bottom: 0;
  z-index: 30;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.05);
  margin-top: 20px;
}

/* 调整高德官方标识与版权信息位置，避免与底端选址信息悬浮条发生遮挡叠层 */
:deep(.amap-logo),
:deep(.amap-copyright) {
  bottom: 48px !important;
  left: 12px !important;
  opacity: 0.85;
}
</style>
