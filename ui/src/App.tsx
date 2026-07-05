import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'

// 页面导入 — 按一级菜单
import NewsPage from './pages/News/NewsPage'
import MarketPage from './pages/Market/MarketPage'
import StrategyList from './pages/Strategy/StrategyList'
import BacktestPage from './pages/Backtest/BacktestPage'
import TradePage from './pages/Trade/TradePage'
import WatchlistPage from './pages/Watchlist/WatchlistPage'

/**
 * App 根组件
 *
 * 路由结构（与 PRD 一级菜单对应）：
 *   /             → 重定向到 /market（行情为默认首页）
 *   /news         → 资讯
 *   /market       → 行情
 *   /strategy     → 策略
 *   /backtest     → 回测
 *   /trade        → 模拟交易
 *   /watchlist    → 自选股
 *
 * 所有页面包裹在 AppLayout 中，共享侧栏+顶栏布局
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* AppLayout 提供统一的侧栏+顶栏骨架，<Outlet /> 处渲染子路由 */}
        <Route element={<AppLayout />}>
          {/* 默认首页 → 行情 */}
          <Route index element={<Navigate to="/market" replace />} />

          {/* 六大一级菜单 */}
          <Route path="news" element={<NewsPage />} />
          <Route path="market" element={<MarketPage />} />
          <Route path="strategy" element={<StrategyList />} />
          <Route path="backtest" element={<BacktestPage />} />
          <Route path="trade" element={<TradePage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
