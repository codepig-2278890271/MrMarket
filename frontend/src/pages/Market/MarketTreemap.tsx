/**
 * 大盘云图组件 — ECharts Treemap 热力图
 *
 * 参考 52etf.site 设计，深色主题。
 * 颜色从参考站 HTML 中提取：
 *   涨: #f63538 → #784551   跌: #30cc5a → #38694f   平: #414554
 * 背景: #262931
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Spin, Empty } from 'antd'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import apiClient from '../../services/api'
import type { StockItem, TreemapGroup } from '../../types/stock'

// ================================================================
// 常量 — 来自参考站 52etf.site 的精确颜色
// ================================================================

const REFRESH_INTERVAL = 8_000

// 参考站 treemap 背景色
const BG_COLOR = '#262931'

// 文字颜色
const TEXT_PRIMARY = '#fefefe'
const TEXT_SECONDARY = '#9ca3af'

// 参考站颜色图例
const LEGEND_COLORS = {
  '-4': '#30cc5a',
  '-3': '#2faa51',
  '-2': '#31894e',
  '-1': '#38694f',
  '0':  '#414554',
  '+1': '#784551',
  '+2': '#a5424a',
  '+3': '#ce3d41',
  '+4': '#f63538',
}

// 参考站统计颜色
const UP_COLOR = '#f63538'   // 涨 — 红色
const DOWN_COLOR = '#30cc5a' // 跌 — 绿色
const FLAT_COLOR = '#6b7280' // 平 — 灰色

// 市场板块
const MARKET_TABS = [
  { key: '', label: 'A股全图' },
  { key: 'SH', label: '上证A股' },
  { key: 'SZ', label: '深证A股' },
  { key: 'CY', label: '创业板' },
  { key: 'KC', label: '科创板' },
]

// 维度选项 — 参考站
const DIMENSION_OPTIONS = [
  { label: '当日涨跌幅', value: 'change_pct' as const },
  { label: '成交额', value: 'amount' as const },
  { label: '成交量', value: 'volume' as const },
  { label: '换手率', value: 'turnover_rate' as const },
]

// ================================================================
// 工具函数
// ================================================================

/** 根据涨跌幅返回 treemap 色块颜色 — 匹配参考站渐变 */
function treemapColor(changePct: number | null): string {
  if (changePct == null || changePct === 0) return LEGEND_COLORS['0']

  const absPct = Math.abs(changePct)
  if (changePct > 0) {
    // 涨：深红系
    if (absPct >= 4) return LEGEND_COLORS['+4']
    if (absPct >= 3) return LEGEND_COLORS['+3']
    if (absPct >= 2) return LEGEND_COLORS['+2']
    if (absPct >= 1) return LEGEND_COLORS['+1']
    // 0~1% 之间插值
    const t = absPct / 4
    return interpolateColor(LEGEND_COLORS['0'], LEGEND_COLORS['+4'], t)
  }
  // 跌：深绿系
  if (absPct >= 4) return LEGEND_COLORS['-4']
  if (absPct >= 3) return LEGEND_COLORS['-3']
  if (absPct >= 2) return LEGEND_COLORS['-2']
  if (absPct >= 1) return LEGEND_COLORS['-1']
  const t = absPct / 4
  return interpolateColor(LEGEND_COLORS['0'], LEGEND_COLORS['-4'], t)
}

/** 颜色插值 */
function interpolateColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16)
  const g1 = parseInt(c1.slice(3, 5), 16)
  const b1 = parseInt(c1.slice(5, 7), 16)
  const r2 = parseInt(c2.slice(1, 3), 16)
  const g2 = parseInt(c2.slice(3, 5), 16)
  const b2 = parseInt(c2.slice(5, 7), 16)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r},${g},${b})`
}

/** 格式化数字 */
function fmtNum(n: number | null | undefined): string {
  if (n == null || n === undefined) return '—'
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + '万亿'
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + '亿'
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(2) + '万'
  return n.toLocaleString()
}

/** 获取块大小 */
function getBlockValue(stock: StockItem, dim: string): number {
  switch (dim) {
    case 'amount':
      return stock.amount ?? 0
    case 'volume':
      return stock.volume ?? 0
    case 'turnover_rate':
      return stock.turnover_rate ?? 0
    case 'change_pct':
      return Math.max(Math.abs(stock.change_pct ?? 0), 0.01)
    default:
      return stock.circulating_market_cap || stock.amount || 0
  }
}

// ================================================================
// 颜色图例 — 参考站底部渐变条
// ================================================================

function ColorLegend() {
  const stops = [
    { pct: -4, color: LEGEND_COLORS['-4'] },
    { pct: -3, color: LEGEND_COLORS['-3'] },
    { pct: -2, color: LEGEND_COLORS['-2'] },
    { pct: -1, color: LEGEND_COLORS['-1'] },
    { pct: 0, color: LEGEND_COLORS['0'] },
    { pct: 1, color: LEGEND_COLORS['+1'] },
    { pct: 2, color: LEGEND_COLORS['+2'] },
    { pct: 3, color: LEGEND_COLORS['+3'] },
    { pct: 4, color: LEGEND_COLORS['+4'] },
  ]

  return (
    <div className="flex items-center justify-center gap-0 select-none" style={{ height: 24 }}>
      {stops.map((s, i) => (
        <div
          key={i}
          className="flex items-center justify-center text-xs font-normal"
          style={{
            width: 48,
            height: 24,
            background: s.color,
            color: '#fff',
          }}
        >
          {s.pct > 0 ? '+' : ''}{s.pct}%
        </div>
      ))}
    </div>
  )
}

// ================================================================
// 组件 Props
// ================================================================

interface MarketTreemapProps {
  onStockSelect: (stock: StockItem) => void
  selectedStockCode: string | null
}

// ================================================================
// 主组件
// ================================================================

export default function MarketTreemap({
  onStockSelect,
  selectedStockCode: _selectedStockCode,
}: MarketTreemapProps) {
  const [activeTab, setActiveTab] = useState('')
  const [dimension, setDimension] = useState('circulating_market_cap')
  const [groups, setGroups] = useState<TreemapGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState('')
  const [tradeDate, setTradeDate] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const chartRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ---- 数据获取 ----
  const fetchData = useCallback(async () => {
    try {
      const params: Record<string, string> = {}
      if (activeTab === 'SH') params.market = 'SH'
      else if (activeTab === 'SZ') params.market = 'SZ'

      const res = await apiClient.get('/stocks/treemap', { params })
      let allGroups: TreemapGroup[] = res.data.groups || []

      // 前端过滤板块
      if (activeTab === 'CY') {
        allGroups = allGroups.map((g: TreemapGroup) => ({
          ...g,
          stocks: g.stocks.filter((s) => s.code.startsWith('300') || s.code.startsWith('301')),
        })).filter((g: TreemapGroup) => g.stocks.length > 0)
      } else if (activeTab === 'KC') {
        allGroups = allGroups.map((g: TreemapGroup) => ({
          ...g,
          stocks: g.stocks.filter((s) => s.code.startsWith('688')),
        })).filter((g: TreemapGroup) => g.stocks.length > 0)
      }

      setGroups(allGroups)
      setTradeDate(res.data.trade_date || null)
      setLastRefresh(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
      setError(null)
    } catch {
      setError('数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => { setLoading(true); fetchData() }, [fetchData])

  // 自动刷新 8 秒
  useEffect(() => {
    timerRef.current = setInterval(() => fetchData(), REFRESH_INTERVAL)
    const h = () => {
      if (document.hidden) {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      } else {
        fetchData()
        timerRef.current = setInterval(() => fetchData(), REFRESH_INTERVAL)
      }
    }
    document.addEventListener('visibilitychange', h)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', h)
    }
  }, [fetchData])

  // 全屏
  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen()
    else document.exitFullscreen()
  }

  const handleScreenshot = () => {
    const inst = chartRef.current?.getEchartsInstance()
    if (inst) {
      const url = inst.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: BG_COLOR })
      const a = document.createElement('a')
      a.download = `大盘云图_${tradeDate || 'snapshot'}.png`
      a.href = url; a.click()
    }
  }

  // ---- 统计 ----
  const stats = useMemo(() => {
    const all = groups.flatMap((g) => g.stocks)
    const up = all.filter((s) => (s.change_pct ?? 0) > 0).length
    const down = all.filter((s) => (s.change_pct ?? 0) < 0).length
    const flat = all.length - up - down
    const totalAmt = all.reduce((s, x) => s + (x.amount ?? 0), 0)
    return { total: all.length, up, down, flat, totalAmt }
  }, [groups])

  // ---- ECharts Treemap 数据 ----
  const chartData = useMemo(() => {
    return groups
      .filter((g) => g.stocks.length > 0)
      .map((group) => ({
        name: group.industry,
        children: group.stocks
          .filter((s) => getBlockValue(s, dimension) > 0)
          .map((stock) => ({
            name: stock.name,
            value: getBlockValue(stock, dimension),
            stockCode: stock.code,
            changePct: stock.change_pct,
            latestPrice: stock.latest_price,
            volume: stock.volume,
            amount: stock.amount,
            turnoverRate: stock.turnover_rate,
            circulatingMcap: stock.circulating_market_cap,
            isST: stock.is_st,
            itemStyle: {
              color: treemapColor(stock.change_pct),
              borderColor: BG_COLOR,
              borderWidth: 0,
            },
            label: {
              show: true,
              fontSize: 10,
              color: '#fefefe',
              overflow: 'truncate' as const,
              ellipsis: '…' as const,
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0,0,0,0.4)',
                borderWidth: 1.5,
                borderColor: '#fbbf24',
              },
              label: { fontSize: 12, fontWeight: 'bold' as const },
            },
          })),
      }))
  }, [groups, dimension])

  // ---- ECharts 配置 ----
  const option = useMemo((): EChartsOption => ({
    backgroundColor: BG_COLOR,
    tooltip: {
      backgroundColor: 'rgba(30,30,40,0.96)',
      borderColor: '#4a4f5d',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: '#fefefe', fontSize: 13 },
      formatter: (params: any) => {
        if (!params.data?.stockCode) return params.name
        const d = params.data
        const pct = d.changePct ?? 0
        const c = pct > 0 ? UP_COLOR : pct < 0 ? DOWN_COLOR : FLAT_COLOR
        const sign = pct > 0 ? '+' : ''
        const st = d.isST ? ' <span style="color:#f63538;font-size:10px">ST</span>' : ''
        return `
          <div style="font-size:14px;font-weight:600;margin-bottom:6px">
            ${d.name}${st}
            <span style="font-family:monospace;color:#9ca3af;font-weight:400;margin-left:6px">${d.stockCode}</span>
          </div>
          <div style="line-height:1.8">
            最新价 <b style="float:right;margin-left:20px">${d.latestPrice?.toFixed(2) ?? '—'}</b><br/>
            涨跌幅 <b style="float:right;margin-left:20px;color:${c}">${sign}${pct.toFixed(2)}%</b><br/>
            流通市值 <b style="float:right;margin-left:20px">${fmtNum(d.circulatingMcap)}</b><br/>
            成交额 <b style="float:right;margin-left:20px">${fmtNum(d.amount)}</b>
          </div>
        `
      },
    },
    series: [{
      type: 'treemap' as const,
      width: '100%',
      height: '100%',
      roam: false,
      nodeClick: 'link' as const,
      breadcrumb: {
        show: true,
        height: 28,
        bottom: 0,
        itemStyle: {
          color: '#3f414b',
          borderColor: '#4a4f5d',
          textStyle: { color: '#d1d5db' },
        },
        emphasis: {
          itemStyle: {
            color: '#4a4f5d',
            textStyle: { color: '#fefefe' },
          },
        },
      },
      upperLabel: {
        show: true,
        height: 24,
        fontSize: 12,
        color: '#d1d5db',
        fontWeight: 'bold' as const,
        backgroundColor: 'rgba(38,41,49,0.85)',
        borderRadius: 3,
        padding: [3, 8] as [number, number],
      },
      levels: [
        {},
        {
          itemStyle: { borderColor: BG_COLOR, borderWidth: 3, gapWidth: 3 },
          upperLabel: { show: true },
        },
        { itemStyle: { borderWidth: 0, gapWidth: 0 } },
      ],
      data: chartData as any,
    }] as any,
  } as EChartsOption), [chartData])

  // ---- 事件 ----
  const handleDblClick = useCallback((params: any) => {
    if (params.data?.stockCode) {
      onStockSelect({
        code: params.data.stockCode,
        name: params.name,
        market: '',
        industry: null,
        is_st: params.data.isST || false,
        latest_price: params.data.latestPrice,
        change_pct: params.data.changePct,
        change_amt: null,
        volume: params.data.volume,
        amount: params.data.amount,
        turnover_rate: params.data.turnoverRate,
        circulating_market_cap: params.data.circulatingMcap,
        trade_date: tradeDate,
      })
    }
  }, [onStockSelect, tradeDate])

  // ---- 渲染 ----
  if (loading && groups.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: '60vh', background: BG_COLOR }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error && groups.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: '60vh', background: BG_COLOR }}>
        <Empty description={<span style={{ color: TEXT_SECONDARY }}>{error}</span>} />
      </div>
    )
  }

  const treemapHeight = fullscreen
    ? 'calc(100vh - 60px)'
    : 'calc(100vh - 280px)'

  return (
    <div ref={containerRef} style={{ background: BG_COLOR }}>
      {/* 顶部：市场板块 + 维度 + 操作 */}
      <div
        className="flex items-center gap-1 px-2 flex-wrap"
        style={{ background: '#363a46', minHeight: 44, borderBottom: '1px solid #4a4f5d' }}
      >
        {/* 板块选择 — 类似参考站左侧面板 */}
        <div className="flex items-center gap-0 rounded overflow-hidden" style={{ background: '#3f414b' }}>
          {MARKET_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-3 py-1.5 text-xs font-medium border-none cursor-pointer transition-colors whitespace-nowrap"
              style={{
                background: activeTab === tab.key ? '#292b32' : 'transparent',
                color: '#fefefe',
                borderRight: '1px solid #292b32',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 维度选择 */}
        <select
          value={dimension}
          onChange={(e) => setDimension(e.target.value)}
          className="px-2 py-1.5 rounded text-xs border-none cursor-pointer"
          style={{ background: '#3f414b', color: '#fefefe', outline: 'none' }}
        >
          {DIMENSION_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>

        <div className="flex-1" />

        <span className="text-xs" style={{ color: TEXT_SECONDARY }}>{lastRefresh}</span>
        <button onClick={handleScreenshot}
          className="px-3 py-1.5 rounded text-xs font-medium border-none cursor-pointer"
          style={{ background: '#3f414b', color: '#fefefe' }}>
          截图分享
        </button>
        <button onClick={toggleFullscreen}
          className="px-3 py-1.5 rounded text-xs font-medium border-none cursor-pointer"
          style={{ background: '#3f414b', color: '#fefefe' }}>
          {fullscreen ? '退出全屏' : '全屏'}
        </button>
      </div>

      {/* 统计条 */}
      <div className="flex items-center gap-5 px-2 py-1.5 text-xs" style={{ background: '#363a46', borderBottom: '1px solid #4a4f5d' }}>
        <span>
          <span style={{ color: UP_COLOR }}>上涨 </span>
          <b style={{ color: TEXT_PRIMARY }}>{stats.up.toLocaleString()}</b>
        </span>
        <span>
          <span style={{ color: FLAT_COLOR }}>平盘 </span>
          <b style={{ color: TEXT_PRIMARY }}>{stats.flat.toLocaleString()}</b>
        </span>
        <span>
          <span style={{ color: DOWN_COLOR }}>下跌 </span>
          <b style={{ color: TEXT_PRIMARY }}>{stats.down.toLocaleString()}</b>
        </span>
        <span style={{ color: '#4a4f5d' }}>|</span>
        <span>
          成交额 <b style={{ color: TEXT_PRIMARY }}>{fmtNum(stats.totalAmt)}</b>
        </span>
        {tradeDate && <span style={{ color: TEXT_SECONDARY }}>交易日 {tradeDate}</span>}
      </div>

      {/* Treemap */}
      <div style={{ background: BG_COLOR, height: treemapHeight, minHeight: 400 }}>
        {chartData.length === 0 ? (
          <Empty description={<span style={{ color: TEXT_SECONDARY }}>暂无数据</span>} style={{ padding: 80 }} />
        ) : (
          <ReactECharts
            ref={chartRef}
            option={option}
            style={{ width: '100%', height: '100%' }}
            onEvents={{ dblclick: handleDblClick }}
            opts={{ renderer: 'canvas' }}
          />
        )}
      </div>

      {/* 底部：图例 + 复盘时间线 + 提示 */}
      <div style={{ background: BG_COLOR }}>
        <ColorLegend />
        <div className="flex items-center justify-center gap-4 py-1 text-xs" style={{ color: TEXT_SECONDARY }}>
          <span>面积代表流通市值</span>
          <span>颜色代表涨跌幅度</span>
          <span>每8秒更新数据</span>
          <span>双击色块查看K线</span>
          <span>全屏观看效果更好</span>
        </div>
      </div>
    </div>
  )
}
