/**
 * 登录页面
 * 纯红绿两色配色，不引入任何其他颜色。
 * 点击「登录」后进入主应用。
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import quotesRaw from './quotes.txt?raw'

/** 红绿配色常量 — 全页面只有这两个色值 */
const RED = '#dc2626'
const GREEN = '#16a34a'
const RED_DARK = '#b91c1c'
const GREEN_DARK = '#15803d'

export default function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  // 从 quotes.txt 随机选一条，只在首次渲染时选取
  const [quote] = useState(() => {
    const quotes = quotesRaw
      .split('\n')
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
    return quotes[Math.floor(Math.random() * quotes.length)]
  })

  const handleLogin = () => {
    setLoading(true)
    // 模拟短暂延迟，让按钮有反馈感
    setTimeout(() => {
      navigate('/market', { replace: true })
    }, 400)
  }

  return (
    <div style={styles.container}>
      {/* 背景：上半红、下半绿 */}
      <div style={styles.bgTop} />
      <div style={styles.bgBottom} />

      {/* 登录卡片 */}
      <div style={styles.card}>
        {/* Logo 区 */}
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>
            <span style={{ ...styles.logoArrowUp, borderBottomColor: RED }} />
            <span style={{ ...styles.logoArrowDown, borderTopColor: GREEN }} />
          </div>
          <h1 style={styles.title}>
            <span style={{ color: GREEN }}>Mr</span>
            <span style={{ color: RED }}>Market</span>
          </h1>
          <p style={styles.subtitle}>市场先生</p>
        </div>

        {/* 分割线 */}
        <div style={styles.divider}>
          <span style={{ ...styles.dividerLine, background: RED }} />
          <span style={{ ...styles.dividerDot, background: RED }} />
          <span style={{ ...styles.dividerDot, background: GREEN }} />
          <span style={{ ...styles.dividerLine, background: GREEN }} />
        </div>

        {/* 随机标语 */}
        <p style={styles.tagline}>
          {quote}
        </p>

        {/* 登录按钮 */}
        <button
          style={{
            ...styles.loginBtn,
            background: loading ? RED : GREEN,
            borderColor: loading ? RED_DARK : GREEN_DARK,
          }}
          onClick={handleLogin}
          disabled={loading}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = RED
            e.currentTarget.style.borderColor = RED_DARK
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = loading ? RED : GREEN
            e.currentTarget.style.borderColor = GREEN_DARK
          }}
        >
          {loading ? '进入中...' : '登  录'}
        </button>

        {/* 底部提示 */}
        <p style={styles.footer}>
          <span style={{ color: RED }}>A 股</span>
          <span style={{ color: RED }}> 价值投资辅助分析工具</span>
        </p>
      </div>
    </div>
  )
}

// ================================================================
// 样式 — 全部内联，不使用 CSS 文件，保证零颜色泄漏
// ================================================================

const styles: Record<string, React.CSSProperties> = {
  // 全屏容器
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    background: RED,  // 兜底：防止 body 背景色透过
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
  },

  // 上半红色背景
  bgTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '55%',
    background: `linear-gradient(180deg, ${RED_DARK} 0%, ${RED} 100%)`,
    zIndex: 0,
  },

  // 下半绿色背景
  bgBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: '45%',
    background: `linear-gradient(180deg, ${GREEN} 0%, ${GREEN_DARK} 100%)`,
    zIndex: 0,
  },

  // 登录卡片
  card: {
    position: 'relative',
    zIndex: 1,
    width: 400,
    maxWidth: '90vw',
    padding: '48px 40px',
    borderRadius: 16,
    background: '#f0fdf4',  // 极浅绿（绿色系）
    boxShadow: `0 8px 40px rgba(0,0,0,0.25)`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
  },

  // Logo 区域
  logoArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },

  // 红绿箭头图标
  logoIcon: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },

  logoArrowUp: {
    display: 'inline-block',
    width: 0,
    height: 0,
    borderLeft: '16px solid transparent',
    borderRight: '16px solid transparent',
    borderBottom: '20px solid',
  },

  logoArrowDown: {
    display: 'inline-block',
    width: 0,
    height: 0,
    borderLeft: '16px solid transparent',
    borderRight: '16px solid transparent',
    borderTop: '20px solid',
  },

  // 标题
  title: {
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: 2,
    margin: 0,
  },

  subtitle: {
    fontSize: 14,
    color: GREEN,
    margin: 0,
  },

  // 分割线
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },

  dividerLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },

  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
  },

  // 标语
  tagline: {
    fontSize: 14,
    fontStyle: 'italic',
    color: RED,
    margin: 0,
  },

  // 登录按钮
  loginBtn: {
    width: '100%',
    padding: '12px 0',
    fontSize: 18,
    fontWeight: 700,
    color: '#ffffff',
    border: '2px solid',
    borderRadius: 8,
    cursor: 'pointer',
    letterSpacing: 4,
    transition: 'background 0.2s, border-color 0.2s',
    outline: 'none',
  },

  // 底部文字
  footer: {
    fontSize: 12,
    margin: 0,
  },
}
