import axios from 'axios'
import type { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'

/**
 * 统一 RESTful API 响应数据结构
 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp: number
}

// 创建 axios 实例：优先读取环境变量中配置的后端服务地址，支持直连后端(如 http://localhost:8080/api)或通过 Vite/Nginx 代理(/api)
const request: AxiosInstance = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL as string) || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 注入 Sa-Token 认证请求头
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers['satoken'] = token
    }
    // 若为 FormData 文件上传，删除默认 application/json 让浏览器自动计算 boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器：严格遵循 RESTful 规范（200 正常，5XX 错误）
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data

    // 1. 如果响应为二进制文件流 (如导出 Excel/下载附件)，直接返回完整响应对象以便解析 headers 与 Blob
    if (response.config.responseType === 'blob') {
      return response as any
    }

    // 2. 200 状态码：接口正常成功，解包并返回业务数据 data
    if (res.code === 200) {
      return res.data
    }

    // 3. 401 状态码：登录未授权或 Token 过期
    if (res.code === 401) {
      ElMessage.error(res.message || '登录已过期，请重新登录')
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
      return Promise.reject(new Error(res.message || 'Unauthorized'))
    }

    // 4. 5XX 状态码：服务端或业务接口错误 (500, 501, 502 等)，提取 message 错误信息并提示
    if (res.code >= 500 && res.code < 600) {
      const errMsg = res.message || `服务端业务错误 [${res.code}]`
      ElMessage.error(errMsg)
      return Promise.reject(new Error(errMsg))
    }

    // 5. 其他异常状态码兜底提示
    const fallbackMsg = res.message || `接口请求异常 [${res.code}]`
    ElMessage.error(fallbackMsg)
    return Promise.reject(new Error(fallbackMsg))
  },
  (error) => {
    // 处理 HTTP 网络层面的错误状态码 (如 HTTP 500, 502, 504, 404, 403 等)
    const status = error.response?.status
    const serverMessage = error.response?.data?.message

    if (status && status >= 500) {
      // 5XX HTTP 错误处理
      const errMsg = serverMessage || `服务器内部错误 [HTTP ${status}]，请稍后重试或联系管理员`
      ElMessage.error(errMsg)
    } else if (status === 404) {
      ElMessage.error('请求的 RESTful 资源路径不存在 [HTTP 404]')
    } else if (status === 403) {
      ElMessage.error('当前登录账号无权限访问该资源 [HTTP 403]')
    } else if (status === 401) {
      ElMessage.error('登录状态已失效，请重新登录 [HTTP 401]')
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
    } else {
      ElMessage.error(serverMessage || error.message || '网络连接超时或网络异常，请检查网络设置')
    }

    return Promise.reject(error)
  }
)

/**
 * 封装 RESTful 常用请求工具函数，支持强类型泛型推导
 */
export const http = {
  get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    return request.get(url, { params, ...config }) as unknown as Promise<T>
  },
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return request.post(url, data, config) as unknown as Promise<T>
  },
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return request.put(url, data, config) as unknown as Promise<T>
  },
  delete<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    return request.delete(url, { params, ...config }) as unknown as Promise<T>
  }
}

export default request
