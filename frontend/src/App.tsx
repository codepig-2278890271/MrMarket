import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'

// 页面导入
import LoginPage from './pages/Login/LoginPage'
import ValueInvestingPage from './pages/ValueInvesting/ValueInvestingPage'
import MarketPage from './pages/Market/MarketPage'
import WatchlistPage from './pages/Watchlist/WatchlistPage'
import BacktestPage from './pages/Backtest/BacktestPage'
import NewsPage from './pages/News/NewsPage'

/**
 * App 根组件
 *
 * 路由结构：
 *   /                  → 登录页（独立布局）
 *   /market            → 市场行情（A股/美股/港股/韩股/日经）
 *   /value-investing   → 价值投资（经典语录、书籍、访谈视频）
 *   /watchlist         → 自选股
 *   /backtest          → 回测（策略管理 + 回测执行）
 *   /news              → 资讯（重大消息、热点、财报）
 *
 * 登录后进入 AppLayout 包裹的功能页面（顶栏导航 + 内容区）
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 登录页 — 独立布局 */}
        <Route path="/" element={<LoginPage />} />

        {/* AppLayout 提供顶栏导航骨架，<Outlet /> 渲染子路由 */}
        <Route element={<AppLayout />}>
          <Route path="market" element={<MarketPage />} />
          <Route path="value-investing" element={<ValueInvestingPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="backtest" element={<BacktestPage />} />
          <Route path="news" element={<NewsPage />} />
        </Route>

        {/* 未匹配路由 → 回到登录页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
