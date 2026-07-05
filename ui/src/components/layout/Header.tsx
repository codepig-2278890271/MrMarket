import { Input, Button, Tooltip } from 'antd'
import { SearchOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'

interface HeaderProps {
  /** 当前是否为深色模式 */
  isDark: boolean
  /** 切换深色模式的回调 */
  onToggleTheme: () => void
}

/**
 * 顶部栏
 * 功能：全局搜索（Cmd+K 唤起）、主题切换
 */
export default function Header({ isDark, onToggleTheme }: HeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-6"
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      {/* 左侧：全局搜索 */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <Input
          placeholder="搜索股票、策略...（⌘K）"
          prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
          style={{
            background: 'var(--bg-app)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* 右侧：功能按钮 */}
      <div className="flex items-center gap-2">
        {/* 主题切换按钮 */}
        <Tooltip title={isDark ? '切换浅色模式' : '切换深色模式'}>
          <Button
            type="text"
            icon={isDark ? <SunOutlined /> : <MoonOutlined />}
            onClick={onToggleTheme}
            style={{ color: 'var(--text-secondary)' }}
          />
        </Tooltip>
      </div>
    </div>
  )
}
