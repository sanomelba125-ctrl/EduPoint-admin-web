/**
 * 通用分页查询参数模型。
 * 注意：后端 MyBatis-Plus 使用 size 而非 pageSize，字段名与后端保持一致。
 */
export interface PageQuery {
  /** 页码，从 1 开始 */
  page?: number
  /** 每页条数 */
  size?: number
  /** 通用检索关键词（可选） */
  keyword?: string
}

/**
 * 后端统一分页响应数据结构（对应 MyBatis-Plus 的 Page 结构）。
 * 只声明前端实际使用的有效字段（records, total），消除口径不符且未使用的死字段（page, pageSize）。
 */
export interface PageResult<T> {
  records: T[]
  total: number
}

