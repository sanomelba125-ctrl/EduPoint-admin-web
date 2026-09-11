import { ref, reactive, toRef, onMounted, type Ref } from 'vue'

/** 分页基础入参 */
export interface PageParams {
  page: number
  size: number
}

/** 分页返回统一结构 */
export interface PageData<T> {
  records: T[]
  total: number
}

export interface UsePageListOptions<F extends object, T> {
  /** 筛选条件初始值（可包含或不包含 page/size，由内部统一管理） */
  initialFilters: F
  /** 列表数据获取方法，参数包含筛选字段及 page/size */
  fetcher: (params: F & PageParams) => Promise<unknown>
  /** 默认每页条数，默认 10 */
  defaultSize?: number
  /** 是否在组件挂载时立即执行一次 load，默认 true */
  immediate?: boolean
  /** 加载完成后的回调（可选） */
  onSuccess?: (data: PageData<T>, rawRes: unknown) => void
}

export interface UsePageListReturn<F extends object, T> {
  loading: Ref<boolean>
  list: Ref<T[]>
  total: Ref<number>
  queryParams: F & PageParams
  page: Ref<number>
  size: Ref<number>
  load: () => Promise<void>
  search: () => Promise<void>
  reset: () => Promise<void>
  handleSearch: () => Promise<void>
  handleReset: () => Promise<void>
  handlePageChange: (newPage?: number) => Promise<void>
  handleCurrentChange: (newPage?: number) => Promise<void>
  handleSizeChange: (newSize?: number) => Promise<void>
}

/**
 * 列表页通用状态机：整合分页、检索、加载态、重置以及后端响应格式多态解析。
 * 统一防御与收敛 PageResult { records, total }、{ list, total } 及纯数组等后端格式。
 */
export function usePageList<F extends object, T>(
  options: UsePageListOptions<F, T>
): UsePageListReturn<F, T> {
  const { initialFilters, fetcher, defaultSize = 10, immediate = true, onSuccess } = options

  const loading = ref(false)
  const list = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)

  // 提取 initialFilters 中的非分页字段作为纯筛选项
  const initialFilterState: Record<string, any> = { ...initialFilters }
  const initPage = typeof initialFilterState.page === 'number' ? initialFilterState.page : 1
  const initSize = typeof initialFilterState.size === 'number' ? initialFilterState.size : defaultSize

  delete initialFilterState.page
  delete initialFilterState.size

  const queryParams = reactive({
    ...initialFilterState,
    page: initPage,
    size: initSize
  }) as F & PageParams

  const page = toRef(queryParams, 'page') as Ref<number>
  const size = toRef(queryParams, 'size') as Ref<number>

  /**
   * 统一解析不同风格的后端列表响应：
   * 1. 数组类型：[ ... ] -> records: res, total: res.length
   * 2. MyBatis-Plus Page 结构：{ records: [ ... ], total: number }
   * 3. 常见 list 结构：{ list: [ ... ], total: number }
   * 4. 兜底容错：空数组与 0
   */
  function normalize(res: unknown): PageData<T> {
    if (Array.isArray(res)) {
      return { records: res as T[], total: res.length }
    }
    const pageData = res as any
    if (pageData && Array.isArray(pageData.records)) {
      return {
        records: pageData.records as T[],
        total: typeof pageData.total === 'number' ? pageData.total : pageData.records.length
      }
    }
    if (pageData && Array.isArray(pageData.list)) {
      return {
        records: pageData.list as T[],
        total: typeof pageData.total === 'number' ? pageData.total : pageData.list.length
      }
    }
    return { records: [], total: 0 }
  }

  async function load() {
    loading.value = true
    try {
      const res = await fetcher({ ...queryParams })
      const data = normalize(res)
      list.value = data.records
      total.value = data.total
      if (onSuccess) {
        onSuccess(data, res)
      }
    } catch (error) {
      console.error('[usePageList] 获取列表数据失败:', error)
      list.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  function handleSearch() {
    queryParams.page = 1
    return load()
  }

  function handleReset() {
    Object.keys(queryParams).forEach((key) => {
      if (key !== 'page' && key !== 'size') {
        (queryParams as any)[key] = initialFilterState[key]
      }
    })
    queryParams.page = 1
    return load()
  }

  function handleCurrentChange(newPage?: number) {
    if (typeof newPage === 'number') {
      queryParams.page = newPage
    }
    return load()
  }

  function handleSizeChange(newSize?: number) {
    if (typeof newSize === 'number') {
      queryParams.size = newSize
    }
    queryParams.page = 1
    return load()
  }

  if (immediate) {
    onMounted(load)
  }

  return {
    loading,
    list,
    total,
    queryParams,
    page,
    size,
    load,
    search: handleSearch,
    reset: handleReset,
    handleSearch,
    handleReset,
    handlePageChange: handleCurrentChange,
    handleCurrentChange,
    handleSizeChange
  }
}
