import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Layout, ConfigProvider, theme as antdTheme } from 'antd'
import Sidebar from './Sidebar'
import Header from './Header'

const { Sider, Content } = Layout

/**
 * 应用主布局
 *
 * 结构：
 * ┌────────┬──────────────────────────────┐
 * │        │         Header (顶栏)         │
 * │ Sider  ├──────────────────────────────┤
 * │ (侧栏) │                              │
 * │        │     Content (页面内容区)       │
 * │        │                              │
 * └────────┴──────────────────────────────┘
 *
 * 移动端 (< 768px)：侧栏自动收起
 */
export default function AppLayout() {
  // 读取本地存储的主题偏好，默认浅色
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('mrmarket-theme')
    if (saved) return saved === 'dark'
    // 没有保存过则跟随系统
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // 主题切换时同步到 <html> 的 class 和 localStorage
  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('mrmarket-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => setIsDark((prev) => !prev)

  return (
    <ConfigProvider
      theme={{
        // Ant Design 5 内置暗色算法 — 根据 isDark 自动切换
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1e40af', // 品牌色
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        {/* 侧边导航栏 */}
        <Sider
          width={220}
          breakpoint="lg"
          collapsedWidth={0}
          trigger={null}
          style={{
            backgroundColor: 'var(--bg-sidebar)',
          }}
        >
          <Sidebar />
        </Sider>

        {/* 右侧：顶栏 + 内容区域 */}
        <Layout>
          {/* 顶部栏 */}
          <Header isDark={isDark} onToggleTheme={toggleTheme} />

          {/* 页面内容 */}
          <Content
            style={{
              padding: 24,
              backgroundColor: 'var(--bg-app)',
              minHeight: 'calc(100vh - var(--header-height))',
              overflow: 'auto',
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
