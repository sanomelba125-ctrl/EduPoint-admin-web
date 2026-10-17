/**
 * ECharts 图表配色与文字样式（集中管理）
 *
 * ⚠️ 为什么不直接用 CSS 变量：
 * ECharts 基于 Canvas 渲染，**无法解析 `var(--xxx)`** ——
 * 传入 "var(--app-color-primary)" 会被视为非法色值并回退成默认色。
 * 因此图表色必须以真实色值集中定义在这里，并与 styles/index.css 的设计 token 一一对应。
 * 将来整体换肤时，同步修改本文件与 styles/index.css 两处即可。
 *
 * 改造前这些色值散落在 dashboard / 各页面的 echarts option 里，
 * 且混用了 Element 色板与 flat-ui 色板（#9b59b6 / #34495e），现统一收敛。
 */

export const CHART_COLORS = {
  /** 对应 --el-color-primary */
  primary: '#409eff',
  /** 对应 --el-color-success */
  success: '#67c23a',
  /** 对应 --el-color-warning */
  warning: '#e6a23c',
  /** 对应 --el-color-danger */
  danger: '#f56c6c',
  /** 对应 --el-color-info */
  info: '#909399',
  /** 对应 --app-accent-purple */
  purple: '#7c3aed',
  /** 补充色（第 7 位，替代原先突兀的 #34495e 深蓝灰） */
  teal: '#14b8a6',
} as const

/**
 * 分类调色板（饼图、多系列柱状图等）
 * 顺序即 ECharts 的默认取色顺序
 */
export const CHART_PALETTE: string[] = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.info,
  CHART_COLORS.purple,
  CHART_COLORS.teal,
]

/** 图表文字与坐标轴样式（统一各图表观感，避免每个图表各写一套灰阶） */
export const CHART_TEXT = {
  /** 主文字（对应 --app-text-1） */
  title: '#303133',
  /** 常规文字（对应 --app-text-2） */
  regular: '#606266',
  /** 次要文字（对应 --app-text-3） */
  secondary: '#909399',
  /** 坐标轴线（对应 --app-border） */
  axisLine: '#dcdfe6',
  /** 分隔线（对应 --app-fill） */
  splitLine: '#f2f6fc',
  /** 提示框描边（对应 --app-border-lighter） */
  border: '#ebeef5',
  /** 白色（提示框底、饼图描边） */
  white: '#ffffff',
} as const
