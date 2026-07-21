/**
 * 大盘云图组件
 *
 * ECharts Treemap 热力图展示全市场 A 股行情。
 * 按行业分组，颜色表示涨跌（红涨绿跌），面积表示所选维度（成交额/成交量/换手率/涨跌幅）。
 * 参考 52etf.site 的设计理念。
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Spin, Empty, Segmented, Button, Tooltip } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import apiClient from '../../services/api'
import type { StockItem, TreemapGroup, TreemapDimension } from '../../types/stock'

// ================================================================
// 常量
// ================================================================

const REFRESH_INTERVAL = 11_000 // 11 秒自动刷新

const UP_COLOR = '#dc2626'
const DOWN_COLOR = '#16a34a'
const FLAT_COLOR = '#94a3b8'

const DIMENSION_OPTIONS: { label: string; value: TreemapDimension }[] = [
  { label: '流通市值', value: 'circulating_market_cap' },
  { label: '成交额', value: 'amount' },
  { label: '成交量', value: 'volume' },
  { label: '换手率', value: 'turnover_rate' },
  { label: '涨跌幅', value: 'change_pct' },
]

// ================================================================
// 工具函数
// ================================================================

/** 根据涨跌幅计算颜色（红涨绿跌，涨跌幅越大颜色越深） */
function treemapColor(changePct: number | null): string {
  if (changePct == null || changePct === 0) return FLAT_COLOR

  if (changePct > 0) {
    // 涨幅：从浅红到深红，分 5 档
    const t = Math.min(changePct / 10, 1) // 10% 封顶
    const r = Math.round(254 - t * 34)  // 254 → 220
    const g = Math.round(226 - t * 188) // 226 → 38
    const b = Math.round(226 - t * 188) // 226 → 38
    return `rgb(${r},${g},${b})`
  }

  // 跌幅：从浅绿到深绿
  const t = Math.min(Math.abs(changePct) / 10, 1)
  const r = Math.round(220 - t * 198)  // 220 → 22
  const g = Math.round(252 - t * 138)  // 252 → 114
  const b = Math.round(231 - t * 157)  // 231 → 74
  return `rgb(${r},${g},${b})`
}

/** 格式化成交额/成交量 */
function fmtNum(n: number | null | undefined): string {
  if (n == null || n === undefined) return '—'
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + '亿'
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(2) + '万'
  return n.toLocaleString()
}

/** 获取维度值，用于 treemap 面积 */
function getDimensionValue(stock: StockItem, dim: TreemapDimension): number {
  switch (dim) {
    case 'circulating_market_cap':
      // 流通市值优先，NULL/0 时 fallback 到成交额
      return stock.circulating_market_cap || stock.amount || 0
    case 'amount':
      return stock.amount ?? 0
    case 'volume':
      return stock.volume ?? 0
    case 'turnover_rate':
      return stock.turnover_rate ?? 0
    case 'change_pct':
      // 涨跌幅用绝对值，最小给 0.01 避免面积为 0
      return Math.max(Math.abs(stock.change_pct ?? 0), 0.01)
  }
}

// ================================================================
// 组件
// ================================================================

interface MarketTreemapProps {
  market: string
  onStockSelect: (stock: StockItem) => void
  selectedStockCode: string | null
}

export default function MarketTreemap({
  market,
  onStockSelect,
  selectedStockCode,
}: MarketTreemapProps) {
  const [groups, setGroups] = useState<TreemapGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dimension, setDimension] = useState<TreemapDimension>('circulating_market_cap')
  const [lastRefresh, setLastRefresh] = useState<string>('')
  const [tradeDate, setTradeDate] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ---- 数据获取 ----
  const fetchData = useCallback(async () => {
    try {
      const params: Record<string, string> = {}
      if (market) params.market = market
      const res = await apiClient.get('/stocks/treemap', { params })
      setGroups(res.data.groups || [])
      setTradeDate(res.data.trade_date || null)
      setLastRefresh(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
      setError(null)
    } catch {
      setError('数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [market])

  // 初始加载 & 市场切换时重新加载
  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  // 自动刷新（11 秒）
  useEffect(() => {
    timerRef.current = setInterval(fetchData, REFRESH_INTERVAL)

    // 页面不可见时暂停刷新
    const handleVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = null
      } else {
        fetchData()
        timerRef.current = setInterval(fetchData, REFRESH_INTERVAL)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchData])

  // ---- 构建 ECharts 数据 ----
  const chartData = useMemo(() => {
    return groups
      .filter((g) => g.stocks.length > 0)
      .map((group) => ({
        name: group.industry,
        children: group.stocks
          .filter((s) => getDimensionValue(s, dimension) > 0)
          .map((stock) => ({
            name: stock.name,
            value: getDimensionValue(stock, dimension),
            stockCode: stock.code,
            // 编码股票数据到 series 节点上，tooltip formatter 会用到
            changePct: stock.change_pct,
            latestPrice: stock.latest_price,
            volume: stock.volume,
            amount: stock.amount,
            turnoverRate: stock.turnover_rate,
            circulatingMcap: stock.circulating_market_cap,
            isST: stock.is_st,
            itemStyle: {
              color: treemapColor(stock.change_pct),
              borderColor: selectedStockCode === stock.code ? '#fbbf24' : 'rgba(255,255,255,0.3)',
              borderWidth: selectedStockCode === stock.code ? 2 : 0.5,
            },
            label: {
              show: true,
              fontSize: 10,
              color: '#1e293b',
              formatter: (p: any) => {
                // 只显示股票名，空间太小则隐藏
                return p.name.length > 4 ? p.name.slice(0, 4) + '…' : p.name
              },
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 12,
                shadowColor: 'rgba(0,0,0,0.3)',
                borderWidth: 1.5,
                borderColor: '#fbbf24',
              },
              label: {
                fontSize: 12,
                fontWeight: 'bold',
              },
            },
          })),
      }))
  }, [groups, dimension, selectedStockCode])

  // ---- ECharts 配置 ----
  const option: EChartsOption = useMemo(
    () => ({
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#0f172a', fontSize: 12 },
        formatter: (params: any) => {
          if (!params.data || !params.data.stockCode) return params.name
          const d = params.data
          const color = (d.changePct ?? 0) > 0 ? UP_COLOR : (d.changePct ?? 0) < 0 ? DOWN_COLOR : FLAT_COLOR
          const changeStr = d.changePct != null
            ? `${d.changePct > 0 ? '+' : ''}${d.changePct.toFixed(2)}%`
            : '—'
          const stTag = d.isST ? ' <span style="color:red;font-size:10px">ST</span>' : ''
          return `
            <div style="font-size:13px;font-weight:600;margin-bottom:4px">
              ${d.name}${stTag}
              <span style="font-family:monospace;color:#64748b;font-weight:400;margin-left:4px">${d.stockCode}</span>
            </div>
            <div>最新价：<b>${d.latestPrice?.toFixed(2) ?? '—'}</b></div>
            <div>涨跌幅：<b style="color:${color}">${changeStr}</b></div>
            <div>流通市值：<b>${fmtNum(d.circulatingMcap)}</b></div>
            <div>成交额：<b>${fmtNum(d.amount)}</b></div>
            <div>成交量：<b>${fmtNum(d.volume)}</b></div>
            <div>换手率：<b>${d.turnoverRate != null ? d.turnoverRate.toFixed(2) + '%' : '—'}</b></div>
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
            height: 28,
            bottom: 0,
            itemStyle: {
              color: '#f1f5f9',
              borderColor: '#cbd5e1',
              textStyle: { color: '#475569' },
            },
            emphasis: {
              itemStyle: {
                color: '#e2e8f0',
                textStyle: { color: '#0f172a' },
              },
            },
          },
          // 行业分组级别标签
          upperLabel: {
            show: true,
            height: 22,
            fontSize: 11,
            color: '#475569',
            fontWeight: 'bold',
            backgroundColor: 'rgba(255,255,255,0.85)',
            borderRadius: 3,
            padding: [2, 6],
          },
          // ECharts treemap levels: 0=root, 1=行业, 2=个股
          levels: [
            {},
            {
              // 行业层级样式
              itemStyle: {
                borderColor: '#fff',
                borderWidth: 2,
                gapWidth: 2,
              },
            },
          ],
          data: chartData,
        },
      ],
    }),
    [chartData]
  )

  // ---- 事件处理 ----
  const handleChartClick = useCallback(
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
  if (loading) {
    return (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{ height: 500, background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
      >
        <Spin size="large" tip="加载云图数据…" />
      </div>
    )
  }

  if (error && groups.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{ height: 500, background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
      >
        <Empty description={error} />
      </div>
    )
  }

  const totalStocks = groups.reduce((sum, g) => sum + g.stocks.length, 0)
  const upCount = groups.reduce(
    (sum, g) => sum + g.stocks.filter((s) => (s.change_pct ?? 0) > 0).length, 0
  )
  const downCount = groups.reduce(
    (sum, g) => sum + g.stocks.filter((s) => (s.change_pct ?? 0) < 0).length, 0
  )

  return (
    <div>
      {/* 工具栏 */}
      <div
        className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center gap-3">
          {/* 维度切换 */}
          <Segmented
            options={DIMENSION_OPTIONS.map((d) => d.label)}
            value={DIMENSION_OPTIONS.find((d) => d.value === dimension)?.label}
            onChange={(label) => {
              const opt = DIMENSION_OPTIONS.find((d) => d.label === label)
              if (opt) setDimension(opt.value)
            }}
            size="small"
          />

          {/* 涨跌统计 */}
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            共 <b style={{ color: 'var(--text-primary)' }}>{totalStocks.toLocaleString()}</b> 只
            {' · '}
            <b style={{ color: UP_COLOR }}>涨{upCount}</b>
            {' / '}
            <b style={{ color: DOWN_COLOR }}>跌{downCount}</b>
            {tradeDate && (
              <>
                {' · '}
                <span>交易日 {tradeDate}</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              刷新于 {lastRefresh}
            </span>
          )}
          <Tooltip title="手动刷新">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={fetchData}
              loading={loading}
            />
          </Tooltip>
        </div>
      </div>

      {/* 云图 */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
      >
        {chartData.length === 0 ? (
          <Empty description="暂无数据" style={{ padding: 80 }} />
        ) : (
          <ReactECharts
            option={option}
            style={{ height: 520 }}
            onEvents={{ click: handleChartClick }}
            opts={{ renderer: 'canvas' }}
          />
        )}
      </div>

      {/* 图例提示 */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#dc2626' }} />
          涨
        </div>
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#94a3b8' }} />
          平
        </div>
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#16a34a' }} />
          跌
        </div>
        <span className="text-xs mx-2" style={{ color: 'var(--text-secondary)' }}>
          | 方块面积 = {DIMENSION_OPTIONS.find((d) => d.value === dimension)?.label}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          点击色块查看 K 线图
        </span>
      </div>
    </div>
  )
}
