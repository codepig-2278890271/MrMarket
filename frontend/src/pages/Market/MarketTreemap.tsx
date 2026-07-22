/**
 * 大盘云图组件 — ECharts Treemap 热力图
 *
 * 参考 52etf.site 设计，按申万行业分组，颜色表示涨跌，面积表示流通市值。
 * 支持市场切换、自动刷新、双击K线、颜色图例。
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Spin, Empty } from 'antd'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import apiClient from '../../services/api'
import type { StockItem, TreemapGroup } from '../../types/stock'

// ================================================================
// 常量
// ================================================================

const REFRESH_INTERVAL = 8_000 // 8 秒自动刷新

const UP_COLOR = '#dc2626'
const DOWN_COLOR = '#16a34a'

// 市场板块 tab 定义
const MARKET_TABS = [
  { key: '', label: 'A股全图' },
  { key: 'SH', label: '上证A股' },
  { key: 'SZ', label: '深证A股' },
  { key: 'CY', label: '创业板' },
  { key: 'KC', label: '科创板' },
]

// ================================================================
// 工具函数
// ================================================================

/** 根据涨跌幅生成 treemap 颜色 — 匹配 52etf.site 的红涨绿跌渐变 */
function treemapColor(changePct: number | null): string {
  if (changePct == null || changePct === 0) return '#f5f5f5'

  const maxPct = 4 // ±4% 为颜色饱和点
  const t = Math.min(Math.abs(changePct) / maxPct, 1)

  if (changePct > 0) {
    // 涨：白→浅粉→深红
    const r = Math.round(255)
    const g = Math.round(255 - t * 200) // 255 → 55
    const b = Math.round(255 - t * 200)
    return `rgb(${r},${g},${b})`
  }
  // 跌：白→浅绿→深绿
  const r = Math.round(255 - t * 200) // 255 → 55
  const g = Math.round(255)
  const b = Math.round(255 - t * 200)
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

/** 获取维度值（面积） — 流通市值优先，fallback 成交额 */
function getBlockValue(stock: StockItem): number {
  return stock.circulating_market_cap || stock.amount || 0
}

// ================================================================
// 组件 Props
// ================================================================

interface MarketTreemapProps {
  onStockSelect: (stock: StockItem) => void
  selectedStockCode: string | null
}

// ================================================================
// 颜色图例组件
// ================================================================

function ColorLegend() {
  const stops = [
    { pct: -4, color: '#16a34a' },
    { pct: -3, color: '#4ade80' },
    { pct: -2, color: '#bbf7d0' },
    { pct: -1, color: '#dcfce7' },
    { pct: 0, color: '#f5f5f5' },
    { pct: 1, color: '#fee2e2' },
    { pct: 2, color: '#fca5a5' },
    { pct: 3, color: '#f87171' },
    { pct: 4, color: '#dc2626' },
  ]

  return (
    <div className="flex items-center justify-center gap-0 mt-1 mb-2 select-none">
      <span className="text-xs mr-2" style={{ color: '#999' }}>跌</span>
      <div
        className="flex rounded-sm overflow-hidden"
        style={{ width: 320, height: 14, border: '1px solid #e5e7eb' }}
      >
        {stops.map((s, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: s.color,
            }}
          />
        ))}
      </div>
      <span className="text-xs ml-2" style={{ color: '#999' }}>涨</span>
      <div style={{ width: 320, position: 'relative', marginLeft: -320 }}>
        {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((v) => (
          <span
            key={v}
            className="text-xs"
            style={{
              position: 'absolute',
              left: `${((v + 4) / 8) * 100}%`,
              top: 18,
              transform: 'translateX(-50%)',
              color: '#999',
            }}
          >
            {v > 0 ? '+' : ''}{v}%
          </span>
        ))}
      </div>
    </div>
  )
}

// ================================================================
// 主组件
// ================================================================

export default function MarketTreemap({
  onStockSelect,
  selectedStockCode,
}: MarketTreemapProps) {
  const [activeTab, setActiveTab] = useState('')
  const [groups, setGroups] = useState<TreemapGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState('')
  const [tradeDate, setTradeDate] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const chartRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ---- 数据获取 ----
  const fetchData = useCallback(async () => {
    try {
      const params: Record<string, string> = {}
      // 板块筛选
      if (activeTab === 'SH') params.market = 'SH'
      else if (activeTab === 'SZ') params.market = 'SZ'
      // 创业板/科创板在后端不支持时用前端过滤
      const res = await apiClient.get('/stocks/treemap', { params })
      let allGroups: TreemapGroup[] = res.data.groups || []

      // 前端过滤 创业板(300/301xxx) / 科创板(688xxx)
      if (activeTab === 'CY') {
        allGroups = allGroups.map((g: TreemapGroup) => ({
          ...g,
          stocks: g.stocks.filter(
            (s) => s.code.startsWith('300') || s.code.startsWith('301')
          ),
        })).filter((g: TreemapGroup) => g.stocks.length > 0)
      } else if (activeTab === 'KC') {
        allGroups = allGroups.map((g: TreemapGroup) => ({
          ...g,
          stocks: g.stocks.filter((s) => s.code.startsWith('688')),
        })).filter((g: TreemapGroup) => g.stocks.length > 0)
      }

      setGroups(allGroups)
      setTradeDate(res.data.trade_date || null)
      const now = new Date()
      setLastRefresh(now.toLocaleTimeString('zh-CN', { hour12: false }))
      setCurrentTime(now.toLocaleTimeString('zh-CN', { hour12: false }))
      setError(null)
    } catch {
      setError('数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  // 初始加载 & tab 切换
  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  // 自动刷新（8 秒）
  useEffect(() => {
    timerRef.current = setInterval(() => {
      fetchData()
    }, REFRESH_INTERVAL)

    const handleVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      } else {
        fetchData()
        timerRef.current = setInterval(() => fetchData(), REFRESH_INTERVAL)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchData])

  // 全屏切换
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  // 截图分享
  const handleScreenshot = () => {
    const instance = chartRef.current?.getEchartsInstance()
    if (instance) {
      const url = instance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff',
      })
      // 下载图片
      const link = document.createElement('a')
      link.download = `大盘云图_${tradeDate || 'snapshot'}.png`
      link.href = url
      link.click()
    }
  }

  // ---- 统计 ----
  const stats = useMemo(() => {
    const allStocks = groups.flatMap((g) => g.stocks)
    const total = allStocks.length
    const up = allStocks.filter((s) => (s.change_pct ?? 0) > 0).length
    const down = allStocks.filter((s) => (s.change_pct ?? 0) < 0).length
    const flat = total - up - down
    const totalAmount = allStocks.reduce((sum, s) => sum + (s.amount ?? 0), 0)
    return { total, up, down, flat, totalAmount }
  }, [groups])

  // ---- 构建 ECharts Treemap 数据 ----
  const chartData = useMemo(() => {
    return groups
      .filter((g) => g.stocks.length > 0)
      .map((group) => ({
        name: group.industry,
        children: group.stocks
          .filter((s) => getBlockValue(s) > 0)
          .map((stock) => ({
            name: stock.name,
            value: getBlockValue(stock),
            // 自定义数据，tooltip 和事件使用
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
              borderColor: 'rgba(255,255,255,0.6)',
              borderWidth: 0,
            },
            label: {
              show: true,
              fontSize: 10,
              color: '#333',
              overflow: 'truncate',
              ellipsis: '…',
              // 只在块足够大时显示标签
              formatter: (p: any) => {
                if (p.value == null) return ''
                // 块太小不显示标签（约 20x20 以下）
                return p.name.length > 4 ? p.name.slice(0, 4) + '…' : p.name
              },
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 8,
                shadowColor: 'rgba(0,0,0,0.25)',
                borderWidth: 1.5,
                borderColor: '#333',
              },
              label: { fontSize: 12, fontWeight: 'bold' },
            },
          })),
      }))
  }, [groups])

  // ---- ECharts 配置 ----
  const option: EChartsOption = useMemo(
    () => ({
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#333', fontSize: 13 },
        formatter: (params: any) => {
          if (!params.data || !params.data.stockCode) return params.name
          const d = params.data
          const pct = d.changePct ?? 0
          const color = pct > 0 ? UP_COLOR : pct < 0 ? DOWN_COLOR : '#999'
          const sign = pct > 0 ? '+' : ''
          const stTag = d.isST ? ' <span style="color:#dc2626;font-size:10px">ST</span>' : ''
          return `
            <div style="font-size:14px;font-weight:600;margin-bottom:6px">
              ${d.name}${stTag}
              <span style="font-family:monospace;color:#999;font-weight:400;margin-left:6px">${d.stockCode}</span>
            </div>
            <div style="line-height:1.8">
              最新价 <b style="float:right;margin-left:20px">${d.latestPrice?.toFixed(2) ?? '—'}</b><br/>
              涨跌幅 <b style="float:right;margin-left:20px;color:${color}">${sign}${pct.toFixed(2)}%</b><br/>
              流通市值 <b style="float:right;margin-left:20px">${fmtNum(d.circulatingMcap)}</b><br/>
              成交额 <b style="float:right;margin-left:20px">${fmtNum(d.amount)}</b>
            </div>
          `
        },
      },
      series: [
        {
          type: 'treemap',
          width: '100%',
          height: '100%',
          roam: false,
          nodeClick: 'link' as const,
          breadcrumb: {
            show: true,
            height: 30,
            bottom: 0,
            itemStyle: {
              color: '#f5f5f5',
              borderColor: '#e5e7eb',
              textStyle: { color: '#666' },
            },
            emphasis: {
              itemStyle: {
                color: '#e5e7eb',
                textStyle: { color: '#333' },
              },
            },
          },
          upperLabel: {
            show: true,
            height: 24,
            fontSize: 12,
            color: '#444',
            fontWeight: 'bold',
            backgroundColor: 'rgba(255,255,255,0.8)',
            borderRadius: 3,
            padding: [3, 8],
          },
          levels: [
            {
              // level 0: root — invisible
              itemStyle: { borderWidth: 0, gapWidth: 0 },
            },
            {
              // level 1: 行业分组
              itemStyle: {
                borderColor: '#fff',
                borderWidth: 3,
                gapWidth: 3,
              },
              upperLabel: { show: true },
            },
            {
              // level 2: 个股 — 无边框，紧密排列
              itemStyle: {
                borderWidth: 0,
                gapWidth: 0,
              },
            },
          ],
          data: chartData,
        },
      ],
    }),
    [chartData]
  )

  // ---- 事件 ----
  const handleChartDblClick = useCallback(
    (params: any) => {
      if (params.data && params.data.stockCode) {
        const stock: StockItem = {
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
        }
        onStockSelect(stock)
      }
    },
    [onStockSelect, tradeDate]
  )

  // ---- 渲染 ----
  if (loading && groups.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: '60vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error && groups.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: '60vh' }}>
        <Empty description={error} />
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ background: '#fff', minHeight: '100%' }}>
      {/* ================================================================ */}
      {/* 市场板块 Tab */}
      {/* ================================================================ */}
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {MARKET_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-1.5 rounded text-sm font-medium transition-colors border-none cursor-pointer"
            style={{
              background: activeTab === tab.key ? '#1677ff' : '#f5f5f5',
              color: activeTab === tab.key ? '#fff' : '#666',
            }}
          >
            {tab.label}
          </button>
        ))}

        <div className="flex-1" />

        {/* 右侧操作按钮 */}
        <span className="text-xs mr-2" style={{ color: '#999' }}>
          每8秒更新 · {lastRefresh}
        </span>
        <button
          onClick={handleScreenshot}
          className="px-3 py-1.5 rounded text-xs font-medium border-none cursor-pointer"
          style={{ background: '#f5f5f5', color: '#666' }}
        >
          截图分享
        </button>
        <button
          onClick={toggleFullscreen}
          className="px-3 py-1.5 rounded text-xs font-medium border-none cursor-pointer"
          style={{ background: '#f5f5f5', color: '#666' }}
        >
          {fullscreen ? '退出全屏' : '全屏'}
        </button>
      </div>

      {/* ================================================================ */}
      {/* 统计条 — 参考 52etf.site */}
      {/* ================================================================ */}
      <div className="flex items-center gap-6 mb-2 px-1 text-sm" style={{ color: '#666' }}>
        <span>
          <span style={{ color: UP_COLOR, fontWeight: 600 }}>↑ 上涨 </span>
          <b style={{ color: '#333' }}>{stats.up.toLocaleString()}</b>
        </span>
        <span>
          <span style={{ color: '#999', fontWeight: 600 }}>— 平盘 </span>
          <b style={{ color: '#333' }}>{stats.flat.toLocaleString()}</b>
        </span>
        <span>
          <span style={{ color: DOWN_COLOR, fontWeight: 600 }}>↓ 下跌 </span>
          <b style={{ color: '#333' }}>{stats.down.toLocaleString()}</b>
        </span>
        <span className="text-xs" style={{ color: '#bbb' }}>|</span>
        <span>
          成交额 <b style={{ color: '#333' }}>{fmtNum(stats.totalAmount)}</b>
        </span>
        {tradeDate && (
          <>
            <span className="text-xs" style={{ color: '#bbb' }}>|</span>
            <span className="text-xs">交易日 {tradeDate}</span>
          </>
        )}
        <span className="text-xs" style={{ color: '#bbb' }}>|</span>
        <span className="text-xs" style={{ color: '#999' }}>
          方块面积 = 流通市值 · 红涨绿跌 · 双击色块查看K线
        </span>
      </div>

      {/* ================================================================ */}
      {/* Treemap 云图 */}
      {/* ================================================================ */}
      <div
        className="overflow-hidden"
        style={{
          background: '#fff',
          height: fullscreen ? 'calc(100vh - 100px)' : 'calc(100vh - 280px)',
          minHeight: 480,
        }}
      >
        {chartData.length === 0 ? (
          <Empty description="暂无数据" style={{ padding: 80 }} />
        ) : (
          <ReactECharts
            ref={chartRef}
            option={option}
            style={{ width: '100%', height: '100%' }}
            onEvents={{ dblclick: handleChartDblClick }}
            opts={{ renderer: 'canvas' }}
          />
        )}
      </div>

      {/* ================================================================ */}
      {/* 颜色图例 — 参考 52etf.site 底部渐变条 */}
      {/* ================================================================ */}
      <div style={{ paddingTop: 8, paddingBottom: 4 }}>
        <ColorLegend />
      </div>

      {/* 操作提示 */}
      <div className="flex items-center justify-center gap-6 mt-1 mb-2 text-xs" style={{ color: '#bbb' }}>
        <span>面积代表流通市值</span>
        <span>颜色代表涨跌幅度</span>
        <span>每8秒更新数据</span>
        <span>双击色块查看K线</span>
        <span>全屏观看效果更好</span>
      </div>
    </div>
  )
}
