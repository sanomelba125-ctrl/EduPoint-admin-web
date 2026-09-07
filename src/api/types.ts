/**
 * 通用分页查询参数模型
 */
export interface PageQuery {
  page?: number
  pageSize?: number
  keyword?: string
  [key: string]: any
}

/**
 * 通用分页响应数据结构
 */
export interface PageResult<T> {
  records: T[]
  total: number
  page: number
  pageSize: number
}
