import request from '@/utils/request'

/**
 * 带安全认证头的文件流下载工具函数。
 *
 * 规范：
 * 1. 严格使用请求拦截器通过 Header 携带 satoken，严禁将 Token 拼接在 URL 中，
 *    彻底避免敏感长期凭证落入浏览器历史记录、Referer 标头及服务器访问日志；
 * 2. 优先从后端的 Content-Disposition 标头中提取标准 UTF-8 编码的文件名；
 * 3. 防御性拦截错误响应（如服务端 500 JSON 错误），避免保存损坏文件；
 * 4. 自动创建与释放 Object URL，防止前端内存泄漏。
 *
 * @param url 下载接口路径（如 '/admin/export/activity-records'）
 * @param params 过滤查询参数
 * @param fallbackFileName 备选缺省文件名
 */
export async function downloadFile(
  url: string,
  params?: Record<string, string | number | undefined | null>,
  fallbackFileName: string = 'export.xlsx'
): Promise<void> {
  const response: any = await request.get(url, {
    params,
    responseType: 'blob'
  })

  // 1. 兼容获取实际的 Blob 数据
  const blob: Blob =
    response?.data instanceof Blob
      ? response.data
      : response instanceof Blob
        ? response
        : new Blob([response?.data || response])

  // 2. 防御性检查：若后端发生异常返回了 JSON 错误信息而非 Excel 流，解析并抛出业务异常
  if (blob.type === 'application/json' || (blob.type && blob.type.includes('json'))) {
    const text = await blob.text()
    try {
      const errJson = JSON.parse(text)
      throw new Error(errJson.message || '导出报表失败，服务端返回错误')
    } catch (e: any) {
      throw new Error(e.message || '导出报表失败')
    }
  }

  // 3. 从 Content-Disposition 标头中解析文件名
  const headers = response?.headers || {}
  const disposition = (headers['content-disposition'] || headers['Content-Disposition']) as string | undefined
  let fileName = fallbackFileName

  if (disposition) {
    // 优先匹配 RFC 5987 规范的 filename*=utf-8''xxx 格式
    const utf8Match = /filename\*=(?:utf-8''|UTF-8'')([^;]+)/i.exec(disposition)
    if (utf8Match && utf8Match[1]) {
      fileName = decodeURIComponent(utf8Match[1].trim())
    } else {
      // 兼容标准 filename="xxx" 或 filename=xxx 格式
      const standardMatch = /filename="?([^";]+)"?/i.exec(disposition)
      if (standardMatch && standardMatch[1]) {
        fileName = decodeURIComponent(standardMatch[1].trim())
      }
    }
  }

  // 4. 创建临时 ObjectURL 触发静默下载并及时释放
  const blobUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(blobUrl)
}
