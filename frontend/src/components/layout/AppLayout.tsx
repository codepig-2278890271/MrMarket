import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Layout, ConfigProvider, theme as antdTheme } from 'antd'
import Navbar from './Navbar'

const { Content } = Layout

/**
 * 应用主布局
 *
 * ┌──────────────────────────────────────────────┐
 * │  Navbar（顶栏：Logo + 导航 + 主题切换）       │
 * ├──────────────────────────────────────────────┤
 * │                                              │
 * │         Content（max-width 居中 + 留白）        │
 * │                                              │
 * └──────────────────────────────────────────────┘
 */
export default function AppLayout() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('mrmarket-theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

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
          borderRadius: 8,
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>
        {/* 顶部导航栏 */}
        <Navbar isDark={isDark} onToggleTheme={toggleTheme} />

        {/* 页面内容 — 居中 + 两侧留白 */}
        <Content
          style={{
            flex: 1,
            maxWidth: 'var(--content-max-width)',
            margin: '0 auto',
            padding: '32px var(--content-padding) 64px',
            width: '100%',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </ConfigProvider>
  )
}
