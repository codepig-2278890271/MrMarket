/**
 * 顶部导航栏
 * 品牌 Logo + 5 个导航项 + 主题切换
 */

import { useLocation, useNavigate } from 'react-router-dom'
import { Tooltip } from 'antd'
import {
  BulbOutlined,
  StockOutlined,
  AimOutlined,
  TeamOutlined,
  ReadOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons'

interface NavbarProps {
  isDark: boolean
  onToggleTheme: () => void
}

/** 导航项配置（策略 & 回测合并为一个入口） */
const NAV_ITEMS = [
  { key: '/philosophy', icon: <BulbOutlined />, label: '投资理念' },
  { key: '/market',     icon: <StockOutlined />, label: '市场行情' },
  { key: '/strategy',   icon: <AimOutlined />,   label: '策略 & 回测' },
  { key: '/community',  icon: <TeamOutlined />,  label: '交流广场' },
  { key: '/news',       icon: <ReadOutlined />,  label: '资讯' },
]

export default function Navbar({ isDark, onToggleTheme }: NavbarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  // 当前激活的路由
  const activeKey = '/' + location.pathname.split('/')[1]

  return (
    <nav
      className="flex items-center justify-between px-6"
      style={{
        height: 'var(--navbar-height)',
        minHeight: 'var(--navbar-height)',
        backgroundColor: 'var(--navbar-bg)',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
      }}
    >
      {/* ---- 左侧：Logo ---- */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="text-lg font-bold cursor-pointer select-none"
          style={{ color: 'var(--color-primary)' }}
          onClick={() => navigate('/market')}
        >
          MrMarket
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded select-none"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-app)' }}
        >
          BETA
        </span>
      </div>

      {/* ---- 中间：导航菜单 ---- */}
      <div className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeKey === item.key
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors border-none cursor-pointer"
              style={{
                color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--color-primary-bg)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-primary)'
                  e.currentTarget.style.background = 'var(--bg-app)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-secondary)'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* ---- 右侧：主题切换 ---- */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Tooltip title={isDark ? '切换浅色模式' : '切换深色模式'}>
          <button
            onClick={onToggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-md border-none cursor-pointer transition-colors"
            style={{
              color: 'var(--text-secondary)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-app)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            {isDark ? <SunOutlined /> : <MoonOutlined />}
          </button>
        </Tooltip>
      </div>
    </nav>
  )
}
