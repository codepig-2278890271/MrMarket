/**
 * 自选股相关类型定义
 */

/** 自选股列表项（含 JOIN 的股票信息） */
export interface WatchlistItem {
  id: number
  stock_code: string
  stock_name: string
  market: string
  industry: string | null
  listed_date: string | null
  is_st: boolean
  added_at: string
  note: string | null
}
