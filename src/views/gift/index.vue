<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Search, Refresh, Edit, Delete, SwitchButton, Present } from '@element-plus/icons-vue'
import ImageUploader from '@/components/ImageUploader.vue'
import {
  getGiftList,
  createGift,
  updateGift,
  deleteGift,
  toggleGiftStatus,
  type GiftVO,
  type GiftCreateDTO,
  type GiftUpdateDTO,
  type GiftQuery
} from '@/api/gift'

import { usePageList } from '@/hooks/usePageList'

// 列表与分页状态及检索
const {
  loading,
  list: giftList,
  total,
  queryParams,
  load: fetchGifts,
  handleSearch,
  handleReset,
  handleSizeChange,
  handleCurrentChange
} = usePageList<Omit<GiftQuery, 'page' | 'size'>, GiftVO>({
  initialFilters: {
    name: '',
    status: undefined
  },
  fetcher: (params) => getGiftList(params)
})

// 弹窗状态
const dialogVisible = ref(false)
const dialogTitle = ref('上架新礼品')
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const formData = reactive({
  id: undefined as number | undefined,
  name: '',
  pointsCost: 100,
  stock: 50,
  description: '',
  image: '',
  status: 1
})

const formRules = reactive<FormRules>({
  name: [{ required: true, message: '请输入礼品名称', trigger: 'blur' }],
  pointsCost: [{ required: true, message: '请输入所需积分', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入初始库存', trigger: 'blur' }]
})



const openCreateDialog = () => {
  isEdit.value = false
  dialogTitle.value = '上架新礼品'
  formData.id = undefined
  formData.name = ''
  formData.pointsCost = 100
  formData.stock = 50
  formData.description = ''
  formData.image = ''
  formData.status = 1
  dialogVisible.value = true
}



const openEditDialog = (row: GiftVO) => {
  isEdit.value = true
  dialogTitle.value = `编辑礼品 - ${row.name}`
  formData.id = row.id
  formData.name = row.name
  formData.pointsCost = row.pointsCost || row.pointsRequired || 100
  formData.stock = row.stock !== undefined ? row.stock : (row.totalStock !== undefined ? row.totalStock : 50)
  formData.description = row.description || ''
  formData.image = row.image || ''
  formData.status = row.status !== undefined ? row.status : 1
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitLoading.value = true
    try {
      if (isEdit.value && formData.id) {
        const updateDTO: GiftUpdateDTO = {
          id: formData.id,
          name: formData.name,
          pointsCost: formData.pointsCost,
          pointsRequired: formData.pointsCost,
          description: formData.description,
          image: formData.image,
          status: formData.status
        }
        await updateGift(updateDTO)
        ElMessage.success('礼品信息已成功更新')
      } else {
        const createDTO: GiftCreateDTO = {
          name: formData.name,
          pointsCost: formData.pointsCost,
          pointsRequired: formData.pointsCost,
          stock: formData.stock,
          totalStock: formData.stock,
          description: formData.description,
          image: formData.image,
          status: formData.status
        }
        await createGift(createDTO)
        ElMessage.success('新礼品上架成功')
      }
      dialogVisible.value = false
      fetchGifts()
    } catch (err: any) {
      ElMessage.error(err.message || '操作失败')
    } finally {
      submitLoading.value = false
    }
  })
}

const handleToggleStatus = async (row: GiftVO) => {
  const newStatus = row.status === 1 ? 0 : 1
  const actionText = newStatus === 1 ? '上架' : '下架'
  try {
    await ElMessageBox.confirm(
      `确定要将礼品【${row.name}】执行${actionText}操作吗？${newStatus === 0 ? '下架后移动端学生将不可见及不可兑换。' : ''}`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: newStatus === 1 ? 'info' : 'warning'
      }
    )
    await toggleGiftStatus(row.id, newStatus)
    row.status = newStatus
    ElMessage.success(`礼品【${row.name}】已成功${actionText}`)
    fetchGifts()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '状态切换失败')
    }
  }
}

const handleDelete = async (row: GiftVO) => {
  try {
    await ElMessageBox.confirm(
      `确定要从礼品库删除【${row.name}】吗？删除后不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await deleteGift(row.id)
    ElMessage.success('礼品已成功删除')
    fetchGifts()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '删除失败')
    }
  }
}

</script>

<template>
  <div class="gift-page">
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="queryParams" class="filter-form">
        <el-form-item label="礼品名称">
          <el-input
            v-model="queryParams.name"
            placeholder="搜索礼品名称..."
            clearable
            style="width: 220px;"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="货架状态">
          <el-select
            v-model="queryParams.status"
            placeholder="全部状态"
            clearable
            style="width: 140px;"
            @change="handleSearch"
          >
            <el-option label="上架在售" :value="1" />
            <el-option label="下架停售" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
        <div class="filter-right">
          <el-button type="primary" :icon="Plus" @click="openCreateDialog">上架新礼品</el-button>
        </div>
      </el-form>
    </el-card>

    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="loading"
        :data="giftList"
        stripe
        style="width: 100%"
        row-key="id"
      >
        <el-table-column label="商品编号" width="110">
          <template #default="{ row }">
            <span class="code-text">#G{{ String(row.id).padStart(4, '0') }}</span>
          </template>
        </el-table-column>

        <el-table-column label="礼品商品" min-width="220">
          <template #default="{ row }">
            <div class="gift-col">
              <div class="thumb-box">
                <el-image
                  v-if="row.image"
                  :src="row.image"
                  fit="cover"
                  class="gift-img"
                >
                  <template #error>
                    <el-icon><Present /></el-icon>
                  </template>
                </el-image>
                <el-icon v-else><Present /></el-icon>
              </div>
              <div class="gift-info">
                <div class="gift-title">{{ row.name }}</div>
                <div v-if="row.description" class="gift-desc">{{ row.description }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="pointsCost" label="所需积分" width="130" align="right">
          <template #default="{ row }">
            <span class="points-text">{{ row.pointsCost || row.pointsRequired || 0 }} <small>pts</small></span>
          </template>
        </el-table-column>

        <el-table-column prop="stock" label="可用库存" width="130" align="center">
          <template #default="{ row }">
            <div class="stock-cell">
              <span :class="['stock-num', (row.stock !== undefined ? row.stock : (row.totalStock || 0)) <= 0 ? 'out' : '']">
                {{ row.stock !== undefined ? row.stock : (row.totalStock || 0) }}
              </span>
              <el-tag v-if="(row.stock !== undefined ? row.stock : (row.totalStock || 0)) <= 0" type="danger" size="small" effect="plain" class="tag-ml">缺货</el-tag>
              <el-tag v-else-if="(row.stock !== undefined ? row.stock : (row.totalStock || 0)) <= 5" type="warning" size="small" effect="plain" class="tag-ml">告急</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="version" label="乐观锁版本" width="120" align="center">
          <template #default="{ row }">
            <span class="version-tag">v{{ row.version || 0 }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="货架状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" effect="light" size="small">
              {{ row.status === 1 ? '上架在售' : '下架停售' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="updateTime" label="更新时间" width="170">
          <template #default="{ row }">
            <span class="time-text">{{ row.updateTime || row.createTime || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right" align="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button
              link
              :type="row.status === 1 ? 'warning' : 'success'"
              :icon="SwitchButton"
              size="small"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 1 ? '下架' : '上架' }}
            </el-button>
            <el-button link type="danger" :icon="Delete" size="small" @click="handleDelete(row)">删除</el-button>
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="560px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="110px"
        label-position="right"
      >
        <el-form-item label="礼品名称" prop="name">
          <el-input v-model="formData.name" placeholder="例如: 定制316不锈钢保温杯 (曜石黑)" />
        </el-form-item>

        <el-form-item label="兑换所需积分" prop="pointsCost">
          <el-input-number
            v-model="formData.pointsCost"
            :min="1"
            :step="10"
            style="width: 100%;"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item :label="isEdit ? '当前实时库存' : '初始可用库存'" prop="stock">
          <el-input-number
            v-model="formData.stock"
            :min="0"
            :step="10"
            :disabled="isEdit"
            style="width: 100%;"
            controls-position="right"
          />
          <div v-if="isEdit" style="font-size: 12px; color: #909399; margin-top: 4px; line-height: 1.4;">
            💡 实时库存由前台兑换与核销动态扣减与回退。修改礼品基本信息不变更当前库存。
          </div>
        </el-form-item>

        <el-form-item label="礼品封面照片" prop="image">
          <ImageUploader v-model="formData.image" label="礼品照片" :preview-size="80" />
        </el-form-item>

        <el-form-item label="礼品说明/提货" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="例如: 大学生活动中心 102 创客中心现场核销提货"
          />
        </el-form-item>

        <el-form-item label="初始货架状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :label="1">立即上架在售</el-radio>
            <el-radio :label="0">暂存为下架状态</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
            确认保存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.gift-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
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

.table-card {
  border-radius: 6px;
}

.code-text {
  font-family: monospace;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.gift-col {
  display: flex;
  align-items: center;
  gap: 12px;
}

.thumb-box {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-primary);
  flex-shrink: 0;
  font-size: 20px;
}

.gift-img {
  width: 44px;
  height: 44px;
  border-radius: 6px;
}

.gift-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gift-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.gift-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.3;
}

.points-text {
  font-weight: 700;
  font-size: 15px;
  color: var(--el-color-warning);
}

.points-text small {
  font-size: 12px;
  font-weight: normal;
}

.stock-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.stock-num {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.stock-num.out {
  color: var(--el-color-danger);
}

.tag-ml {
  margin-left: 6px;
}

.version-tag {
  font-family: monospace;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
}

.time-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

</style>
