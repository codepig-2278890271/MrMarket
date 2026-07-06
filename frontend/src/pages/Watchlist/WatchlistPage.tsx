/**
 * 自选股页面
 * 添加/删除自选股、查看列表、修改备注
 */
import { useState, useCallback } from 'react'
import { Input, Button, Table, Popconfirm, Modal, message, Space, Tag } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import apiClient from '../../services/api'
import type { WatchlistItem } from '../../types/watchlist'

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  // 添加
  const [addCode, setAddCode] = useState('')
  const [adding, setAdding] = useState(false)

  // 修改备注
  const [editItem, setEditItem] = useState<WatchlistItem | null>(null)
  const [editNote, setEditNote] = useState('')

  // ---- 加载自选列表 ----
  const fetchList = useCallback(async (p = 1, ps = 20) => {
    setLoading(true)
    try {
      const res = await apiClient.get('/watchlist', { params: { page: p, page_size: ps } })
      setItems(res.data.items)
      setTotal(res.data.total)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [])

  // ---- 添加自选 ----
  const handleAdd = async () => {
    const code = addCode.trim()
    if (!code) return
    setAdding(true)
    try {
      await apiClient.post('/watchlist', { stock_code: code })
      message.success(`已添加 ${code}`)
      setAddCode('')
      fetchList(page)
    } catch {
      // 错误已在拦截器中提示
    } finally {
      setAdding(false)
    }
  }

  // ---- 删除自选 ----
  const handleDelete = async (code: string) => {
    try {
      await apiClient.delete(`/watchlist/${code}`)
      message.success(`已移除 ${code}`)
      fetchList(page)
    } catch {
      // 错误已在拦截器中提示
    }
  }

  // ---- 修改备注 ----
  const handleSaveNote = async () => {
    if (!editItem) return
    try {
      await apiClient.patch(`/watchlist/${editItem.stock_code}`, { note: editNote })
      message.success('备注已更新')
      setEditItem(null)
      fetchList(page)
    } catch {
      // 错误已在拦截器中提示
    }
  }

  // ---- 表格列 ----
  const columns: ColumnsType<WatchlistItem> = [
    {
      title: '代码',
      dataIndex: 'stock_code',
      width: 100,
      render: (code: string, rec) => (
        <span>
          {code}
          {rec.is_st && <Tag color="red" style={{ marginLeft: 4 }}>ST</Tag>}
        </span>
      ),
    },
    { title: '名称', dataIndex: 'stock_name', width: 120 },
    { title: '市场', dataIndex: 'market', width: 60, render: (m: string) => ({ SH: '沪', SZ: '深', BJ: '京' }[m] || m) },
    { title: '行业', dataIndex: 'industry', ellipsis: true },
    { title: '备注', dataIndex: 'note', ellipsis: true },
    {
      title: '添加时间',
      dataIndex: 'added_at',
      width: 180,
      render: (t: string) => t?.split('T')[0],
    },
    {
      title: '操作',
      width: 140,
      render: (_, rec) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => { setEditItem(rec); setEditNote(rec.note || '') }}
          />
          <Popconfirm
            title="确认移除？"
            onConfirm={() => handleDelete(rec.stock_code)}
          >
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
      <h1 className="text-2xl font-bold mb-4">⭐ 自选股</h1>

      {/* 添加栏 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Input
          placeholder="输入股票代码，如 600519"
          value={addCode}
          onChange={(e) => setAddCode(e.target.value)}
          onPressEnter={handleAdd}
          style={{ maxWidth: 240 }}
        />
        <Button type="primary" icon={<PlusOutlined />} loading={adding} onClick={handleAdd}>
          添加
        </Button>
      </div>

      {/* 自选列表 */}
      <Table<WatchlistItem>
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          showTotal: (t) => `共 ${t} 只自选`,
          onChange: (p) => fetchList(p),
        }}
        scroll={{ x: 700 }}
        size="middle"
      />

      {/* 修改备注 Modal */}
      <Modal
        title={`修改备注 — ${editItem?.stock_name || ''}`}
        open={!!editItem}
        onOk={handleSaveNote}
        onCancel={() => setEditItem(null)}
        okText="保存"
        cancelText="取消"
      >
        <Input.TextArea
          value={editNote}
          onChange={(e) => setEditNote(e.target.value)}
          placeholder="添加备注..."
          rows={3}
        />
      </Modal>
    </div>
  )
}
