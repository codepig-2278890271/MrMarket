import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Layout, ConfigProvider, theme as antdTheme } from 'antd'
import Navbar from './Navbar'

const { Content } = Layout

/**
 * 应用主布局
 *
 * 结构：
 * ┌──────────────────────────────────────────────┐
 * │  Navbar（顶栏：Logo + 导航 + 主题切换）       │
 * ├──────────────────────────────────────────────┤
 * │                                              │
 * │              Content（页面内容区）              │
 * │                                              │
 * └──────────────────────────────────────────────┘
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
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1e40af',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        {/* 顶部导航栏 */}
        <Navbar isDark={isDark} onToggleTheme={toggleTheme} />

        {/* 页面内容 */}
        <Content
          style={{
            padding: 24,
            backgroundColor: 'var(--bg-app)',
            flex: 1,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </ConfigProvider>
  )
}
