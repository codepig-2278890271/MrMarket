"""
自选股路由
提供自选股的增删改查接口
"""

from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.stock import Stock
from app.models.watchlist import Watchlist
from app.schemas.watchlist import (
    WatchlistItemResponse,
    WatchlistListResponse,
    WatchlistCreateRequest,
    WatchlistUpdateRequest,
)

router = APIRouter(prefix="/watchlist", tags=["自选股"])


# ================================================================
# GET /watchlist — 分页查询自选股列表
# ================================================================

@router.get("", response_model=WatchlistListResponse)
async def list_watchlist(
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询自选股列表，JOIN stocks 表返回股票名称和行业"""

    # 总数
    count_stmt = select(func.count()).select_from(Watchlist)
    total = (await db.execute(count_stmt)).scalar()

    # 分页数据（按添加时间降序，最新在前）
    data_stmt = (
        select(Watchlist)
        .order_by(Watchlist.added_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(data_stmt)).scalars().all()

    return WatchlistListResponse(
        items=[WatchlistItemResponse.from_orm_row(w) for w in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


# ================================================================
# POST /watchlist — 添加自选股
# ================================================================

@router.post("", response_model=WatchlistItemResponse, status_code=201)
async def add_to_watchlist(
    body: WatchlistCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """添加一只股票到自选"""

    # 1. 确认股票存在
    stock_result = await db.execute(
        select(Stock).where(Stock.code == body.stock_code)
    )
    stock = stock_result.scalar_one_or_none()
    if stock is None:
        raise HTTPException(status_code=404, detail=f"股票 {body.stock_code} 不存在")

    # 2. 确认未重复添加
    exists = await db.execute(
        select(Watchlist).where(Watchlist.stock_code == body.stock_code)
    )
    if exists.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail=f"股票 {body.stock_code} 已在自选中")

    # 3. 写入
    item = Watchlist(stock_code=body.stock_code, note=body.note, added_at=datetime.now())
    db.add(item)
    await db.commit()
    await db.refresh(item)

    # 手动加载关联的 stock（lazy="joined" 应已自动加载，保险起见 refresh 一下属性）
    return WatchlistItemResponse.from_orm_row(item)


# ================================================================
# PATCH /watchlist/{stock_code} — 修改备注
# ================================================================

@router.patch("/{stock_code}", response_model=WatchlistItemResponse)
async def update_watchlist_note(
    stock_code: str,
    body: WatchlistUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """修改自选股的备注"""
    result = await db.execute(
        select(Watchlist).where(Watchlist.stock_code == stock_code)
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail=f"自选股 {stock_code} 不存在")

    item.note = body.note
    await db.commit()
    await db.refresh(item)

    return WatchlistItemResponse.from_orm_row(item)


# ================================================================
# DELETE /watchlist/{stock_code} — 删除自选股
# ================================================================

@router.delete("/{stock_code}", status_code=204)
async def remove_from_watchlist(
    stock_code: str,
    db: AsyncSession = Depends(get_db),
):
    """从自选中移除一只股票"""
    result = await db.execute(
        select(Watchlist).where(Watchlist.stock_code == stock_code)
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail=f"自选股 {stock_code} 不存在")

    await db.delete(item)
    await db.commit()
