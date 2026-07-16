"""
API v1 主路由
聚合所有 v1 端点
"""

from fastapi import APIRouter

from app.api.v1.endpoints.chat import router as chat_router
from app.api.v1.endpoints.market import router as market_router
from app.api.v1.endpoints.strategy import router as strategy_router
from app.api.v1.endpoints.watchlist import router as watchlist_router

router = APIRouter()
router.include_router(market_router)
router.include_router(watchlist_router)
router.include_router(strategy_router)
router.include_router(chat_router)
