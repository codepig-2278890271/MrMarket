"""
路由包
"""

from app.routers.market import router as market_router
from app.routers.watchlist import router as watchlist_router

__all__ = ["market_router", "watchlist_router"]
