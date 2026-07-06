"""
行情查询端点
提供股票列表、股票详情、日K线查询接口（只读）
K线查询使用 Redis cache-aside 策略加速
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
    StockResponse,
)
from app.services.market_service import MarketService

router = APIRouter(prefix="/stocks", tags=["行情查询"])


# ================================================================
# GET /stocks — 分页查询股票列表
# ================================================================


@router.get("")
async def list_stocks(
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    market: str | None = Query(default=None, pattern=r"^(SH|SZ|BJ)$", description="交易所筛选"),
    search: str | None = Query(default=None, min_length=1, max_length=50, description="模糊搜索（代码/名称）"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询股票列表，支持按交易所筛选和模糊搜索"""
    rows, total = await MarketService.list_stocks(
        db, page=page, page_size=page_size, market=market, search=search
    )
    return APIResponse.ok(
        data=PaginatedData(
            items=[StockResponse.model_validate(s) for s in rows],
            total=total,
            page=page,
            page_size=page_size,
        )
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
    """生成 K 线缓存 key"""
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

    # 1. 尝试从 Redis 缓存读取
    cache_key = _klines_cache_key(code, start_date, end_date)
    try:
        from app.utils.redis import cache_get
        cached = await cache_get(cache_key)
        if cached is not None:
            logger.debug(f"📦 K线缓存命中: {cache_key}")
            return APIResponse.ok(data=cached)
    except Exception:
        pass  # Redis 不可用时静默跳过

    # 2. 验证股票存在
    stock = await MarketService.get_stock(db, code)
    if stock is None:
        raise NotFoundError(f"股票 {code} 不存在")

    # 3. 从数据库查询
    rows, total = await MarketService.get_klines(
        db, code, start_date=start_date, end_date=end_date
    )

    # 4. 构建响应
    kline_items = [KLineResponse.model_validate(k) for k in rows]
    result = PaginatedData(
        items=kline_items,
        total=total,
        page=1,
        page_size=max(total, 1),
    )

    # 5. 写入 Redis 缓存（5 分钟 TTL）
    try:
        from app.utils.redis import TTL_KLINE, cache_set
        # 序列化为 dict 存入缓存
        await cache_set(cache_key, result.model_dump(), ttl=TTL_KLINE)
    except Exception:
        pass

    return APIResponse.ok(data=result)
