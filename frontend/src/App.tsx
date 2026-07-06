import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'

// 页面导入
import LoginPage from './pages/Login/LoginPage'
import NewsPage from './pages/News/NewsPage'
import MarketPage from './pages/Market/MarketPage'
import StrategyList from './pages/Strategy/StrategyList'
import BacktestPage from './pages/Backtest/BacktestPage'
import TradePage from './pages/Trade/TradePage'
import WatchlistPage from './pages/Watchlist/WatchlistPage'

/**
 * App 根组件
 *
 * 路由结构：
 *   /             → 登录页（默认首页）
 *   /market       → 行情
 *   /strategy     → 策略
 *   /backtest     → 回测
 *   /trade        → 模拟交易
 *   /watchlist    → 自选股
 *   /news         → 资讯
 *
 * 登录后进入 AppLayout 包裹的功能页面（侧栏+顶栏布局）
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 登录页 — 独立布局，无侧栏顶栏 */}
        <Route path="/" element={<LoginPage />} />

        {/* AppLayout 提供统一的侧栏+顶栏骨架，<Outlet /> 处渲染子路由 */}
        <Route element={<AppLayout />}>
          <Route path="news" element={<NewsPage />} />
          <Route path="market" element={<MarketPage />} />
          <Route path="strategy" element={<StrategyList />} />
          <Route path="backtest" element={<BacktestPage />} />
          <Route path="trade" element={<TradePage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
        </Route>

        {/* 未匹配路由 → 回到登录页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
