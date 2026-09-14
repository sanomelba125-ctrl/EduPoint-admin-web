<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Refresh,
  Check,
  Close,
  Key
} from '@element-plus/icons-vue'
import {
  getGiftOrderList,
  confirmDelivery,
  cancelGiftOrder,
  type StudentGiftVO,
  type GiftOrderQuery,
  type DeliveryConfirmDTO,
  type OrderCancelDTO
} from '@/api/gift'

import { usePageList } from '@/hooks/usePageList'

// 组合搜索词
const searchKeyword = ref('')

// 列表与分页状态及检索
const {
  loading,
  list: orderList,
  total,
  queryParams,
  load: fetchOrders,
  handleSearch,
  handleReset: resetOrderFilters,
  handleSizeChange,
  handleCurrentChange
} = usePageList<Omit<GiftOrderQuery, 'page' | 'size'>, StudentGiftVO>({
  initialFilters: {
    orderNo: '',
    pickupCode: '',
    studentName: '',
    status: undefined
  },
  fetcher: (params) => {
    const kw = searchKeyword.value.trim()
    let pickupCode: string | undefined = undefined
    let orderNo: string | undefined = undefined
    let studentName: string | undefined = undefined

    if (kw) {
      if (kw.toUpperCase().startsWith('PK') || /^[A-Za-z0-9]{6,8}$/.test(kw)) {
        pickupCode = kw
      } else if (kw.toUpperCase().startsWith('ORD')) {
        orderNo = kw
      } else {
        studentName = kw
      }
    }

    return getGiftOrderList({
      ...params,
      pickupCode,
      orderNo,
      studentName
    })
  }
})

const handleReset = () => {
  searchKeyword.value = ''
  resetOrderFilters()
}

// 提货码现场核销弹窗
const verifyModalVisible = ref(false)
const verifyInputCode = ref('')
const verifyLoading = ref(false)
const matchedOrder = ref<StudentGiftVO | null>(null)
const writeoffRemark = ref('')

// 退单弹窗
const cancelModalVisible = ref(false)
const currentCancelOrder = ref<StudentGiftVO | null>(null)
const cancelReason = ref('与学生沟通一致取消')
const refundPointsChecked = ref(true)
const cancelLoading = ref(false)



// 快速核销
const openVerifyDialog = (pickupCode?: string) => {
  verifyInputCode.value = pickupCode || ''
  matchedOrder.value = null
  writeoffRemark.value = ''
  verifyModalVisible.value = true

  if (pickupCode) {
    doSearchPickupCode()
  }
}

const doSearchPickupCode = () => {
  const code = verifyInputCode.value.trim().toUpperCase()
  if (!code) {
    ElMessage.warning('请输入学生出示的提货码')
    return
  }

  // 先在当前列表匹配
  const found = orderList.value.find(
    o => o.pickupCode.toUpperCase().replace(/[\s-]/g, '') === code.replace(/[\s-]/g, '')
  )
  if (found) {
    matchedOrder.value = found
  } else {
    // 列表若没查到，通过关键词快速请求后端
    matchedOrder.value = null
    ElMessage.info('正在全库查询该提货码...')
    queryParams.pickupCode = code
    getGiftOrderList({ page: 1, size: 1, pickupCode: code }).then((res: any) => {
      const records = res?.records || (Array.isArray(res) ? res : [])
      if (records.length > 0) {
        matchedOrder.value = records[0]
      } else {
        ElMessage.error('未查询到对应的有效兑换订单，请核对提货码')
      }
    })
  }
}

const handleConfirmVerify = async () => {
  if (!matchedOrder.value) return
  if (matchedOrder.value.status !== 1) {
    ElMessage.warning('该订单非待提货状态，不可重复核销')
    return
  }

  verifyLoading.value = true
  try {
    const payload: DeliveryConfirmDTO = {
      orderId: matchedOrder.value.id,
      pickupCode: matchedOrder.value.pickupCode,
      remark: writeoffRemark.value
    }
    await confirmDelivery(payload)
    ElMessage.success(`订单 #${matchedOrder.value.orderNo} 提货核销成功！`)
    verifyModalVisible.value = false
    fetchOrders()
  } catch (err: any) {
    ElMessage.error(err.message || '核销失败')
  } finally {
    verifyLoading.value = false
  }
}

// 退单
const openCancelDialog = (row: StudentGiftVO) => {
  currentCancelOrder.value = row
  cancelReason.value = '与学生沟通一致取消'
  refundPointsChecked.value = true
  cancelModalVisible.value = true
}

const handleConfirmCancel = async () => {
  if (!currentCancelOrder.value) return
  cancelLoading.value = true
  try {
    const payload: OrderCancelDTO = {
      orderId: currentCancelOrder.value.id,
      cancelReason: cancelReason.value,
      refundPoints: refundPointsChecked.value
    }
    await cancelGiftOrder(payload)
    ElMessage.success('订单已成功取消，积分已原路退回学生账户')
    cancelModalVisible.value = false
    fetchOrders()
  } catch (err: any) {
    ElMessage.error(err.message || '取消订单失败')
  } finally {
    cancelLoading.value = false
  }
}

</script>

<template>
  <div class="gift-order-page">
    <!-- 筛选面板 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="检索订单">
          <el-input
            v-model="searchKeyword"
            placeholder="输入学号 / 姓名 / 提货码 / 订单号..."
            clearable
            @keyup.enter="handleSearch"
            style="width: 280px;"
          />
        </el-form-item>

        <el-form-item label="履约状态">
          <el-select
            v-model="queryParams.status"
            placeholder="全部状态"
            clearable
            style="width: 150px;"
            @change="handleSearch"
          >
            <el-option label="待提货 (待核销)" :value="1" />
            <el-option label="已提货 (已完成)" :value="2" />
            <el-option label="已取消 (已退款)" :value="3" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>

        <div class="filter-right">
          <el-button type="primary" :icon="Key" @click="openVerifyDialog()">
            提货码现场核销
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 订单表格 -->
    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="loading"
        :data="orderList"
        stripe
        style="width: 100%"
        row-key="id"
      >
        <el-table-column label="订单编号 / 时间" width="180">
          <template #default="{ row }">
            <div class="order-no-text">{{ row.orderNo }}</div>
            <div class="sub-text">{{ row.createTime }}</div>
          </template>
        </el-table-column>

        <el-table-column label="申请学生" min-width="150">
          <template #default="{ row }">
            <div class="student-name">{{ row.studentName || row.receiverName || '学生' }}</div>
            <div class="sub-text">
              {{ row.studentNo || '-' }}
              <span v-if="row.className">· {{ row.className }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="兑换礼品" min-width="180">
          <template #default="{ row }">
            <div class="gift-name">{{ row.giftName || '礼品' }}</div>
            <div class="sub-text" v-if="row.receiverPhone">联系方式: {{ row.receiverPhone }}</div>
          </template>
        </el-table-column>

        <el-table-column prop="quantity" label="数量" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="primary" effect="plain">{{ row.quantity }} 件</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="pointsCost" label="消耗积分" width="120" align="right">
          <template #default="{ row }">
            <span class="points-cost">-{{ row.pointsCost }} <small>pts</small></span>
          </template>
        </el-table-column>

        <el-table-column label="提货凭证码" width="140" align="center">
          <template #default="{ row }">
            <span class="order-code-badge">{{ row.pickupCode }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="履约状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 1 ? 'warning' : row.status === 2 ? 'success' : 'info'"
              effect="light"
              size="small"
            >
              {{ row.status === 1 ? '待提货' : row.status === 2 ? '已提货' : '已取消' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="核销/取消时间" width="170">
          <template #default="{ row }">
            <span class="sub-text">
              {{ row.deliveryTime || row.cancelTime || '-' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="170" fixed="right" align="right">
          <template #default="{ row }">
            <template v-if="row.status === 1">
              <el-button
                link
                type="primary"
                size="small"
                :icon="Check"
                @click="openVerifyDialog(row.pickupCode)"
              >
                核销
              </el-button>
              <el-button
                link
                type="danger"
                size="small"
                :icon="Close"
                @click="openCancelDialog(row)"
              >
                退单
              </el-button>
            </template>
            <template v-else>
              <span class="sub-text">已办结</span>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.size"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 提货码现场核销弹窗 -->
    <el-dialog
      v-model="verifyModalVisible"
      title="现场提货码验证与核销"
      width="480px"
      destroy-on-close
    >
      <div class="pickup-verify-box">
        <div class="pickup-tip">请输入学生出示的 8 位提货凭证码 (或扫码枪直接录入)：</div>
        <div class="input-row">
          <el-input
            v-model="verifyInputCode"
            maxlength="10"
            class="pickup-verify-input"
            placeholder="例如: PK889201"
            clearable
            @keyup.enter="doSearchPickupCode"
          />
          <el-button type="primary" @click="doSearchPickupCode">核验提货码</el-button>
        </div>
      </div>

      <!-- 匹配结果卡片 -->
      <div v-if="matchedOrder" class="verify-result-card">
        <div class="res-header">
          <strong>订单 #{{ matchedOrder.orderNo }}</strong>
          <el-tag
            :type="matchedOrder.status === 1 ? 'warning' : 'success'"
            size="small"
          >
            {{ matchedOrder.status === 1 ? '待提货' : '已提货完成' }}
          </el-tag>
        </div>

        <div class="res-grid">
          <div>
            <span class="label">提货学生：</span>
            <strong>{{ matchedOrder.studentName || matchedOrder.receiverName }}</strong>
            <small v-if="matchedOrder.studentNo"> ({{ matchedOrder.studentNo }})</small>
          </div>
          <div>
            <span class="label">兑换礼品：</span>
            <strong>{{ matchedOrder.giftName }}</strong>
          </div>
          <div>
            <span class="label">兑换数量：</span>
            <el-tag size="small" type="primary">{{ matchedOrder.quantity }} 件</el-tag>
          </div>
          <div>
            <span class="label">扣减积分：</span>
            <strong class="points-warn">{{ matchedOrder.pointsCost }} pts</strong>
          </div>
          <div style="grid-column: span 2;">
            <span class="label">下单时间：</span>
            <span>{{ matchedOrder.createTime }}</span>
          </div>
        </div>

        <el-input
          v-if="matchedOrder.status === 1"
          v-model="writeoffRemark"
          placeholder="现场发放备注 (可选)"
          style="margin-top: 12px;"
        />

        <div v-if="matchedOrder.status === 1" class="res-alert">
          核销确认后，订单状态将变更为【已提货 COMPLETED】，扣减实物库存并记入履约审计日志。
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="verifyModalVisible = false">关闭窗口</el-button>
          <el-button
            v-if="matchedOrder && matchedOrder.status === 1"
            type="success"
            :loading="verifyLoading"
            @click="handleConfirmVerify"
          >
            确认交付并核销
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 退单确认弹窗 -->
    <el-dialog
      v-model="cancelModalVisible"
      title="订单退单与积分返还确认"
      width="440px"
      destroy-on-close
    >
      <div v-if="currentCancelOrder" class="cancel-dialog-content">
        <p>确定要为学生 <strong>{{ currentCancelOrder.studentName }}</strong> 取消订单吗？</p>
        <div class="cancel-detail">
          <div>订单编号: {{ currentCancelOrder.orderNo }}</div>
          <div>兑换商品: {{ currentCancelOrder.giftName }} x {{ currentCancelOrder.quantity }} 件</div>
          <div>消耗积分: <strong>{{ currentCancelOrder.pointsCost }} pts</strong></div>
        </div>
        <el-form label-position="top" style="margin-top: 14px;">
          <el-form-item label="退单驳回原因">
            <el-input v-model="cancelReason" placeholder="请输入退单原因..." />
          </el-form-item>
          <el-form-item>
            <el-checkbox v-model="refundPointsChecked">原路退还该笔兑换积分 (推荐)</el-checkbox>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelModalVisible = false">取消</el-button>
          <el-button type="danger" :loading="cancelLoading" @click="handleConfirmCancel">
            确认驳回退单
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.gift-order-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card, .table-card {
  border-radius: 6px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.filter-right {
  margin-left: auto;
}

.order-no-text {
  font-family: monospace;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.sub-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.student-name, .gift-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.points-cost {
  font-weight: 700;
  color: var(--el-color-warning);
  font-size: 14px;
}

.order-code-badge {
  font-family: monospace;
  font-weight: 700;
  letter-spacing: 1px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--el-color-primary-light-8);
  display: inline-block;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.pickup-verify-box {
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.pickup-tip {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 10px;
}

.input-row {
  display: flex;
  gap: 10px;
}

.pickup-verify-input :deep(input) {
  font-family: monospace;
  font-size: 16px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--el-color-primary);
}

.verify-result-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 14px;
}

.res-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  padding-bottom: 8px;
  margin-bottom: 10px;
}

.res-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  font-size: 13px;
}

.res-grid .label {
  color: var(--el-text-color-secondary);
}

.points-warn {
  color: var(--el-color-warning);
}

.res-alert {
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-8);
  padding: 8px 10px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--el-color-warning-dark-2);
  margin-top: 12px;
}

.cancel-detail {
  background: var(--el-fill-color-light);
  padding: 10px;
  border-radius: 4px;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}
</style>
