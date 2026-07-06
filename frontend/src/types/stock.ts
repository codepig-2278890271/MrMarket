/**
 * 行情相关类型定义
 */

/** 股票列表项 */
export interface StockItem {
  code: string
  name: string
  market: string
  industry: string | null
  listed_date: string | null
  is_st: boolean
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
