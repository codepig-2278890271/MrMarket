import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'

// 页面导入
import LoginPage from './pages/Login/LoginPage'
import PhilosophyPage from './pages/Philosophy/PhilosophyPage'
import MarketPage from './pages/Market/MarketPage'
import StrategyPage from './pages/Strategy/StrategyPage'
import CommunityPage from './pages/Community/CommunityPage'
import NewsPage from './pages/News/NewsPage'

/**
 * App 根组件
 *
 * 路由结构：
 *   /             → 登录页（独立布局）
 *   /philosophy   → 投资理念
 *   /market       → 市场行情
 *   /strategy     → 策略 & 回测（标签页切换）
 *   /community    → 交流广场
 *   /news         → 资讯
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
          <Route path="philosophy" element={<PhilosophyPage />} />
          <Route path="market" element={<MarketPage />} />
          <Route path="strategy" element={<StrategyPage />} />
          <Route path="community" element={<CommunityPage />} />
          <Route path="news" element={<NewsPage />} />
        </Route>

        {/* 未匹配路由 → 回到登录页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
