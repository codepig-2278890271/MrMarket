"""
行情查询端点
提供股票列表、股票详情、日K线查询接口（只读）
"""

from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_db
from app.models.stock import Stock, KLineDaily
from app.models.stock_schema import (
    StockResponse,
    KLineResponse,
    StocksListResponse,
    KLineListResponse,
)

router = APIRouter(prefix="/stocks", tags=["行情查询"])


# ================================================================
# GET /stocks — 分页查询股票列表
# ================================================================

@router.get("", response_model=StocksListResponse)
async def list_stocks(
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    market: str | None = Query(default=None, pattern=r"^(SH|SZ|BJ)$", description="交易所筛选"),
    search: str | None = Query(default=None, min_length=1, max_length=50, description="模糊搜索（代码/名称）"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询股票列表，支持按交易所筛选和模糊搜索"""

    conditions = []
    if market:
        conditions.append(Stock.market == market)
    if search:
        conditions.append(
            (Stock.code.ilike(f"%{search}%")) | (Stock.name.ilike(f"%{search}%"))
        )

    count_stmt = select(func.count()).select_from(Stock)
    if conditions:
        count_stmt = count_stmt.where(*conditions)
    total = (await db.execute(count_stmt)).scalar()

    data_stmt = select(Stock).order_by(Stock.code)
    if conditions:
        data_stmt = data_stmt.where(*conditions)
    data_stmt = data_stmt.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(data_stmt)).scalars().all()

    return StocksListResponse(
        items=[StockResponse.model_validate(s) for s in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


# ================================================================
# GET /stocks/{code} — 查询单只股票详情
# ================================================================

@router.get("/{code}", response_model=StockResponse)
async def get_stock(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    """根据股票代码查询单只股票详情"""
    result = await db.execute(select(Stock).where(Stock.code == code))
    stock = result.scalar_one_or_none()

    if stock is None:
        raise HTTPException(status_code=404, detail=f"股票 {code} 不存在")

    return StockResponse.model_validate(stock)


# ================================================================
# GET /stocks/{code}/klines — 查询日K线
# ================================================================

@router.get("/{code}/klines", response_model=KLineListResponse)
async def get_klines(
    code: str,
    start_date: date | None = Query(default=None, description="起始日期（含），格式 YYYY-MM-DD"),
    end_date: date | None = Query(default=None, description="截止日期（含），格式 YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """查询某只股票的日K线数据，支持日期范围筛选，按日期降序返回"""

    stock_result = await db.execute(select(Stock.code).where(Stock.code == code))
    if stock_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail=f"股票 {code} 不存在")

    conditions = [KLineDaily.stock_code == code]
    if start_date:
        conditions.append(KLineDaily.trade_date >= start_date)
    if end_date:
        conditions.append(KLineDaily.trade_date <= end_date)

    count_stmt = select(func.count()).select_from(KLineDaily).where(*conditions)
    total = (await db.execute(count_stmt)).scalar()

    data_stmt = (
        select(KLineDaily)
        .where(*conditions)
        .order_by(KLineDaily.trade_date.desc())
    )
    rows = (await db.execute(data_stmt)).scalars().all()

    return KLineListResponse(
        items=[KLineResponse.model_validate(k) for k in rows],
        total=total,
    )
