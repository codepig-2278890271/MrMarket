"""
自选股端点
提供自选股的增删改查接口
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_db
from app.api.v1.responses import APIResponse, PaginatedData
from app.models.watchlist_schema import (
    WatchlistCreateRequest,
    WatchlistItemResponse,
    WatchlistUpdateRequest,
)
from app.services.watchlist_service import WatchlistService

router = APIRouter(prefix="/watchlist", tags=["自选股"])


# ================================================================
# GET /watchlist — 分页查询自选股列表
# ================================================================

@router.get("")
async def list_watchlist(
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询自选股列表，JOIN stocks 表返回股票名称和行业"""
    rows, total = await WatchlistService.list_items(db, page=page, page_size=page_size)
    return APIResponse.ok(
        data=PaginatedData(
            items=[WatchlistItemResponse.from_orm_row(w) for w in rows],
            total=total,
            page=page,
            page_size=page_size,
        )
    )


# ================================================================
# POST /watchlist — 添加自选股
# ================================================================

@router.post("", status_code=201)
async def add_to_watchlist(
    body: WatchlistCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """添加一只股票到自选"""
    item = await WatchlistService.add_item(db, body.stock_code, body.note)
    return APIResponse.ok(data=WatchlistItemResponse.from_orm_row(item))


# ================================================================
# PATCH /watchlist/{stock_code} — 修改备注
# ================================================================

@router.patch("/{stock_code}")
async def update_watchlist_note(
    stock_code: str,
    body: WatchlistUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """修改自选股的备注"""
    item = await WatchlistService.update_note(db, stock_code, body.note)
    return APIResponse.ok(data=WatchlistItemResponse.from_orm_row(item))


# ================================================================
# DELETE /watchlist/{stock_code} — 删除自选股
# ================================================================

@router.delete("/{stock_code}", status_code=204)
async def remove_from_watchlist(
    stock_code: str,
    db: AsyncSession = Depends(get_db),
):
    """从自选中移除一只股票"""
    await WatchlistService.remove_item(db, stock_code)
