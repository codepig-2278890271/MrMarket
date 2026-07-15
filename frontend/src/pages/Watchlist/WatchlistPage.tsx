/**
 * 自选股页面
 *
 * 管理自选股列表 — 添加、删除、编辑备注、查看行情
 */
import { useState, useCallback } from 'react'
import { Table, Button, Modal, Input, Popconfirm, Tag, Empty, message } from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  StarFilled,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import apiClient from '../../services/api'
import type { WatchlistItem } from '../../types/watchlist'

/** 市场中文映射 */
const MARKET_LABELS: Record<string, string> = { SH: '沪', SZ: '深', BJ: '京' }

export default function WatchlistPage() {
  // ---- 列表状态 ----
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(false)

  // ---- 添加弹窗 ----
  const [addOpen, setAddOpen] = useState(false)
  const [addCode, setAddCode] = useState('')
  const [addNote, setAddNote] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // ---- 编辑备注弹窗 ----
  const [editOpen, setEditOpen] = useState(false)
  const [editCode, setEditCode] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // ---- 加载列表 ----
  const fetchItems = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await apiClient.get('/watchlist', { params: { page: p, page_size: pageSize } })
      setItems(res.data.items)
      setTotal(res.data.total)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  // ---- 添加自选 ----
  const handleAdd = async () => {
    const code = addCode.trim()
    if (!code) {
      message.warning('请输入股票代码')
      return
    }
    setAddLoading(true)
    try {
      await apiClient.post('/watchlist', { stock_code: code, note: addNote.trim() || undefined })
      message.success(`已添加 ${code} 到自选股`)
      setAddOpen(false)
      setAddCode('')
      setAddNote('')
      fetchItems(1)
    } catch {
      // 错误已由拦截器提示
    } finally {
      setAddLoading(false)
    }
  }

  // ---- 删除自选 ----
  const handleDelete = async (stockCode: string) => {
    try {
      await apiClient.delete(`/watchlist/${stockCode}`)
      message.success('已从自选中移除')
      fetchItems(page)
    } catch {
      // 错误已由拦截器提示
    }
  }

  // ---- 编辑备注 ----
  const openEditModal = (item: WatchlistItem) => {
    setEditCode(item.stock_code)
    setEditNote(item.note || '')
    setEditOpen(true)
  }

  const handleEditSave = async () => {
    setEditLoading(true)
    try {
      await apiClient.patch(`/watchlist/${editCode}`, { note: editNote.trim() || '' })
      message.success('备注已更新')
      setEditOpen(false)
      setEditCode('')
      setEditNote('')
      fetchItems(page)
    } catch {
      // 错误已由拦截器提示
    } finally {
      setEditLoading(false)
    }
  }

  // ---- 表格列 ----
  const columns: ColumnsType<WatchlistItem> = [
    {
      title: '代码',
      dataIndex: 'stock_code',
      width: 110,
      render: (code: string, rec: WatchlistItem) => (
        <span>
          <StarFilled style={{ color: '#d4a017', marginRight: 6, fontSize: 12 }} />
          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{code}</span>
          {rec.is_st && <Tag color="red" style={{ marginLeft: 4 }}>ST</Tag>}
        </span>
      ),
    },
    { title: '名称', dataIndex: 'stock_name', width: 100 },
    {
      title: '市场',
      dataIndex: 'market',
      width: 60,
      render: (m: string) => MARKET_LABELS[m] || m,
    },
    { title: '行业', dataIndex: 'industry', ellipsis: true },
    {
      title: '备注',
      dataIndex: 'note',
      ellipsis: true,
      render: (note: string | null) => (
        <span style={{ color: note ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {note || '—'}
        </span>
      ),
    },
    {
      title: '添加时间',
      dataIndex: 'added_at',
      width: 180,
      render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '—',
    },
    {
      title: '操作',
      width: 140,
      render: (_: any, record: WatchlistItem) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            备注
          </Button>
          <Popconfirm
            title="确定移除该自选股？"
            onConfirm={() => handleDelete(record.stock_code)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ]

  // ---- 首次加载 ----
  const [initialized, setInitialized] = useState(false)
  if (!initialized) {
    setInitialized(true)
    fetchItems(1)
  }

  return (
    <div>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">⭐ 自选股</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddOpen(true)}
          style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
        >
          添加自选
        </Button>
      </div>

      {/* 表格 */}
      <Table<WatchlistItem>
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        locale={{ emptyText: <Empty description="暂无自选股，点击「添加自选」开始" /> }}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: (t) => `共 ${t} 只`,
          showSizeChanger: false,
          onChange: (p) => fetchItems(p),
        }}
        scroll={{ x: 800 }}
        size="middle"
      />

      {/* 添加弹窗 */}
      <Modal
        title="添加自选股"
        open={addOpen}
        onOk={handleAdd}
        onCancel={() => { setAddOpen(false); setAddCode(''); setAddNote('') }}
        confirmLoading={addLoading}
        okText="添加"
        cancelText="取消"
      >
        <div className="flex flex-col gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              股票代码 <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <Input
              placeholder="例如：600519"
              value={addCode}
              onChange={(e) => setAddCode(e.target.value.toUpperCase())}
              onPressEnter={handleAdd}
              maxLength={10}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              备注（选填）
            </label>
            <Input.TextArea
              placeholder="自定义备注..."
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
              rows={2}
              maxLength={200}
            />
          </div>
        </div>
      </Modal>

      {/* 编辑备注弹窗 */}
      <Modal
        title={`编辑备注 — ${editCode}`}
        open={editOpen}
        onOk={handleEditSave}
        onCancel={() => { setEditOpen(false); setEditCode(''); setEditNote('') }}
        confirmLoading={editLoading}
        okText="保存"
        cancelText="取消"
      >
        <div className="mt-4">
          <Input.TextArea
            placeholder="输入备注..."
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            rows={3}
            maxLength={200}
          />
        </div>
      </Modal>
    </div>
  )
}
