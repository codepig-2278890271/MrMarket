/**
 * 顶部导航栏
 * 品牌 Logo + 6 个等宽导航项 + 主题切换
 * 内容居中，与页面最大宽度对齐
 */

import { useLocation, useNavigate } from 'react-router-dom'
import { Tooltip } from 'antd'
import {
  BulbOutlined,
  StockOutlined,
  AimOutlined,
  StarOutlined,
  ReadOutlined,
  RobotOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons'

interface NavbarProps {
  isDark: boolean
  onToggleTheme: () => void
}

const NAV_ITEMS = [
  { key: '/market',          icon: <StockOutlined />, label: '市场行情' },
  { key: '/value-investing', icon: <BulbOutlined />,  label: '价值投资' },
  { key: '/watchlist',       icon: <StarOutlined />,  label: '自选股' },
  { key: '/backtest',        icon: <AimOutlined />,   label: '回测' },
  { key: '/ai',              icon: <RobotOutlined />, label: 'AI' },
  { key: '/news',            icon: <ReadOutlined />,  label: '资讯' },
]

export default function Navbar({ isDark, onToggleTheme }: NavbarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const activeKey = '/' + location.pathname.split('/')[1]

  return (
    <nav
      style={{
        height: 'var(--navbar-height)',
        backgroundColor: 'var(--navbar-bg)',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="flex items-center h-full"
        style={{
          maxWidth: 'var(--content-max-width)',
          margin: '0 auto',
          padding: '0 var(--content-padding)',
        }}
      >
        {/* ---- Logo ---- */}
        <span
          onClick={() => navigate('/market')}
          className="text-lg font-bold cursor-pointer select-none flex-shrink-0"
          style={{
            color: 'var(--color-primary)',
            letterSpacing: '-0.3px',
            marginRight: 32,
          }}
        >
          MrMarket
        </span>

        {/* ---- 导航菜单：6 项均等宽度 ---- */}
        <div className="flex items-center flex-1" style={{ height: '100%' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeKey === item.key
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.key)}
                className="flex items-center justify-center gap-1.5 text-sm font-medium border-none cursor-pointer"
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  height: '100%',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: 'transparent',
                  borderBottom: isActive
                    ? '2px solid var(--color-primary)'
                    : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* ---- 主题切换 ---- */}
        <Tooltip title={isDark ? '浅色模式' : '深色模式'}>
          <button
            onClick={onToggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer flex-shrink-0"
            style={{
              color: 'var(--text-secondary)',
              background: 'transparent',
              marginLeft: 24,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-app)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            {isDark ? <SunOutlined /> : <MoonOutlined />}
          </button>
        </Tooltip>
      </div>
    </nav>
  )
}
