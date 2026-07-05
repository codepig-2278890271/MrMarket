/**
 * MrMarket 通用类型定义
 * 所有模块共享的基础类型
 */

/** API 统一响应格式 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  timestamp: string
}

/** 分页请求参数 */
export interface PaginationParams {
  page: number
  page_size: number
}

/** 分页响应 */
export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

/** 股票基本信息 */
export interface StockInfo {
  code: string // 股票代码，如 '600519'
  name: string // 股票名称，如 '贵州茅台'
  market: 'SH' | 'SZ' | 'BJ' // 交易所
  industry: string // 申万一级行业
  listed_date: string // 上市日期
  is_st: boolean // 是否ST
}

/** 实时行情快照 */
export interface StockRealtime {
  code: string
  name: string
  price: number // 当前价
  change: number // 涨跌额
  change_pct: number // 涨跌幅 %
  open: number
  high: number
  low: number
  pre_close: number // 前收盘
  volume: number // 成交量（股）
  amount: number // 成交额（元）
  turnover_rate: number // 换手率 %
}

/** 日K线数据点 */
export interface KLinePoint {
  date: string // 交易日 YYYY-MM-DD
  open: number
  high: number
  low: number
  close: number
  volume: number // 成交量（股）
  amount: number // 成交额（元）
  turnover_rate: number // 换手率 %
  pre_close: number // 前收盘价
}
