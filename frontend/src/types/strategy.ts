/**
 * 策略相关类型定义
 */

/** 技术指标配置 */
export interface IndicatorConfig {
  indicator: string
  params: Record<string, number>
}

/** 策略列表项 */
export interface StrategyItem {
  id: number
  name: string
  description: string | null
  indicators: IndicatorConfig[]
  enabled: boolean
  created_at: string
  updated_at: string
}

/** 技术指标预设 */
export const INDICATOR_PRESETS: Record<string, Record<string, number>> = {
  MACD: { fast: 12, slow: 26, signal: 9 },
  KDJ: { k: 9, d: 3, j: 3 },
  MA: { period1: 5, period2: 20, period3: 60 },
  RSI: { period: 14 },
  BOLL: { period: 20, std: 2 },
}

export const INDICATOR_OPTIONS = Object.keys(INDICATOR_PRESETS).map((k) => ({
  label: k,
  value: k,
}))
