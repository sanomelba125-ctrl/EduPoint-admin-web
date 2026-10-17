<template>
  <div class="certificate-container">
    <!-- 顶部概览统计卡片 -->
    <el-row :gutter="16" class="metrics-row">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-inner">
            <div class="metric-info">
              <span class="metric-label">已颁发证书总量</span>
              <div class="metric-value">
                {{ stats.total }} <span class="metric-unit">份</span>
              </div>
            </div>
            <div class="metric-icon primary">
              <el-icon :size="24"><Medal /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-inner">
            <div class="metric-info">
              <span class="metric-label">正常有效凭证 (VALID)</span>
              <div class="metric-value text-success">
                {{ stats.valid }} <span class="metric-unit">份</span>
              </div>
            </div>
            <div class="metric-icon success">
              <el-icon :size="24"><CircleCheck /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-inner">
            <div class="metric-info">
              <span class="metric-label">累计防伪核验次数</span>
              <div class="metric-value text-primary">
                {{ stats.verifications }} <span class="metric-unit">次</span>
              </div>
            </div>
            <div class="metric-icon warning">
              <el-icon :size="24"><Search /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-inner">
            <div class="metric-info">
              <span class="metric-label">已吊销作废 (REVOKED)</span>
              <div class="metric-value text-danger">
                {{ stats.revoked }} <span class="metric-unit">份</span>
              </div>
            </div>
            <div class="metric-icon danger">
              <el-icon :size="24"><CircleClose /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索筛选区 -->
    <el-card shadow="never" class="search-card">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="84px">
        <el-form-item label="证书编号">
          <el-input
            v-model="queryParams.certificateNo"
            placeholder="例: CERT-2026"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="学生姓名">
          <el-input
            v-model="queryParams.studentName"
            placeholder="输入姓名"
            clearable
            style="width: 150px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="学生学号">
          <el-input
            v-model="queryParams.studentNo"
            placeholder="输入学号"
            clearable
            style="width: 160px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="归属活动">
          <el-input
            v-model="queryParams.activityTitle"
            placeholder="活动标题或证书名"
            clearable
            style="width: 180px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="证书状态">
          <el-select
            v-model="queryParams.status"
            placeholder="全部状态"
            clearable
            style="width: 130px"
          >
            <el-option label="全部" value="" />
            <el-option label="有效 (VALID)" :value="1" />
            <el-option label="已撤销 (REVOKED)" :value="2" />
            <el-option label="已过期 (EXPIRED)" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          <el-button type="success" :icon="Check" plain @click="openQuickVerifyModal">
            防伪快速核验
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 证书数据台账表格 -->
    <el-card shadow="never" class="table-card">
      <div class="table-header-bar">
        <div class="table-title">
          <span>电子荣誉证书台账</span>
          <el-tag type="info" size="small" effect="plain" class="total-tag">
            共 {{ total }} 份
          </el-tag>
        </div>
      </div>

      <el-table
        v-loading="loading"
        max-height="calc(100vh - 320px)"
        :data="certificateList"
        stripe
        border
        style="width: 100%"
        class="custom-table"
      >
        <el-table-column label="防伪唯一编号 (UUID)" min-width="160">
          <template #default="{ row }">
            <span class="cert-no-tag">{{ row.certificateNo }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="title" label="证书名称" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="font-bold">{{ row.title }}</span>
          </template>
        </el-table-column>

        <el-table-column label="获奖学生" min-width="125">
          <template #default="{ row }">
            <div class="student-info-cell">
              <span class="name">{{ row.studentName }}</span>
              <span class="no">{{ row.studentNo }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="activityTitle" label="归属活动" min-width="175" show-overflow-tooltip />

        <el-table-column prop="issuer" label="签发单位" min-width="132" show-overflow-tooltip />

        <el-table-column prop="issueTime" label="颁发时间" width="140" />

        <el-table-column label="防伪核验" width="86" align="center">
          <template #default="{ row }">
            <el-badge :value="row.verifyCount || 0" type="primary" class="verify-badge" />
          </template>
        </el-table-column>

        <el-table-column label="凭证状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success" effect="dark" size="small">
              有效 VALID
            </el-tag>
            <el-tooltip
              v-else-if="row.status === 2"
              :content="row.revokeReason || '违纪作废'"
              placement="top"
            >
              <el-tag type="danger" effect="dark" size="small" style="cursor: pointer;">
                已撤销 REVOKED
              </el-tag>
            </el-tooltip>
            <el-tag v-else-if="row.status === 3" type="info" effect="plain" size="small">
              已过期
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              :icon="View"
              @click="handlePreview(row)"
            >
              预览证书
            </el-button>
            <el-button
              type="success"
              link
              size="small"
              :icon="Checked"
              @click="handleVerifyOne(row)"
            >
              查验
            </el-button>
            <el-button
              v-if="row.status === 1"
              type="danger"
              link
              size="small"
              :icon="Delete"
              @click="handleOpenRevoke(row)"
            >
              撤销
            </el-button>
            <el-text v-else type="info" size="small" style="margin-left: 8px;">已锁定</el-text>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页栏 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.size"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 模态框 1：荣誉证书精美大图预览 (带双金边框与公章) -->
    <el-dialog
      v-model="previewVisible"
      title="电子荣誉证书大图预览"
      width="640px"
      destroy-on-close
      center
      class="cert-preview-dialog"
    >
      <div v-if="currentCert" id="printableCertArea" class="cert-paper-card">
        <div class="cert-watermark-txt">EDUPOINT CREDENTIAL</div>
        <div class="cert-sub-header">UNIVERSITY ACTIVITY CREDENTIAL</div>
        <div class="cert-main-title">荣 誉 证 书</div>
        <div class="cert-en-title">CERTIFICATE OF EXCELLENCE</div>

        <div class="cert-body-text">
          兹证明
          <strong class="cert-highlight-name">{{ currentCert.studentName }}</strong>
          同学（学号：<span class="cert-highlight-no">{{ currentCert.studentNo }}</span>）在参加由
          <strong class="cert-highlight-issuer">{{ currentCert.issuer }}</strong>
          举办的
          <strong class="cert-highlight-act">【{{ currentCert.activityTitle }}】</strong>
          活动中，表现优异，考核合格，特发此证，以资鼓励！
        </div>

        <div class="cert-footer-meta">
          <div class="cert-meta-left">
            <div>防伪编号：<span class="mono-code">{{ currentCert.certificateNo }}</span></div>
            <div>核验网址：<span class="verify-url">{{ verifyBaseUrl }}</span></div>
            <div v-if="currentCert.status === 2" class="cert-revoked-warning">
              【此凭证已被校方撤销作废】原因：{{ currentCert.revokeReason }}
            </div>
          </div>
          <div class="cert-meta-center">
            <qrcode-vue
              :value="getVerifyUrl(currentCert.certificateNo)"
              :size="64"
              level="M"
              render-as="svg"
              class="cert-qrcode"
            />
            <span class="qr-hint">扫码公开验真</span>
          </div>
          <div class="cert-meta-right">
            <div class="issuer-name">{{ currentCert.issuer }}</div>
            <div class="issue-date">{{ currentCert.issueTime }}</div>
          </div>
        </div>

        <!-- 矢量电子公章 SVG -->
        <svg class="cert-seal-svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#dc2626" stroke-width="2.5" />
          <circle cx="50" cy="50" r="41" fill="none" stroke="#dc2626" stroke-width="1" stroke-dasharray="2 2" />
          <polygon points="50,22 53,30 62,30 55,35 58,44 50,38 42,44 45,35 38,30 47,30" fill="#dc2626" />
          <text x="50" y="66" font-size="9" font-weight="bold" fill="#dc2626" text-anchor="middle">校团委学工部</text>
          <text x="50" y="77" font-size="8" fill="#dc2626" text-anchor="middle">防伪电子公章</text>
        </svg>
      </div>

      <template #footer>
        <el-button @click="previewVisible = false">关闭预览</el-button>
        <el-button type="success" plain :icon="Checked" @click="handleVerifyOne(currentCert)">
          立即公开核验
        </el-button>
        <el-button type="primary" :icon="Printer" @click="handlePrintCert">
          打印证书
        </el-button>
      </template>
    </el-dialog>

    <!-- 模态框 2：撤销电子证书 Dialog (8.4) -->
    <el-dialog
      v-model="revokeVisible"
      title="撤销电子荣誉证书"
      width="480px"
      destroy-on-close
    >
      <el-alert
        title="撤销警告"
        type="error"
        description="证书一旦撤销，其状态将变为“已作废撤销 (REVOKED)”，公开核验页面将同步公示作废原因，且学生不可再下载原证书文件！"
        show-icon
        :closable="false"
        style="margin-bottom: 16px;"
      />

      <div v-if="certToRevoke" class="revoke-summary">
        <div><strong>撤销证书：</strong>{{ certToRevoke.title }}</div>
        <div><strong>防伪编号：</strong><code>{{ certToRevoke.certificateNo }}</code></div>
        <div><strong>获奖学生：</strong>{{ certToRevoke.studentName }} ({{ certToRevoke.studentNo }})</div>
      </div>

      <el-form
        ref="revokeFormRef"
        :model="revokeForm"
        :rules="revokeRules"
        label-position="top"
        style="margin-top: 16px;"
      >
        <el-form-item label="撤销作废原因 (必填)" prop="revokeReason">
          <el-input
            v-model="revokeForm.revokeReason"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="请输入撤销作废的具体核定原因（例如：学生因违反竞赛作弊纪律，经学术委员会核定撤销证书）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="revokeVisible = false">取消</el-button>
        <el-button type="danger" :loading="revokeSubmitting" @click="submitRevoke">
          确认撤销作废
        </el-button>
      </template>
    </el-dialog>

    <!-- 模态框 3：防伪在线快速核验 Dialog (8.2) -->
    <el-dialog
      v-model="quickVerifyVisible"
      title="电子证书防伪在线核验"
      width="480px"
      destroy-on-close
    >
      <el-form label-position="top">
        <el-form-item label="防伪证书编号 (Certificate No)">
          <el-input
            v-model="verifyInputCode"
            placeholder="例: CERT-2026-ACT2-A89F3B12"
            clearable
            style="font-family: monospace;"
            @keyup.enter="handleExecQuickVerify"
          >
            <template #append>
              <el-button :loading="verifying" @click="handleExecQuickVerify">核验</el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>

      <!-- 核验结果展示卡片 -->
      <div v-if="verifyResult" class="verify-result-box" :class="{ revoked: verifyResult.status === 2 }">
        <div class="verify-status-banner">
          <el-icon v-if="verifyResult.status === 1" :size="20"><CircleCheck /></el-icon>
          <el-icon v-else :size="20"><CircleClose /></el-icon>
          <span>{{ verifyResult.statusText }}</span>
        </div>
        <div class="verify-details">
          <div class="verify-row">
            <span class="k">获奖学生：</span>
            <span class="v font-bold">{{ verifyResult.studentNameMasked }} (隐私保护脱敏)</span>
          </div>
          <div class="verify-row">
            <span class="k">证书名称：</span>
            <span class="v">{{ verifyResult.title }}</span>
          </div>
          <div class="verify-row">
            <span class="k">活动名称：</span>
            <span class="v">{{ verifyResult.activityTitle }}</span>
          </div>
          <div class="verify-row">
            <span class="k">签发单位：</span>
            <span class="v">{{ verifyResult.issuer }}</span>
          </div>
          <div class="verify-row">
            <span class="k">颁发时间：</span>
            <span class="v">{{ verifyResult.issueTime }}</span>
          </div>
          <div v-if="verifyResult.revokeReason" class="verify-row text-danger">
            <span class="k">作废原因：</span>
            <span class="v font-bold">{{ verifyResult.revokeReason }}</span>
          </div>
          <div class="verify-row time">
            <span class="k">核验时间：</span>
            <span class="v">{{ verifyResult.verifyTime }}</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import QrcodeVue from 'qrcode.vue'
import {
  Search,
  Refresh,
  Medal,
  CircleCheck,
  CircleClose,
  View,
  Checked,
  Delete,
  Printer,
  Check
} from '@element-plus/icons-vue'
import {
  getCertificateListApi,
  getCertificateMetricsApi,
  revokeCertificateApi,
  verifyCertificateApi,
  type CertificateItem,
  type CertificateMetricsVO,
  type CertificateQueryParams,
  type CertificateVerifyResult
} from '@/api/certificate'

// 列表查询条件
const queryParams = reactive<CertificateQueryParams>({
  page: 1,
  size: 10,
  certificateNo: '',
  studentName: '',
  studentNo: '',
  activityTitle: '',
  status: ''
})

const loading = ref(false)
const certificateList = ref<CertificateItem[]>([])
const total = ref(0)

// 全量聚合指标状态
const metrics = ref<CertificateMetricsVO>({
  totalCount: 0,
  validCount: 0,
  revokedCount: 0,
  expiredCount: 0,
  verifyTotal: 0
})
const metricsLoaded = ref(false)
const metricsError = ref(false)

const fetchMetrics = async () => {
  metricsError.value = false
  try {
    const res = await getCertificateMetricsApi()
    if (res) {
      metrics.value = res
      metricsLoaded.value = true
    }
  } catch (error) {
    console.warn('[Certificate] 获取证书大盘统计失败:', error)
    metricsError.value = true
  }
}

// 动态统计面板（使用后端权威全量聚合数据，杜绝当前页推算与捏造）
const stats = computed(() => {
  const effectiveTotal = metricsLoaded.value
    ? metrics.value.totalCount
    : (total.value || metrics.value.totalCount || 0)

  return {
    total: effectiveTotal,
    valid: metrics.value.validCount ?? 0,
    verifications: metrics.value.verifyTotal ?? 0,
    revoked: metrics.value.revokedCount ?? 0,
    isError: metricsError.value
  }
})

// 移动端公开核验基地址配置
const verifyBaseUrl = computed(() => {
  const envUrl = (import.meta.env.VITE_VERIFY_BASE_URL as string)?.trim()
  if (envUrl) {
    if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
      return envUrl
    }
    return `${window.location.origin}${envUrl.startsWith('/') ? '' : '/'}${envUrl}`
  }
  const isProd = import.meta.env.PROD
  if (isProd) {
    return `${window.location.origin}/h5/#/pages/certificate/verify`
  }
  return `${window.location.protocol}//${window.location.hostname}:5173/#/pages/certificate/verify`
})

const getVerifyUrl = (certNo?: string) => {
  const base = verifyBaseUrl.value
  if (!certNo) return base
  return base.includes('?')
    ? `${base}&no=${encodeURIComponent(certNo)}`
    : `${base}?no=${encodeURIComponent(certNo)}`
}

// 预览弹窗状态
const previewVisible = ref(false)
const currentCert = ref<CertificateItem | null>(null)

// 撤销弹窗状态
const revokeVisible = ref(false)
const certToRevoke = ref<CertificateItem | null>(null)
const revokeSubmitting = ref(false)
const revokeFormRef = ref<FormInstance>()
const revokeForm = reactive({ revokeReason: '' })
/**
 * 撤销原因校验：必填（拒绝纯空白）+ 至少 4 字。
 * 该文案会同步公示在公开核验页，过短（如"测试"）无法向扫码者说明撤销依据。
 */
const revokeRules: FormRules = {
  revokeReason: [
    { required: true, whitespace: true, message: '请输入撤销作废原因', trigger: 'blur' },
    { min: 4, max: 200, message: '原因长度需在 4~200 字之间，该内容将在公开核验页公示', trigger: 'blur' }
  ]
}

// 快速核验弹窗状态
const quickVerifyVisible = ref(false)
const verifyInputCode = ref('')
const verifying = ref(false)
const verifyResult = ref<CertificateVerifyResult | null>(null)

// 加载数据
const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getCertificateListApi(queryParams)
    certificateList.value = res.records || []
    total.value = res.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '获取证书台账数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索与重置
const handleSearch = () => {
  queryParams.page = 1
  fetchData()
}

const handleReset = () => {
  queryParams.certificateNo = ''
  queryParams.studentName = ''
  queryParams.studentNo = ''
  queryParams.activityTitle = ''
  queryParams.status = ''
  queryParams.page = 1
  fetchData()
}

// 预览证书大图
const handlePreview = (row: CertificateItem) => {
  currentCert.value = row
  previewVisible.value = true
}

// 打印证书
const handlePrintCert = () => {
  window.print()
}

// 打开撤销模态框
const handleOpenRevoke = (row: CertificateItem) => {
  certToRevoke.value = row
  revokeForm.revokeReason = '学生因违反竞赛作弊纪律，经学术委员会核定撤销证书'
  // 清掉上一次可能残留的校验红框
  revokeFormRef.value?.clearValidate()
  revokeVisible.value = true
}

// 提交撤销操作
const submitRevoke = async () => {
  if (!certToRevoke.value) return
  // 标准表单校验：失败时错误内联展示在输入框下方（替代原先仅弹一条 warning 的做法）
  try {
    await revokeFormRef.value?.validate()
  } catch {
    return
  }
  const reason = revokeForm.revokeReason.trim()

  revokeSubmitting.value = true
  try {
    await revokeCertificateApi(certToRevoke.value.id, reason)
    ElMessage.success('证书已成功撤销作废')
    revokeVisible.value = false
    fetchData()
    fetchMetrics()
  } catch (error: any) {
    ElMessage.error(error.message || '撤销失败')
  } finally {
    revokeSubmitting.value = false
  }
}

// 打开快速核验
const openQuickVerifyModal = () => {
  verifyInputCode.value = ''
  verifyResult.value = null
  quickVerifyVisible.value = true
}

// 查验单个证书
const handleVerifyOne = (row: CertificateItem | null) => {
  if (!row) return
  verifyInputCode.value = row.certificateNo
  quickVerifyVisible.value = true
  handleExecQuickVerify()
}

// 执行在线防伪核验
const handleExecQuickVerify = async () => {
  const code = verifyInputCode.value.trim()
  if (!code) {
    ElMessage.warning('请输入防伪证书编号')
    return
  }

  verifying.value = true
  try {
    const res = await verifyCertificateApi(code)
    verifyResult.value = res
  } catch (error: any) {
    ElMessage.error(error.message || '核验未通过，请检查编号')
    verifyResult.value = null
  } finally {
    verifying.value = false
  }
}

onMounted(() => {
  fetchData()
  fetchMetrics()
})
</script>

<style scoped>
.certificate-container {
  padding: 16px;
  background-color: var(--app-fill);
  min-height: calc(100vh - 84px);
}

.metrics-row {
  margin-bottom: 16px;
}

.metric-card {
  border-radius: 8px;
  border: 1px solid var(--app-border);
}

.metric-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-size: 13px;
  color: var(--app-text-2);
  margin-bottom: 4px;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--app-text-1);
}

.metric-unit {
  font-size: 12px;
  font-weight: normal;
  color: var(--app-text-3);
  margin-left: 2px;
}

.text-primary {
  color: var(--app-color-primary) !important;
}
.text-success {
  color: var(--app-color-success) !important;
}
.text-danger {
  color: var(--app-color-danger) !important;
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-icon.primary {
  background: var(--el-color-primary-light-9);
  color: var(--app-color-primary);
}
.metric-icon.success {
  background: var(--el-color-success-light-9);
  color: var(--app-color-success);
}
.metric-icon.warning {
  background: var(--el-color-warning-light-9);
  color: var(--app-color-warning);
}
.metric-icon.danger {
  background: var(--el-color-danger-light-9);
  color: var(--app-color-danger);
}

.search-card,
.table-card {
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid var(--app-border);
}

.table-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--app-text-1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.cert-no-tag {
  font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
  font-weight: 600;
  font-size: 12px;
  color: var(--app-color-primary);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-8);
  padding: 3px 8px;
  border-radius: 4px;
}

.student-info-cell {
  display: flex;
  flex-direction: column;
}

.student-info-cell .name {
  font-weight: 600;
  color: var(--app-text-1);
}

.student-info-cell .no {
  font-size: 11px;
  color: var(--app-text-3);
  font-family: monospace;
}

.font-bold {
  font-weight: 600;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* 证书大图预览模拟纸质画幅 */
.cert-paper-card {
  background: #fffdfa;
  border: 5px double #b45309;
  border-radius: 8px;
  padding: 28px 24px;
  text-align: center;
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  color: var(--app-text-1);
}

.cert-watermark-txt {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-25deg);
  font-size: 36px;
  font-weight: 900;
  color: rgba(180, 83, 9, 0.05);
  letter-spacing: 4px;
  white-space: nowrap;
  pointer-events: none;
}

.cert-sub-header {
  font-size: 10px;
  color: #78350f;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.cert-main-title {
  font-size: 22px;
  font-weight: 800;
  color: #b45309;
  letter-spacing: 6px;
  margin-bottom: 4px;
}

.cert-en-title {
  font-size: 10px;
  color: #78350f;
  letter-spacing: 1px;
  margin-bottom: 20px;
}

.cert-body-text {
  font-size: 14px;
  color: var(--app-text-2);
  line-height: 2;
  text-align: justify;
  padding: 0 12px;
  margin-bottom: 28px;
}

.cert-highlight-name {
  font-size: 16px;
  color: var(--app-text-1);
  border-bottom: 1.5px solid #b45309;
  padding: 0 4px;
}

.cert-highlight-no {
  font-family: monospace;
}

.cert-highlight-act {
  color: var(--app-text-1);
}

.cert-footer-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 12px;
}

.cert-meta-left {
  text-align: left;
  font-size: 11px;
  color: var(--app-text-2);
  font-family: monospace;
}

.cert-meta-left .mono-code {
  color: var(--app-color-primary);
  font-weight: 600;
}

.cert-revoked-warning {
  color: var(--app-color-danger);
  font-weight: 600;
  margin-top: 4px;
}

.cert-meta-right {
  text-align: right;
}

.cert-meta-right .issuer-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--app-text-1);
}

.cert-meta-right .issue-date {
  font-size: 11px;
  color: var(--app-text-2);
  margin-top: 2px;
}

.cert-seal-svg {
  position: absolute;
  right: 20px;
  bottom: 18px;
  width: 86px;
  height: 86px;
  transform: rotate(-12deg);
  opacity: 0.85;
  pointer-events: none;
}

.revoke-summary {
  background: var(--el-color-danger-light-9);
  border: 1px solid var(--el-color-danger-light-9);
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--app-text-2);
}

.verify-result-box {
  border: 1px solid var(--app-color-success);
  background: var(--el-color-success-light-9);
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
}

.verify-result-box.revoked {
  border-color: var(--app-color-danger);
  background: var(--el-color-danger-light-9);
}

.verify-status-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--app-color-success);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed rgba(103, 194, 58, 0.3);
}

.verify-result-box.revoked .verify-status-banner {
  color: var(--app-color-danger);
  border-bottom-color: rgba(245, 108, 108, 0.3);
}

.verify-details {
  font-size: 13px;
  line-height: 1.8;
}

.verify-row {
  display: flex;
}

.verify-row .k {
  width: 80px;
  color: var(--app-text-2);
}

.verify-row .v {
  flex: 1;
  color: var(--app-text-1);
}

.verify-row.time {
  font-size: 11px;
  color: var(--app-text-3);
  margin-top: 6px;
}

.cert-meta-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.cert-qrcode {
  background: #ffffff;
  padding: 4px;
  border: 1px solid var(--app-border);
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.qr-hint {
  font-size: 10px;
  color: #78350f;
  font-weight: 600;
  letter-spacing: 0.5px;
}

@media print {
  body * {
    visibility: hidden;
  }
  #printableCertArea,
  #printableCertArea * {
    visibility: visible;
  }
  #printableCertArea {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    border: 5px double #b45309;
    box-shadow: none;
  }
}
</style>
