/**
 * 策略主页
 * 「先定策略，再跑回测」— 两个子标签页统一入口
 */

import { useState } from 'react'
import { Tabs } from 'antd'
import { AimOutlined, HistoryOutlined } from '@ant-design/icons'
import StrategyList from './StrategyList'

/** 回测子页面（原 BacktestPage 内容） */
function BacktestPanel() {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      <HistoryOutlined style={{ fontSize: 48, color: 'var(--text-secondary)', marginBottom: 16 }} />
      <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>策略回测</h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        选择上方「我的策略」中已启用的策略，对其历史表现进行回测分析。
      </p>
    </div>
  )
}

const TAB_ITEMS = [
  {
    key: 'list',
    label: (
      <span className="flex items-center gap-1.5">
        <AimOutlined />
        我的策略
      </span>
    ),
    children: <StrategyList />,
  },
  {
    key: 'backtest',
    label: (
      <span className="flex items-center gap-1.5">
        <HistoryOutlined />
        回测
      </span>
    ),
    children: <BacktestPanel />,
  },
]

export default function StrategyPage() {
  const [activeTab, setActiveTab] = useState('list')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">🎯 策略</h1>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={TAB_ITEMS}
        size="large"
      />
    </div>
  )
}
