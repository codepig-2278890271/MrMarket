/**
 * 回测页面 — 策略管理
 *
 * 创建、编辑、启停、删除交易策略，配置技术指标组合。
 * 回测执行引擎开发中，后续迭代接入。
 */

import { useState, useCallback } from 'react'
import { Table, Button, Modal, Input, Select, Switch, Popconfirm, message, Space, Tag } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AimOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import apiClient from '../../services/api'
import type { StrategyItem, IndicatorConfig } from '../../types/strategy'
import { INDICATOR_PRESETS, INDICATOR_OPTIONS } from '../../types/strategy'

export default function BacktestPage() {
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
    } catch { /* 拦截器已提示 */ }
  }

  // ---- 删除 ----
  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/strategies/${id}`)
      message.success('已删除')
      fetchList(page)
    } catch { /* 拦截器已提示 */ }
  }

  // ---- 表格列 ----
  const columns: ColumnsType<StrategyItem> = [
    { title: '名称', dataIndex: 'name', width: 160 },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    {
      title: '指标',
      dataIndex: 'indicators',
      width: 260,
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
      <h1 className="text-2xl font-bold mb-4">
        <AimOutlined className="mr-2" />
        回测
      </h1>

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
