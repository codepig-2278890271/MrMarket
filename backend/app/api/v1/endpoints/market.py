"""
行情查询端点
提供股票列表（含实时价格）、大盘概览、股票详情、日K线查询接口
"""

from datetime import date

from fastapi import APIRouter, Depends, Query
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_db
from app.api.v1.errors import NotFoundError
from app.api.v1.responses import APIResponse, PaginatedData
from app.models.stock_schema import (
    KLineResponse,
    MarketOverviewResponse,
    StockResponse,
    StockWithPriceResponse,
)
from app.services.market_service import MarketService

router = APIRouter(prefix="/stocks", tags=["行情查询"])


# ================================================================
# GET /stocks — 分页查询股票列表（含最新行情价格）
# ================================================================

SORT_CHOICES = ["code", "name", "change_pct", "volume", "amount"]

@router.get("")
async def list_stocks(
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    market: str | None = Query(default=None, pattern=r"^(SH|SZ|BJ)$", description="交易所筛选"),
    search: str | None = Query(default=None, min_length=1, max_length=50, description="模糊搜索（代码/名称）"),
    sort_by: str = Query(default="code", description=f"排序字段: {SORT_CHOICES}"),
    sort_order: str = Query(default="asc", pattern=r"^(asc|desc)$", description="排序方向"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询股票列表，自动附带最新交易日行情数据（价格、涨跌幅、成交量等）"""
    items, total = await MarketService.list_stocks_with_prices(
        db,
        page=page,
        page_size=page_size,
        market=market,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return APIResponse.ok(
        data=PaginatedData(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )
    )


# ================================================================
# GET /stocks/overview — 大盘概览
# ================================================================


@router.get("/overview")
async def market_overview(
    market: str | None = Query(default=None, pattern=r"^(SH|SZ|BJ)$", description="交易所筛选"),
    db: AsyncSession = Depends(get_db),
):
    """获取大盘概览：涨跌家数、平均涨跌幅、总成交额"""
    data = await MarketService.get_market_overview(db, market=market)
    # 获取最新交易日
    latest_date = None
    try:
        from sqlalchemy import func, select
        from app.models.stock import KLineDaily
        row = (await db.execute(select(func.max(KLineDaily.trade_date)))).scalar()
        latest_date = row.isoformat() if row else None
    except Exception:
        pass

    return APIResponse.ok(
        data={
            **data,
            "trade_date": latest_date,
        }
    )


# ================================================================
# GET /stocks/{code} — 查询单只股票详情
# ================================================================


@router.get("/{code}")
async def get_stock(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    """根据股票代码查询单只股票详情"""
    stock = await MarketService.get_stock(db, code)
    if stock is None:
        raise NotFoundError(f"股票 {code} 不存在")

    return APIResponse.ok(data=StockResponse.model_validate(stock))


# ================================================================
# GET /stocks/{code}/klines — 查询日K线（带 Redis 缓存）
# ================================================================


def _klines_cache_key(code: str, start_date: date | None, end_date: date | None) -> str:
    sd = start_date.isoformat() if start_date else "all"
    ed = end_date.isoformat() if end_date else "all"
    return f"klines:{code}:{sd}:{ed}"


@router.get("/{code}/klines")
async def get_klines(
    code: str,
    start_date: date | None = Query(default=None, description="起始日期（含），格式 YYYY-MM-DD"),
    end_date: date | None = Query(default=None, description="截止日期（含），格式 YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """查询某只股票的日K线数据（优先走 Redis 缓存），按日期降序返回"""

    cache_key = _klines_cache_key(code, start_date, end_date)
    try:
        from app.utils.redis import cache_get
        cached = await cache_get(cache_key)
        if cached is not None:
            logger.debug(f"📦 K线缓存命中: {cache_key}")
            return APIResponse.ok(data=cached)
    except Exception:
        pass

    stock = await MarketService.get_stock(db, code)
    if stock is None:
        raise NotFoundError(f"股票 {code} 不存在")

    rows, total = await MarketService.get_klines(
        db, code, start_date=start_date, end_date=end_date
    )

    kline_items = [KLineResponse.model_validate(k) for k in rows]
    result = PaginatedData(
        items=kline_items,
        total=total,
        page=1,
        page_size=max(total, 1),
    )

    try:
        from app.utils.redis import TTL_KLINE, cache_set
        await cache_set(cache_key, result.model_dump(), ttl=TTL_KLINE)
    except Exception:
        pass

    return APIResponse.ok(data=result)
