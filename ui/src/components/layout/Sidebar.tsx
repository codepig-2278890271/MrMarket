import { useLocation, useNavigate } from 'react-router-dom'
import { Menu } from 'antd'
import type { MenuProps } from 'antd'
import {
  ReadOutlined,     // 资讯
  StockOutlined,    // 行情
  AimOutlined,      // 策略
  HistoryOutlined,  // 回测
  DollarOutlined,   // 模拟交易
  StarOutlined,     // 自选股
} from '@ant-design/icons'

/**
 * 侧边导航栏
 * 一级菜单按 PRD 定义：资讯、行情、策略、回测、模拟交易、自选股
 */

// 菜单项配置 — 集中管理，后续新增菜单只需改这里
const menuItems: MenuProps['items'] = [
  {
    key: '/news',
    icon: <ReadOutlined />,
    label: '资讯',
  },
  {
    key: '/market',
    icon: <StockOutlined />,
    label: '行情',
  },
  {
    key: '/strategy',
    icon: <AimOutlined />,
    label: '策略',
  },
  {
    key: '/backtest',
    icon: <HistoryOutlined />,
    label: '回测',
  },
  {
    key: '/trade',
    icon: <DollarOutlined />,
    label: '模拟交易',
  },
  {
    key: '/watchlist',
    icon: <StarOutlined />,
    label: '自选股',
  },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  // 根据当前路径确定选中的菜单项
  // 例如 /market/600519 → selectedKey 应为 '/market'
  const selectedKey = '/' + location.pathname.split('/')[1]

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
      {/* Logo 区域 */}
      <div
        className="flex items-center gap-2 px-5"
        style={{ height: 'var(--header-height)', minHeight: 'var(--header-height)' }}
      >
        <span className="text-xl font-bold" style={{ color: '#fff' }}>
          MrMarket
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: '#94a3b8', background: '#334155' }}>
          BETA
        </span>
      </div>

      {/* 导航菜单 */}
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={handleClick}
        style={{
          background: 'transparent',
          borderInlineEnd: 'none',
          color: 'var(--text-sidebar)',
        }}
        theme="dark"
      />

      {/* 底部占位 — 未来可放版本号或设置入口 */}
      <div className="mt-auto px-5 pb-4">
        <p className="text-xs" style={{ color: '#475569' }}>
          v0.1.0
        </p>
      </div>
    </div>
  )
}
