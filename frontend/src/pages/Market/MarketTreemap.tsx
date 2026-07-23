/**
 * 大盘云图 — ECharts Treemap 热力图
 * 全屏 treemap + 顶部工具栏 + 底部图例
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Spin, Empty } from 'antd'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import apiClient from '../../services/api'
import type { StockItem, TreemapGroup } from '../../types/stock'

// ================================================================
// 参考站精确颜色
// ================================================================

const CANVAS_BG = '#ffffff'

const UP_COLOR = '#f63538'
const DOWN_COLOR = '#30cc5a'

const LEGEND_COLORS: Record<string, string> = {
  '-4': '#30cc5a', '-3': '#2faa51', '-2': '#31894e', '-1': '#38694f',
  '0': '#414554',
  '+1': '#784551', '+2': '#a5424a', '+3': '#ce3d41', '+4': '#f63538',
}

const TIME_SLOTS = ['09:30', '10:00', '10:30', '11:00', '11:30', '13:30', '14:00', '14:30', '15:00']

// ================================================================
// 工具函数
// ================================================================

function treemapColor(changePct: number | null): string {
  if (changePct == null || changePct === 0) return LEGEND_COLORS['0']
  const abs = Math.abs(changePct)
  if (changePct > 0) {
    if (abs >= 4) return LEGEND_COLORS['+4']
    if (abs >= 3) return LEGEND_COLORS['+3']
    if (abs >= 2) return LEGEND_COLORS['+2']
    if (abs >= 1) return LEGEND_COLORS['+1']
    return interpolate(LEGEND_COLORS['0'], LEGEND_COLORS['+4'], abs / 4)
  }
  if (abs >= 4) return LEGEND_COLORS['-4']
  if (abs >= 3) return LEGEND_COLORS['-3']
  if (abs >= 2) return LEGEND_COLORS['-2']
  if (abs >= 1) return LEGEND_COLORS['-1']
  return interpolate(LEGEND_COLORS['0'], LEGEND_COLORS['-4'], abs / 4)
}

function interpolate(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16)
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16)
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—'
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + '万亿'
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + '亿'
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(2) + '万'
  return n.toLocaleString()
}

function getBlockValue(stock: StockItem): number {
  return stock.circulating_market_cap || stock.amount || 0
}

// ================================================================
// Props
// ================================================================

interface MarketTreemapProps {
  onStockSelect: (stock: StockItem) => void
}

// ================================================================
// 组件
// ================================================================

export default function MarketTreemap({ onStockSelect }: MarketTreemapProps) {
  const [groups, setGroups] = useState<TreemapGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState('')
  const [tradeDate, setTradeDate] = useState<string | null>(null)
  const chartRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ---- 数据 ----
  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get('/stocks/treemap')
      setGroups(res.data.groups || [])
      setTradeDate(res.data.trade_date || null)
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('zh-CN', { hour12: false }))
      setError(null)
    } catch { setError('数据加载失败') } finally { setLoading(false) }
  }, [])

  useEffect(() => { setLoading(true); fetchData() }, [fetchData])

  useEffect(() => {
    timerRef.current = setInterval(fetchData, 8000)
    const h = () => {
      if (document.hidden) { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
      else { fetchData(); timerRef.current = setInterval(fetchData, 8000) }
    }
    document.addEventListener('visibilitychange', h)
    return () => { if (timerRef.current) clearInterval(timerRef.current); document.removeEventListener('visibilitychange', h) }
  }, [fetchData])

  useEffect(() => {
    const ti = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('zh-CN', { hour12: false })), 1000)
    return () => clearInterval(ti)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen()
    else document.exitFullscreen()
  }

  const screenshot = () => {
    const i = chartRef.current?.getEchartsInstance()
    if (i) { const u = i.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: CANVAS_BG }); const a = document.createElement('a'); a.download = `大盘云图_${tradeDate || 'snap'}.png`; a.href = u; a.click() }
  }

  // ---- ECharts 数据 ----
  const chartData = useMemo(() => groups
    .filter((g) => g.stocks.length > 0)
    .map((group) => ({
      name: group.industry,
      children: group.stocks.filter((s) => getBlockValue(s) > 0).map((stock) => ({
        name: stock.name,
        value: getBlockValue(stock),
        stockCode: stock.code,
        changePct: stock.change_pct,
        latestPrice: stock.latest_price,
        volume: stock.volume,
        amount: stock.amount,
        turnoverRate: stock.turnover_rate,
        circulatingMcap: stock.circulating_market_cap,
        isST: stock.is_st,
        itemStyle: { color: treemapColor(stock.change_pct), borderColor: CANVAS_BG, borderWidth: 0 },
        label: { show: true, fontSize: 10, color: '#1f2937', overflow: 'truncate' as const, ellipsis: '…' as const },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)', borderWidth: 1.5, borderColor: '#fbbf24' },
          label: { fontSize: 12, fontWeight: 'bold' as const },
        },
      })),
    })), [groups])

  // ---- ECharts option ----
  const option = useMemo((): EChartsOption => ({
    backgroundColor: CANVAS_BG,
    tooltip: {
      backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#d1d5db', borderWidth: 1, padding: [10, 14],
      textStyle: { color: '#1f2937', fontSize: 13 },
      formatter: (params: any) => {
        if (!params.data?.stockCode) return params.name
        const d = params.data; const p = d.changePct ?? 0
        const c = p > 0 ? UP_COLOR : p < 0 ? DOWN_COLOR : '#6b7280'
        return `<div style="font-size:14px;font-weight:600;margin-bottom:6px">${d.name}${d.isST ? ' <span style="color:#f63538;font-size:10px">ST</span>' : ''}<span style="font-family:monospace;color:#9ca3af;font-weight:400;margin-left:6px">${d.stockCode}</span></div><div style="line-height:1.8">最新价 <b style="float:right;margin-left:20px">${d.latestPrice?.toFixed(2) ?? '—'}</b><br/>涨跌幅 <b style="float:right;margin-left:20px;color:${c}">${p > 0 ? '+' : ''}${p.toFixed(2)}%</b><br/>流通市值 <b style="float:right;margin-left:20px">${fmtNum(d.circulatingMcap)}</b><br/>成交额 <b style="float:right;margin-left:20px">${fmtNum(d.amount)}</b></div>`
      },
    },
    series: [{
      type: 'treemap', width: '100%', height: '100%', top: 0, bottom: 30,
      roam: 'scale', nodeClick: 'link' as const,
      breadcrumb: { show: true, height: 28, bottom: 0, itemStyle: { color: '#f0f0f0', borderColor: '#d1d5db', textStyle: { color: '#374151' } }, emphasis: { itemStyle: { color: '#e5e7eb', textStyle: { color: '#1f2937' } } } },
      upperLabel: { show: true, height: 20, fontSize: 11, color: '#374151', fontWeight: 'bold' as const, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 2, padding: [2, 6] as [number, number] },
      levels: [
        {},
        { itemStyle: { borderColor: CANVAS_BG, borderWidth: 1, gapWidth: 1 }, upperLabel: { show: true } },
        { itemStyle: { borderWidth: 0, gapWidth: 0 } },
      ],
      data: chartData as any,
    }] as any,
  }), [chartData])

  // ---- 事件 ----
  const handleDblClick = useCallback((params: any) => {
    if (params.data?.stockCode) {
      onStockSelect({
        code: params.data.stockCode, name: params.name, market: '', industry: null,
        is_st: params.data.isST || false, latest_price: params.data.latestPrice,
        change_pct: params.data.changePct, change_amt: null, volume: params.data.volume,
        amount: params.data.amount, turnover_rate: params.data.turnoverRate,
        circulating_market_cap: params.data.circulatingMcap, trade_date: tradeDate,
      })
    }
  }, [onStockSelect, tradeDate])

  // ---- 渲染 ----
  if (loading && groups.length === 0) {
    return <div className="flex items-center justify-center" style={{ height: '100%', background: CANVAS_BG }}><Spin size="large" /></div>
  }
  if (error && groups.length === 0) {
    return <div className="flex items-center justify-center" style={{ height: '100%', background: CANVAS_BG }}><Empty description={<span style={{ color: '#6b7280' }}>{error}</span>} /></div>
  }

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', background: CANVAS_BG }}>
      {/* Main Treemap Area — full width */}
      <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: CANVAS_BG }}>
        {/* Top bar: time + screenshot + fullscreen */}
        <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 12, gap: 12, background: CANVAS_BG, flexShrink: 0 }}>
          <span style={{ fontSize: 14, color: '#374151' }}>{currentTime}</span>
          <button onClick={screenshot} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
            <span>✂</span> 截图分享
          </button>
          <button onClick={toggleFullscreen} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 18 }} title="全屏">⛶</button>
        </div>

        {/* Treemap canvas */}
        <div style={{ flex: 1, minHeight: 0 }}>
          {chartData.length === 0 ? (
            <Empty description={<span style={{ color: '#6b7280' }}>暂无数据</span>} style={{ padding: 80 }} />
          ) : (
            <ReactECharts ref={chartRef} option={option} style={{ width: '100%', height: '100%' }} onEvents={{ dblclick: handleDblClick }} opts={{ renderer: 'canvas' }} />
          )}
        </div>

        {/* Footer: replay timeline + color legend */}
        <footer style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12, background: CANVAS_BG, borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
          {/* Replay time buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ color: '#1f2937', fontSize: 12, marginLeft: 8 }}>当日复盘：</span>
            {TIME_SLOTS.map((t) => (
              <button key={t} style={{ padding: '0 9px', height: 22, background: '#e6a23c', color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer', fontSize: 11 }}>{t}</button>
            ))}
          </div>

          {/* Color Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
            {Object.entries(LEGEND_COLORS).map(([k, c]) => (
              <div key={k} style={{ width: 38, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c, color: '#fff', fontSize: 11, userSelect: 'none', borderRadius: 2 }}>
                {k.startsWith('+') ? k : k}{k === '0' ? '' : '%'}
              </div>
            ))}
          </div>
        </footer>
      </section>
    </div>
  )
}
