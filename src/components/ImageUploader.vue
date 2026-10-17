<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Picture, UploadFilled, Check } from '@element-plus/icons-vue'
import { uploadImageApi } from '@/api/common'

/**
 * 通用图片/头像上传组件：上传至七牛云存储并回填外链 URL
 * 支持 v-model 双向绑定、文件格式校验、最大体积限制、自定义预览尺寸
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string
    /** 用于提示语，如「头像」「礼品照片」 */
    label?: string
    /** 单文件体积上限 (MB)，默认 5MB */
    maxSizeMb?: number
    /** 图片预览长宽尺寸 (px)，默认 68px */
    previewSize?: number | string
  }>(),
  {
    modelValue: '',
    label: '图片',
    maxSizeMb: 5,
    previewSize: 68
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const uploading = ref(false)

const model = computed({
  get: () => props.modelValue || '',
  set: (val: string) => emit('update:modelValue', val)
})

const boxSizeStyle = computed(() => {
  const size = typeof props.previewSize === 'number' ? `${props.previewSize}px` : props.previewSize
  return {
    width: size,
    height: size
  }
})

const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLtLimit = file.size / 1024 / 1024 < props.maxSizeMb

  if (!isImage) {
    ElMessage.error('只能上传图片格式文件 (JPG/PNG/WEBP/GIF)!')
    return false
  }
  if (!isLtLimit) {
    ElMessage.error(`上传${props.label}不能超过 ${props.maxSizeMb}MB!`)
    return false
  }
  return true
}

const handleUpload = async (options: any) => {
  const file = options?.file as File
  if (!file) return

  uploading.value = true
  try {
    const url = await uploadImageApi(file)
    model.value = url
    ElMessage.success(`${props.label}已成功上传至七牛云存储！`)
  } catch (err: any) {
    console.error('上传七牛云异常:', err)
    ElMessage.error(err?.message || '上传七牛云失败，请检查网络或后端配置')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="image-uploader">
    <el-upload
      class="uploader-trigger"
      :show-file-list="false"
      :before-upload="beforeUpload"
      :http-request="handleUpload"
      accept="image/jpeg,image/png,image/jpg,image/webp,image/gif"
    >
      <div
        v-if="model"
        v-loading="uploading"
        class="preview-box"
        :style="boxSizeStyle"
      >
        <img :src="model" class="preview-img" alt="预览图" />
        <div class="hover-mask">
          <el-icon :size="16"><UploadFilled /></el-icon>
          <span>更换图片</span>
        </div>
      </div>
      <div
        v-else
        v-loading="uploading"
        class="placeholder-box"
        :style="boxSizeStyle"
      >
        <el-icon class="uploader-icon" :size="20"><Plus /></el-icon>
        <span class="uploader-text">上传至七牛云</span>
      </div>
    </el-upload>

    <div class="url-box">
      <el-input
        v-model="model"
        :placeholder="`支持直接上传图片，或在此粘贴${label}外链 URL`"
        clearable
        :prefix-icon="Picture"
      />
      <div class="url-tip">
        <span v-if="model" class="qiniu-status">
          <el-icon color="var(--app-color-success)"><Check /></el-icon> 七牛云存储地址就绪
          <el-button link type="danger" size="small" style="margin-left: 8px;" @click="model = ''">
            清空
          </el-button>
        </span>
        <span v-else class="tip-text">
          支持 JPG/PNG/WEBP，点击左侧按钮直接上传七牛云（上限 {{ maxSizeMb }}MB）
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-uploader {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.uploader-trigger {
  flex-shrink: 0;
}

.preview-box {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  cursor: pointer;
  background-color: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hover-mask {
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

.preview-box:hover .hover-mask {
  opacity: 1;
}

.placeholder-box {
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

.placeholder-box:hover {
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

.url-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.url-tip {
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
