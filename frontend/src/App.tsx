import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'

import LoginPage from './pages/Login/LoginPage'
import MarketPage from './pages/Market/MarketPage'
import ValueInvestingPage from './pages/ValueInvesting/ValueInvestingPage'
import WatchlistPage from './pages/Watchlist/WatchlistPage'
import BacktestPage from './pages/Backtest/BacktestPage'
import AIChatPage from './pages/AI/AIChatPage'
import NewsPage from './pages/News/NewsPage'

/**
 * App 根组件
 *
 * 路由结构：
 *   /                  → 登录页（独立布局）
 *   /market            → 市场行情
 *   /value-investing   → 价值投资（书籍、视频、语录、核心概念）
 *   /watchlist         → 自选股
 *   /backtest          → 回测（策略管理）
 *   /ai                → AI 投资助手
 *   /news              → 资讯（重大消息、财报日历）
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route element={<AppLayout />}>
          <Route path="market" element={<MarketPage />} />
          <Route path="value-investing" element={<ValueInvestingPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="backtest" element={<BacktestPage />} />
          <Route path="ai" element={<AIChatPage />} />
          <Route path="news" element={<NewsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
