/**
 * 回测页面
 *
 * Tab 1: 策略管理 — 创建、编辑、启停、删除策略
 * Tab 2: 回测执行 — 选择策略、设置参数、查看回测结果
 */
import { useState, useCallback } from 'react'
import { Tabs, Table, Button, Modal, Input, Select, Switch, Popconfirm, message, Space, Tag, DatePicker, InputNumber, Empty } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AimOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import apiClient from '../../services/api'
import type { StrategyItem, IndicatorConfig } from '../../types/strategy'
import { INDICATOR_PRESETS, INDICATOR_OPTIONS } from '../../types/strategy'

const { RangePicker } = DatePicker

// ==================== 策略管理面板 ====================

function StrategyPanel() {
  // ---- 列表 ----
  const [items, setItems] = useState<StrategyItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  // ---- 表单 ----
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<StrategyItem | null>(null)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formIndicators, setFormIndicators] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  // ---- 加载列表 ----
  const fetchList = useCallback(async (p = 1, ps = 20) => {
    setLoading(true)
    try {
      const res = await apiClient.get('/strategies', { params: { page: p, page_size: ps } })
      setItems(res.data.items)
      setTotal(res.data.total)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [])

  // ---- 创建/编辑弹窗 ----
  const openCreate = () => {
    setEditing(null)
    setFormName('')
    setFormDesc('')
    setFormIndicators([])
    setModalOpen(true)
  }

  const openEdit = (item: StrategyItem) => {
    setEditing(item)
    setFormName(item.name)
    setFormDesc(item.description || '')
    setFormIndicators(item.indicators.map((ind) => ind.indicator))
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!formName.trim()) return
    setSubmitting(true)
    try {
      const payload = {
        name: formName.trim(),
        description: formDesc.trim() || null,
        indicators: formIndicators.map((ind) => ({
          indicator: ind,
          params: INDICATOR_PRESETS[ind] || {},
        })),
      }
      if (editing) {
        await apiClient.put(`/strategies/${editing.id}`, payload)
        message.success('策略已更新')
      } else {
        await apiClient.post('/strategies', payload)
        message.success('策略已创建')
      }
      setModalOpen(false)
      fetchList(page)
    } finally {
      setSubmitting(false)
    }
  }

  // ---- 启停 ----
  const handleToggle = async (item: StrategyItem) => {
    try {
      await apiClient.patch(`/strategies/${item.id}/toggle`, { enabled: !item.enabled })
      message.success(item.enabled ? '已停用' : '已启用')
      fetchList(page)
    } catch { /* skip */ }
  }

  // ---- 删除 ----
  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/strategies/${id}`)
      message.success('已删除')
      fetchList(page)
    } catch { /* skip */ }
  }

  // ---- 表格列 ----
  const columns: ColumnsType<StrategyItem> = [
    { title: '名称', dataIndex: 'name', width: 160 },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    {
      title: '指标',
      dataIndex: 'indicators',
      width: 240,
      render: (indicators: IndicatorConfig[]) =>
        indicators.length > 0
          ? indicators.map((ind) => (
              <Tag key={ind.indicator} color="blue">{ind.indicator}</Tag>
            ))
          : <span style={{ color: 'var(--text-secondary)' }}>未配置</span>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (enabled: boolean, rec) => (
        <Switch checked={enabled} size="small" onChange={() => handleToggle(rec)} />
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 170,
      render: (t: string) => t?.replace('T', ' ').slice(0, 19),
    },
    {
      title: '操作',
      width: 120,
      render: (_, rec) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(rec)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(rec.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // ---- 首次加载 ----
  const [initialized, setInitialized] = useState(false)
  if (!initialized) {
    setInitialized(true)
    fetchList(1)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="text-lg font-bold" style={{ margin: 0 }}>📋 策略列表</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建策略
        </Button>
      </div>

      <Table<StrategyItem>
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          showTotal: (t) => `共 ${t} 个策略`,
          onChange: (p) => fetchList(p),
        }}
        size="middle"
      />

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editing ? '编辑策略' : '新建策略'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText={editing ? '保存' : '创建'}
        cancelText="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>策略名称 *</label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="如：双均线突破策略"
              maxLength={100}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>描述</label>
            <Input.TextArea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="描述策略逻辑..."
              rows={3}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>技术指标</label>
            <Select
              mode="multiple"
              options={INDICATOR_OPTIONS}
              value={formIndicators}
              onChange={setFormIndicators}
              placeholder="选择技术指标（可多选）"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ==================== 回测执行面板 ====================

function BacktestPanel() {
  const [selectedStrategy, setSelectedStrategy] = useState<number | null>(null)
  const [strategies, setStrategies] = useState<StrategyItem[]>([])
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [initialCapital, setInitialCapital] = useState<number>(100000)

  // 加载策略下拉列表
  const [stratLoaded, setStratLoaded] = useState(false)
  if (!stratLoaded) {
    setStratLoaded(true)
    apiClient.get('/strategies', { params: { page: 1, page_size: 100 } }).then((res) => {
      setStrategies(res.data.items.filter((s: StrategyItem) => s.enabled))
    }).catch(() => {})
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">⚡ 运行回测</h2>

      {/* 参数配置 */}
      <div
        className="rounded-lg p-5 mb-6"
        style={{
          background: 'var(--bg-app)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {/* 选择策略 */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              选择策略
            </label>
            <Select
              placeholder="选择一个已启用的策略"
              options={strategies.map((s) => ({ label: s.name, value: s.id }))}
              value={selectedStrategy}
              onChange={setSelectedStrategy}
              style={{ width: '100%' }}
              notFoundContent={<Empty description="暂无已启用的策略，请先创建" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            />
          </div>

          {/* 时间范围 */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              回测区间
            </label>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
            />
          </div>

          {/* 初始资金 */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              初始资金（元）
            </label>
            <InputNumber
              value={initialCapital}
              onChange={(v) => setInitialCapital(v || 0)}
              min={10000}
              max={100000000}
              step={10000}
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/,/g, '') as any}
            />
          </div>
        </div>

        {/* 运行按钮 */}
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            disabled={!selectedStrategy || !dateRange}
            style={{ background: '#dc2626', borderColor: '#dc2626' }}
          >
            开始回测
          </Button>
          <span className="ml-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            回测引擎开发中，敬请期待…
          </span>
        </div>
      </div>

      {/* 回测结果占位 */}
      <div
        className="rounded-lg p-8 text-center"
        style={{
          background: 'var(--bg-surface)',
          border: '2px dashed var(--border-color)',
        }}
      >
        <HistoryOutlined style={{ fontSize: 48, color: 'var(--text-secondary)', opacity: 0.3 }} />
        <p className="mt-4 text-base" style={{ color: 'var(--text-secondary)' }}>
          选择策略并配置参数后，点击「开始回测」查看结果
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
          回测结果将展示：收益率曲线、夏普比率、最大回撤、胜率、盈亏比等核心指标
        </p>

        {/* 占位指标卡片 */}
        <div className="grid gap-4 mt-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          {[
            { label: '总收益率', value: '—', color: 'var(--text-secondary)' },
            { label: '年化收益', value: '—', color: 'var(--text-secondary)' },
            { label: '最大回撤', value: '—', color: '#dc2626' },
            { label: '夏普比率', value: '—', color: 'var(--text-secondary)' },
            { label: '胜率', value: '—', color: '#16a34a' },
            { label: '交易次数', value: '—', color: 'var(--text-secondary)' },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg p-3"
              style={{
                background: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{metric.label}</div>
              <div className="text-xl font-bold" style={{ color: metric.color }}>{metric.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ==================== 主页面 ====================

export default function BacktestPage() {
  const [activeTab, setActiveTab] = useState('strategy')

  const TAB_ITEMS = [
    {
      key: 'strategy',
      label: (
        <span className="flex items-center gap-1.5">
          <AimOutlined />
          策略管理
        </span>
      ),
      children: <StrategyPanel />,
    },
    {
      key: 'backtest',
      label: (
        <span className="flex items-center gap-1.5">
          <HistoryOutlined />
          回测执行
        </span>
      ),
      children: <BacktestPanel />,
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">📊 回测</h1>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={TAB_ITEMS}
        tabBarStyle={{
          marginBottom: 20,
          borderBottom: '1px solid var(--border-color)',
        }}
      />
    </div>
  )
}
