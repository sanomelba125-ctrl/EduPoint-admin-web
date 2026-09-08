import { http } from '@/utils/request'

/**
 * 通用图片上传接口 (POST /api/common/upload)
 * 经由后端验证登录态后直接上传至七牛云对象存储，返回公网外链 URL
 */
export function uploadImageApi(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  return http.post<string>('/common/upload', formData)
}
