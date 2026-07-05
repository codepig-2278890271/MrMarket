"""
路由包
"""

from app.routers.market import router as market_router
from app.routers.watchlist import router as watchlist_router
from app.routers.strategy import router as strategy_router

__all__ = ["market_router", "watchlist_router", "strategy_router"]
