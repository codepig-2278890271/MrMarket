/**
 * 行情页面
 * 股票搜索 → 分页表格 → 点击查看K线图（ECharts 蜡烛图）
 */
import { useState, useCallback } from 'react'
import { Input, Select, Table, Spin, Empty, Tag } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import ReactECharts from 'echarts-for-react'
import apiClient from '../../services/api'

/** 股票列表项 */
interface StockItem {
  code: string
  name: string
  market: string
  industry: string | null
  listed_date: string | null
  is_st: boolean
}

/** 单条K线 */
interface KLineItem {
  trade_date: string
  open: number
  high: number
  low: number
  close: number
  pre_close: number
  volume: number
  amount: number
  turnover_rate: number | null
}

const MARKET_OPTIONS = [
  { value: '', label: '全部市场' },
  { value: 'SH', label: '上海' },
  { value: 'SZ', label: '深圳' },
  { value: 'BJ', label: '北京' },
]

export default function MarketPage() {
  // ---- 搜索 & 列表状态 ----
  const [search, setSearch] = useState('')
  const [market, setMarket] = useState('')
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(false)

  // ---- K线状态 ----
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null)
  const [klines, setKlines] = useState<KLineItem[]>([])
  const [klineLoading, setKlineLoading] = useState(false)

  // ---- 搜索 ----
  const fetchStocks = useCallback(
    async (p: number, ps: number) => {
      setLoading(true)
      try {
        const params: Record<string, string | number> = { page: p, page_size: ps }
        if (market) params.market = market
        if (search.trim()) params.search = search.trim()

        const res = await apiClient.get('/stocks', { params })
        setStocks(res.data.items)
        setTotal(res.data.total)
        setPage(p)
        setPageSize(ps)
      } finally {
        setLoading(false)
      }
    },
    [market, search]
  )

  // ---- 点击股票 → 加载K线 ----
  const handleRowClick = async (stock: StockItem) => {
    setSelectedStock(stock)
    setKlineLoading(true)
    try {
      const res = await apiClient.get(`/stocks/${stock.code}/klines`, {
        params: {
          start_date: '2026-01-01',
          end_date: '2026-07-05',
        },
      })
      // 反转：后端按日期降序，图表需要升序
      const data: KLineItem[] = res.data.items || []
      setKlines(data.reverse())
    } finally {
      setKlineLoading(false)
    }
  }

  // ---- K线图配置（ECharts 蜡烛图 + 成交量） ----
  const getChartOption = () => {
    if (klines.length === 0) return {}

    const dates = klines.map((k) => k.trade_date)
    const ohlc = klines.map((k) => [k.open, k.close, k.low, k.high])
    const volumes = klines.map((k) => k.volume)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      grid: [
        { left: '8%', right: '2%', top: 20, height: '55%' },
        { left: '8%', right: '2%', top: '78%', height: '15%' },
      ],
      xAxis: [
        { type: 'category', data: dates, gridIndex: 0, axisLabel: { show: false } },
        { type: 'category', data: dates, gridIndex: 1, axisLabel: { rotate: 30, fontSize: 10 } },
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, scale: true },
        {
          type: 'value',
          gridIndex: 1,
          axisLabel: { formatter: (v: number) => (v / 1e6).toFixed(0) + 'M' },
        },
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: ohlc,
          xAxisIndex: 0,
          yAxisIndex: 0,
          itemStyle: {
            color: '#dc2626',
            color0: '#16a34a',
            borderColor: '#dc2626',
            borderColor0: '#16a34a',
          },
        },
        {
          name: '成交量',
          type: 'bar',
          data: volumes,
          xAxisIndex: 1,
          yAxisIndex: 1,
          itemStyle: {
            color: (params: any) => {
              const idx = params.dataIndex
              const k = klines[idx]
              return k && k.close >= k.open ? '#dc2626' : '#16a34a'
            },
          },
        },
      ],
    }
  }

  // ---- 表格列 ----
  const columns: ColumnsType<StockItem> = [
    {
      title: '代码',
      dataIndex: 'code',
      width: 100,
      render: (code: string, rec: StockItem) => (
        <span>
          {code}
          {rec.is_st && <Tag color="red" style={{ marginLeft: 4 }}>ST</Tag>}
        </span>
      ),
    },
    { title: '名称', dataIndex: 'name', width: 120 },
    {
      title: '市场',
      dataIndex: 'market',
      width: 70,
      render: (m: string) => ({ SH: '沪', SZ: '深', BJ: '京' }[m] || m),
    },
    { title: '行业', dataIndex: 'industry', ellipsis: true },
    { title: '上市日期', dataIndex: 'listed_date', width: 120 },
  ]

  // ---- 首次加载 ----
  const [initialized, setInitialized] = useState(false)
  if (!initialized) {
    setInitialized(true)
    fetchStocks(1, 20)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">📈 行情</h1>

      {/* 搜索栏 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Input
          placeholder="搜索股票代码或名称..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onPressEnter={() => fetchStocks(1, pageSize)}
          style={{ maxWidth: 320 }}
          allowClear
        />
        <Select
          options={MARKET_OPTIONS}
          value={market}
          onChange={(v) => { setMarket(v); setPage(1) }}
          style={{ width: 120 }}
        />
        <button
          className="px-4 py-1 rounded"
          style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
          onClick={() => fetchStocks(1, pageSize)}
        >
          搜索
        </button>
      </div>

      {/* 股票表格 */}
      <Table<StockItem>
        rowKey="code"
        columns={columns}
        dataSource={stocks}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: (t) => `共 ${t} 只股票`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          onChange: (p, ps) => fetchStocks(p, ps),
        }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' },
        })}
        rowClassName={(record) =>
          selectedStock?.code === record.code ? 'ant-table-row-selected' : ''
        }
        scroll={{ x: 600 }}
        size="middle"
      />

      {/* K线图区域 */}
      {selectedStock && (
        <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-surface)', borderRadius: 8 }}>
          <h2 className="text-lg font-bold mb-2">
            {selectedStock.name} ({selectedStock.code}) — 日K线
          </h2>
          {klineLoading ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <Spin size="large" />
            </div>
          ) : klines.length === 0 ? (
            <Empty description="暂无K线数据" />
          ) : (
            <ReactECharts option={getChartOption()} style={{ height: 480 }} />
          )}
        </div>
      )}
    </div>
  )
}
