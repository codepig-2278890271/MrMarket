"""
数据结构包 — ORM 模型 + Pydantic Schema
导入所有模型，确保 Base.metadata 能找到表；同时导出 API 请求/响应结构
"""

# ---- ORM 模型 ----
from app.models.stock import Stock, KLineDaily
from app.models.watchlist import Watchlist
from app.models.strategy import Strategy

# ---- Pydantic Schema ----
from app.models.stock_schema import StockResponse, KLineResponse, StocksListResponse, KLineListResponse
from app.models.watchlist_schema import (
    WatchlistItemResponse,
    WatchlistListResponse,
    WatchlistCreateRequest,
    WatchlistUpdateRequest,
)
from app.models.strategy_schema import (
    StrategyResponse,
    StrategyListResponse,
    StrategyCreateRequest,
    StrategyUpdateRequest,
    StrategyToggleRequest,
    IndicatorConfig,
)

__all__ = [
    # ORM
    "Stock", "KLineDaily", "Watchlist", "Strategy",
    # Stock schemas
    "StockResponse", "KLineResponse", "StocksListResponse", "KLineListResponse",
    # Watchlist schemas
    "WatchlistItemResponse", "WatchlistListResponse",
    "WatchlistCreateRequest", "WatchlistUpdateRequest",
    # Strategy schemas
    "StrategyResponse", "StrategyListResponse",
    "StrategyCreateRequest", "StrategyUpdateRequest", "StrategyToggleRequest",
    "IndicatorConfig",
]
