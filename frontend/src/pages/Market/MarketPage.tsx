/**
 * 市场行情页面 — 大盘云图
 *
 * 参考 52etf.site: 左侧面板 + 深色 treemap + 底部图例
 * 全视口布局，覆盖 AppLayout 默认约束。
 */

import { useState, useCallback, useEffect } from 'react'
import { Spin, Empty, Tag } from 'antd'
import ReactECharts from 'echarts-for-react'
import apiClient from '../../services/api'
import type { StockItem, KLineItem } from '../../types/stock'
import MarketTreemap from './MarketTreemap'

// ================================================================
// 常量
// ================================================================

const UP_COLOR = '#dc2626'
const DOWN_COLOR = '#16a34a'

function calcMA(data: KLineItem[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null) }
    else { let sum = 0; for (let j = 0; j < period; j++) sum += data[i - j].close; result.push(+(sum / period).toFixed(3)) }
  }
  return result
}

function getDefaultDateRange() {
  const end = new Date(); const start = new Date()
  start.setMonth(start.getMonth() - 12)
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }
}

// ================================================================
// 主页面
// ================================================================

export default function MarketPage() {
  useEffect(() => {
    document.title = '大盘云图 - A股热力图'
    return () => { document.title = 'MrMarket - 市场先生' }
  }, [])

  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null)
  const [klines, setKlines] = useState<KLineItem[]>([])
  const [klineLoading, setKlineLoading] = useState(false)

  const handleStockSelect = useCallback(async (stock: StockItem) => {
    if (selectedStock?.code === stock.code) { setSelectedStock(null); setKlines([]); return }
    setSelectedStock(stock)
    setKlineLoading(true)
    try {
      const { start, end } = getDefaultDateRange()
      const res = await apiClient.get(`/stocks/${stock.code}/klines`, { params: { start_date: start, end_date: end } })
      setKlines((res.data.items || []).reverse())
    } finally { setKlineLoading(false) }
  }, [selectedStock])

  const getChartOption = () => {
    if (klines.length === 0) return {}
    const dates = klines.map((k) => k.trade_date)
    const ohlc = klines.map((k) => [k.open, k.close, k.low, k.high])
    const volumes = klines.map((k) => k.volume)
    return {
      backgroundColor: '#1e1e2e',
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, backgroundColor: 'rgba(30,30,40,0.95)', borderColor: '#4a4f5d', textStyle: { color: '#fefefe', fontSize: 12 } },
      grid: [{ left: '8%', right: '2%', top: 20, height: '55%' }, { left: '8%', right: '2%', top: '80%', height: '14%' }],
      xAxis: [
        { type: 'category', data: dates, gridIndex: 0, axisLabel: { show: false, color: '#9ca3af' }, axisLine: { lineStyle: { color: '#4a4f5d' } } },
        { type: 'category', data: dates, gridIndex: 1, axisLabel: { show: false, color: '#9ca3af' }, axisLine: { lineStyle: { color: '#4a4f5d' } } },
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, scale: true, splitLine: { lineStyle: { color: '#374151' } }, axisLabel: { fontSize: 10, color: '#9ca3af' } },
        { type: 'value', gridIndex: 1, axisLabel: { fontSize: 10, color: '#9ca3af' }, splitLine: { show: false } },
      ],
      series: [
        { name: 'MA5', type: 'line', data: calcMA(klines, 5), symbol: 'none', smooth: true, lineStyle: { width: 1.5, color: '#f8fafc' } },
        { name: 'MA10', type: 'line', data: calcMA(klines, 10), symbol: 'none', smooth: true, lineStyle: { width: 1, color: '#3b82f6' } },
        { name: 'MA20', type: 'line', data: calcMA(klines, 20), symbol: 'none', smooth: true, lineStyle: { width: 1, color: '#f59e0b' } },
        { name: 'MA60', type: 'line', data: calcMA(klines, 60), symbol: 'none', smooth: true, lineStyle: { width: 1, color: '#a855f7', type: 'dashed' } },
        { name: 'K线', type: 'candlestick', data: ohlc, itemStyle: { color: UP_COLOR, color0: DOWN_COLOR, borderColor: UP_COLOR, borderColor0: DOWN_COLOR } },
        { name: '成交量', type: 'bar', data: volumes, yAxisIndex: 1, itemStyle: { color: (params: any) => { const idx = params.dataIndex; return idx < klines.length && klines[idx].close >= klines[idx].open ? UP_COLOR : DOWN_COLOR } } },
      ],
    }
  }

  // Full-page layout — override AppLayout constraints
  return (
    <>
      {/* Inline style to override AppLayout padding/width for this page */}
      <style>{`
        /* Remove AppLayout content constraints for market page */
        #market-page-root {
          margin: -32px calc(-1 * var(--content-padding, 6px)) -64px !important;
          max-width: none !important;
          width: 100vw !important;
          height: calc(100vh - 56px) !important;
          overflow: hidden;
        }
      `}</style>

      <div id="market-page-root" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <MarketTreemap onStockSelect={handleStockSelect} />

        {/* K-line overlay when a stock is double-clicked */}
        {selectedStock && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={() => { setSelectedStock(null); setKlines([]) }}>
            <div style={{ width: '90vw', maxWidth: 1200, maxHeight: '85vh', background: '#1e1e2e', borderRadius: 12, border: '1px solid #4a4f5d', padding: 20, overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h2 style={{ margin: 0, color: '#fefefe', fontSize: 18 }}>{selectedStock.name}</h2>
                  <span style={{ fontFamily: 'monospace', color: '#9ca3af' }}>{selectedStock.code}</span>
                  {selectedStock.industry && <Tag>{selectedStock.industry}</Tag>}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                  <span style={{ color: '#f8fafc' }}>━ MA5</span>
                  <span style={{ color: '#3b82f6' }}>━ MA10</span>
                  <span style={{ color: '#f59e0b' }}>━ MA20</span>
                  <span style={{ color: '#a855f7' }}>┅ MA60</span>
                </div>
              </div>
              {klineLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>
              ) : klines.length === 0 ? (
                <Empty description={<span style={{ color: '#9ca3af' }}>暂无K线数据</span>} />
              ) : (
                <ReactECharts option={getChartOption()} style={{ height: 500 }} />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
