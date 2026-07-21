/**
 * 市场行情页面
 *
 * 大盘概览 → 搜索筛选 → 实时行情表格 → K线图（蜡烛图 + MA均线 + 成交量）
 * 参考东方财富/同花顺等专业交易软件的布局和交互
 */

import { useState, useCallback, useEffect } from 'react'
import { Input, Select, Table, Spin, Empty, Tag, Segmented } from 'antd'
import { SearchOutlined, CaretUpOutlined, CaretDownOutlined, MinusOutlined } from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import type { SorterResult } from 'antd/es/table/interface'
import ReactECharts from 'echarts-for-react'
import apiClient from '../../services/api'
import type { StockItem, KLineItem, MarketOverview } from '../../types/stock'
import MarketTreemap from './MarketTreemap'

// ================================================================
// 常量
// ================================================================

const MARKET_OPTIONS = [
  { value: '', label: '全部市场' },
  { value: 'SH', label: '上海' },
  { value: 'SZ', label: '深圳' },
  { value: 'BJ', label: '北京' },
]

const PAGE_SIZE = 20

const UP_COLOR = '#dc2626'
const DOWN_COLOR = '#16a34a'

/** A股风格：红涨绿跌 */
function priceColor(changePct: number | null): string {
  if (changePct == null || changePct === 0) return 'var(--text-primary)'
  return changePct > 0 ? UP_COLOR : DOWN_COLOR
}

function fmtChange(v: number | null): string {
  if (v == null) return '—'
  return v > 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || n === undefined) return '—'
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + '亿'
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(2) + '万'
  return n.toLocaleString()
}

function fmtPrice(n: number | null): string {
  if (n == null) return '—'
  return n.toFixed(2)
}

/** 计算移动均线 */
function calcMA(data: KLineItem[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      let sum = 0
      for (let j = 0; j < period; j++) sum += data[i - j].close
      result.push(+(sum / period).toFixed(3))
    }
  }
  return result
}

function getDefaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 12)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { start: fmt(start), end: fmt(end) }
}

// ================================================================
// 大盘概览卡片
// ================================================================

function OverviewCards({ overview, loading }: { overview: MarketOverview | null; loading: boolean }) {
  if (loading || !overview) {
    return (
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <div className="animate-pulse h-4 w-20 rounded mb-2" style={{ background: 'var(--border-color)' }} />
            <div className="animate-pulse h-7 w-28 rounded" style={{ background: 'var(--border-color)' }} />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: '上涨家数',
      value: overview.up_count.toLocaleString(),
      sub: overview.avg_change_pct > 0 ? `+${overview.avg_change_pct}%` : `${overview.avg_change_pct}%`,
      color: UP_COLOR,
      bg: '#fef2f2',
    },
    {
      label: '下跌家数',
      value: overview.down_count.toLocaleString(),
      sub: `${((overview.down_count / overview.total_stocks) * 100).toFixed(1)}%`,
      color: DOWN_COLOR,
      bg: '#f0fdf4',
    },
    {
      label: '平盘',
      value: overview.flat_count.toLocaleString(),
      sub: `共 ${overview.total_stocks.toLocaleString()} 只`,
      color: 'var(--text-secondary)',
      bg: 'var(--bg-app)',
    },
    {
      label: '总成交额',
      value: overview.total_amount >= 1e8 ? (overview.total_amount / 1e8).toFixed(2) + '亿' : fmtNum(overview.total_amount),
      sub: overview.trade_date ? `交易日 ${overview.trade_date}` : '',
      color: 'var(--text-primary)',
      bg: 'var(--bg-app)',
    },
  ]

  return (
    <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg p-4"
          style={{ background: card.bg, border: '1px solid var(--border-color)' }}
        >
          <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{card.label}</div>
          <div className="text-xl font-bold" style={{ color: card.color }}>{card.value}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{card.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ================================================================
// 主页面
// ================================================================

export default function MarketPage() {
  // ---- 搜索 & 筛选 ----
  const [search, setSearch] = useState('')
  const [market, setMarket] = useState('')

  // ---- 大盘概览 ----
  const [overview, setOverview] = useState<MarketOverview | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(false)

  // ---- 表格 ----
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState('code')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // ---- K线 ----
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null)
  const [klines, setKlines] = useState<KLineItem[]>([])
  const [klineLoading, setKlineLoading] = useState(false)

  // ---- 视图模式 ----
  const [viewMode, setViewMode] = useState<'treemap' | 'list'>('treemap')

  // ---- 大盘概览 ----
  const fetchOverview = useCallback(async (mkt: string) => {
    setOverviewLoading(true)
    try {
      const params: Record<string, string> = {}
      if (mkt) params.market = mkt
      const res = await apiClient.get('/stocks/overview', { params })
      setOverview(res.data)
    } catch {
      // ignore
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview(market)
  }, [market, fetchOverview])

  // ---- 股票列表 ----
  const fetchStocks = useCallback(async (p: number, sb: string, so: string) => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page: p, page_size: PAGE_SIZE, sort_by: sb, sort_order: so }
      if (market) params.market = market
      if (search.trim()) params.search = search.trim()

      const res = await apiClient.get('/stocks', { params })
      setStocks(res.data.items)
      setTotal(res.data.total)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [market, search])

  // 表格变化（分页、排序）
  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: any,
    sorter: SorterResult<StockItem> | SorterResult<StockItem>[]
  ) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter
    const newSortBy = s.columnKey as string || 'code'
    const newSortOrder = s.order === 'descend' ? 'desc' : 'asc'
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    const newPage = pagination.current || 1
    setPage(newPage)
    fetchStocks(newPage, newSortBy, newSortOrder)
  }

  // 搜索
  const handleSearch = () => {
    setPage(1)
    fetchStocks(1, sortBy, sortOrder)
  }

  // 初始加载
  const [initialized, setInitialized] = useState(false)
  if (!initialized) {
    setInitialized(true)
    fetchStocks(1, sortBy, sortOrder)
  }

  // ---- K线 ----
  const handleRowClick = async (stock: StockItem) => {
    if (selectedStock?.code === stock.code) {
      setSelectedStock(null)
      setKlines([])
      return
    }
    setSelectedStock(stock)
    setKlineLoading(true)
    try {
      const { start, end } = getDefaultDateRange()
      const res = await apiClient.get(`/stocks/${stock.code}/klines`, {
        params: { start_date: start, end_date: end },
      })
      const data: KLineItem[] = res.data.items || []
      setKlines(data.reverse()) // 升序
    } finally {
      setKlineLoading(false)
    }
  }

  // ---- K线图配置 ----
  const getChartOption = () => {
    if (klines.length === 0) return {}

    const dates = klines.map((k) => k.trade_date)
    const ohlc = klines.map((k) => [k.open, k.close, k.low, k.high])
    const volumes = klines.map((k) => k.volume)
    const ma5 = calcMA(klines, 5)
    const ma10 = calcMA(klines, 10)
    const ma20 = calcMA(klines, 20)
    const ma60 = calcMA(klines, 60)

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e2e8f0',
        textStyle: { color: '#0f172a', fontSize: 12 },
        formatter: (params: any) => {
          const k = params.find((p: any) => p.seriesName === 'K线')
          if (!k) return ''
          const d = k.data
          // d is [open, close, low, high]
          const color = d[1] >= d[0] ? UP_COLOR : DOWN_COLOR
          return `
            <div style="font-size:13px;font-weight:600;margin-bottom:4px">${k.axisValue}</div>
            <div>开：<b>${d[0]?.toFixed(2)}</b></div>
            <div>收：<b style="color:${color}">${d[1]?.toFixed(2)}</b></div>
            <div>高：<b>${d[3]?.toFixed(2)}</b></div>
            <div>低：<b>${d[2]?.toFixed(2)}</b></div>
            <div>幅：<b style="color:${color}">${((d[1] - d[0]) / d[0] * 100).toFixed(2)}%</b></div>
          `
        },
      },
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
        label: { backgroundColor: '#334155' },
      },
      grid: [
        { left: '8%', right: '2%', top: 20, height: '55%' },
        { left: '8%', right: '2%', top: '80%', height: '14%' },
      ],
      xAxis: [
        { type: 'category', data: dates, gridIndex: 0, axisLabel: { show: false }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
        { type: 'category', data: dates, gridIndex: 1, axisLabel: { show: false }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, scale: true, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: { fontSize: 10, color: '#94a3b8' } },
        { type: 'value', gridIndex: 1, axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => v >= 1e8 ? (v / 1e8).toFixed(1) + '亿' : (v / 1e4).toFixed(0) + '万' }, splitLine: { show: false } },
      ],
      series: [
        // MA60
        { name: 'MA60', type: 'line', data: ma60, xAxisIndex: 0, yAxisIndex: 0, symbol: 'none', smooth: true, lineStyle: { width: 1, color: '#a855f7', type: 'dashed' } },
        // MA20
        { name: 'MA20', type: 'line', data: ma20, xAxisIndex: 0, yAxisIndex: 0, symbol: 'none', smooth: true, lineStyle: { width: 1, color: '#f59e0b' } },
        // MA10
        { name: 'MA10', type: 'line', data: ma10, xAxisIndex: 0, yAxisIndex: 0, symbol: 'none', smooth: true, lineStyle: { width: 1, color: '#3b82f6' } },
        // MA5
        { name: 'MA5', type: 'line', data: ma5, xAxisIndex: 0, yAxisIndex: 0, symbol: 'none', smooth: true, lineStyle: { width: 1.5, color: '#f8fafc' } },
        // K线
        {
          name: 'K线', type: 'candlestick', data: ohlc, xAxisIndex: 0, yAxisIndex: 0,
          itemStyle: { color: UP_COLOR, color0: DOWN_COLOR, borderColor: UP_COLOR, borderColor0: DOWN_COLOR },
          markPoint: {
            symbol: 'pin', symbolSize: 40,
            data: [
              { type: 'max', label: { fontSize: 10, color: '#64748b' } },
              { type: 'min', label: { fontSize: 10, color: '#64748b' } },
            ],
          },
        },
        // 成交量
        {
          name: '成交量', type: 'bar', data: volumes, xAxisIndex: 1, yAxisIndex: 1,
          itemStyle: {
            color: (params: any) => {
              const idx = params.dataIndex
              if (idx >= klines.length) return DOWN_COLOR
              const k = klines[idx]
              return k.close >= k.open ? UP_COLOR : DOWN_COLOR
            },
            borderRadius: [1, 1, 0, 0],
          },
        },
      ],
    }
  }

  // ---- 表格列 ----
  const columns: ColumnsType<StockItem> = [
    {
      title: '代码', dataIndex: 'code', key: 'code', width: 90, sorter: true, sortOrder: sortBy === 'code' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
      render: (code: string, rec: StockItem) => (
        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
          {code}
          {rec.is_st && <Tag color="red" style={{ marginLeft: 4, fontSize: 10, lineHeight: '14px', padding: '0 3px' }}>ST</Tag>}
        </span>
      ),
    },
    {
      title: '名称', dataIndex: 'name', key: 'name', width: 100, sorter: true,
    },
    {
      title: '最新价', dataIndex: 'latest_price', key: 'latest_price', width: 90, align: 'right',
      render: (_: any, rec: StockItem) => (
        <span style={{ fontWeight: 600, fontFamily: 'monospace', color: priceColor(rec.change_pct) }}>
          {fmtPrice(rec.latest_price)}
        </span>
      ),
      sorter: true,
      sortOrder: sortBy === 'change_pct' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
    },
    {
      title: '涨跌幅', dataIndex: 'change_pct', key: 'change_pct', width: 90, align: 'right', sorter: true,
      sortOrder: sortBy === 'change_pct' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
      render: (v: number | null) => {
        if (v == null) return <span style={{ color: 'var(--text-secondary)' }}>—</span>
        const icon = v > 0 ? <CaretUpOutlined /> : v < 0 ? <CaretDownOutlined /> : <MinusOutlined />
        return (
          <span style={{ fontWeight: 600, color: priceColor(v), fontFamily: 'monospace' }}>
            {icon} {Math.abs(v).toFixed(2)}%
          </span>
        )
      },
    },
    {
      title: '成交量', dataIndex: 'volume', key: 'volume', width: 100, align: 'right', sorter: true,
      sortOrder: sortBy === 'volume' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
      render: (v: number | null) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
          {fmtNum(v)}
        </span>
      ),
    },
    {
      title: '成交额', dataIndex: 'amount', key: 'amount', width: 100, align: 'right', sorter: true,
      sortOrder: sortBy === 'amount' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
      render: (v: number | null) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
          {fmtNum(v)}
        </span>
      ),
    },
    {
      title: '换手率', dataIndex: 'turnover_rate', key: 'turnover_rate', width: 80, align: 'right',
      render: (v: number | null) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
          {v != null ? `${v.toFixed(2)}%` : '—'}
        </span>
      ),
    },
    {
      title: '行业', dataIndex: 'industry', ellipsis: true, width: 120,
      render: (v: string | null) => (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v || '—'}</span>
      ),
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">📈 市场行情</h1>

      {/* 大盘概览 */}
      <OverviewCards overview={overview} loading={overviewLoading} />

      {/* 搜索栏 + 视图切换 */}
      <div className="flex items-center justify-between gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <Input
            placeholder="搜索代码 / 名称..."
            prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            style={{ maxWidth: 260 }}
            allowClear
          />
          <Select
            options={MARKET_OPTIONS}
            value={market}
            onChange={(v) => { setMarket(v); setPage(1) }}
            style={{ width: 110 }}
          />
          <button
            className="px-5 py-1.5 rounded-md text-sm font-medium border-none cursor-pointer"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
            onClick={handleSearch}
          >
            查询
          </button>
          {viewMode === 'list' && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              共 {total.toLocaleString()} 只股票
            </span>
          )}
        </div>

        {/* 视图切换 */}
        <Segmented
          options={[
            { label: '☁️ 云图', value: 'treemap' },
            { label: '📋 列表', value: 'list' },
          ]}
          value={viewMode}
          onChange={(v) => setViewMode(v as 'treemap' | 'list')}
        />
      </div>

      {/* 大盘云图 / 股票表格 */}
      {viewMode === 'treemap' ? (
        <MarketTreemap
          market={market}
          onStockSelect={handleRowClick}
          selectedStockCode={selectedStock?.code ?? null}
        />
      ) : (
        <Table<StockItem>
          rowKey="code"
          columns={columns}
          dataSource={stocks}
          loading={loading}
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showTotal: (t) => `共 ${t.toLocaleString()} 只`,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showQuickJumper: true,
          }}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer' },
          })}
          rowClassName={(record) =>
            selectedStock?.code === record.code ? 'ant-table-row-selected' : ''
          }
          scroll={{ x: 800 }}
          size="middle"
          locale={{ emptyText: <Empty description="未找到匹配的股票" /> }}
        />
      )}

      {/* K线图 */}
      {selectedStock && (
        <div
          className="rounded-lg mt-4 p-5"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
        >
          {/* 股票信息头 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold" style={{ margin: 0, color: 'var(--text-primary)' }}>
                {selectedStock.name}
              </h2>
              <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{selectedStock.code}</span>
              {selectedStock.industry && (
                <Tag style={{ margin: 0 }}>{selectedStock.industry}</Tag>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              {/* 图例 */}
              <span style={{ color: '#f8fafc' }}>━ MA5</span>
              <span style={{ color: '#3b82f6' }}>━ MA10</span>
              <span style={{ color: '#f59e0b' }}>━ MA20</span>
              <span style={{ color: '#a855f7' }}>┅ MA60</span>
            </div>
          </div>

          {klineLoading ? (
            <div className="flex items-center justify-center" style={{ height: 480 }}>
              <Spin size="large" />
            </div>
          ) : klines.length === 0 ? (
            <Empty description="暂无K线数据" style={{ padding: 80 }} />
          ) : (
            <ReactECharts option={getChartOption()} style={{ height: 480 }} />
          )}
        </div>
      )}
    </div>
  )
}
