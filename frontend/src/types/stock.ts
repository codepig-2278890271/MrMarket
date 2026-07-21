/**
 * 行情相关类型定义
 */

/** 股票列表项（含最新行情） */
export interface StockItem {
  code: string
  name: string
  market: string
  industry: string | null
  is_st: boolean
  // 最新行情
  latest_price: number | null
  change_pct: number | null       // 涨跌幅 %
  change_amt: number | null        // 涨跌额
  volume: number | null            // 成交量
  amount: number | null            // 成交额
  turnover_rate: number | null     // 换手率 %
  circulating_market_cap: number | null  // 流通市值
  trade_date: string | null        // 最新交易日
}

/** 大盘概览 */
export interface MarketOverview {
  trade_date: string | null
  total_stocks: number
  up_count: number
  down_count: number
  flat_count: number
  avg_change_pct: number
  total_volume: number
  total_amount: number
}

/** 单条K线数据 */
export interface KLineItem {
  trade_date: string
  open: number
  high: number
  low: number
  close: number
  pre_close: number
  volume: number
  amount: number
  turnover_rate: number | null
  adj_factor?: number | null
}

/** 大盘云图：单行业分组 */
export interface TreemapGroup {
  industry: string
  stocks: StockItem[]
}

/** 大盘云图：API 响应 */
export interface TreemapResponse {
  groups: TreemapGroup[]
  trade_date: string | null
}

/** 云图维度类型 */
export type TreemapDimension = 'circulating_market_cap' | 'amount' | 'volume' | 'turnover_rate' | 'change_pct'
