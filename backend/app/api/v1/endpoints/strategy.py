"""
策略端点
提供策略的 CRUD 和启停接口
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_db
from app.api.v1.responses import APIResponse, PaginatedData
from app.models.strategy_schema import (
    StrategyCreateRequest,
    StrategyResponse,
    StrategyToggleRequest,
    StrategyUpdateRequest,
)
from app.services.strategy_service import StrategyService

router = APIRouter(prefix="/strategies", tags=["策略"])


# ================================================================
# GET /strategies — 分页查询策略列表
# ================================================================

@router.get("")
async def list_strategies(
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询策略列表，按更新时间降序"""
    rows, total = await StrategyService.list_strategies(db, page=page, page_size=page_size)
    return APIResponse.ok(
        data=PaginatedData(
            items=[StrategyResponse.model_validate(s) for s in rows],
            total=total,
            page=page,
            page_size=page_size,
        )
    )


# ================================================================
# POST /strategies — 创建策略
# ================================================================

@router.post("", status_code=201)
async def create_strategy(
    body: StrategyCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """创建新策略"""
    strategy = await StrategyService.create_strategy(db, body)
    return APIResponse.ok(data=StrategyResponse.model_validate(strategy))


# ================================================================
# GET /strategies/{id} — 查询单个策略
# ================================================================

@router.get("/{strategy_id}")
async def get_strategy(
    strategy_id: int,
    db: AsyncSession = Depends(get_db),
):
    """查询单个策略详情"""
    strategy = await StrategyService.get_strategy(db, strategy_id)
    return APIResponse.ok(data=StrategyResponse.model_validate(strategy))


# ================================================================
# PUT /strategies/{id} — 修改策略
# ================================================================

@router.put("/{strategy_id}")
async def update_strategy(
    strategy_id: int,
    body: StrategyUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """修改策略的名称、描述或指标配置"""
    strategy = await StrategyService.update_strategy(db, strategy_id, body)
    return APIResponse.ok(data=StrategyResponse.model_validate(strategy))


# ================================================================
# PATCH /strategies/{id}/toggle — 启停策略
# ================================================================

@router.patch("/{strategy_id}/toggle")
async def toggle_strategy(
    strategy_id: int,
    body: StrategyToggleRequest,
    db: AsyncSession = Depends(get_db),
):
    """启用或停用策略"""
    strategy = await StrategyService.toggle_strategy(db, strategy_id, body.enabled)
    return APIResponse.ok(data=StrategyResponse.model_validate(strategy))


# ================================================================
# DELETE /strategies/{id} — 删除策略
# ================================================================

@router.delete("/{strategy_id}", status_code=204)
async def delete_strategy(
    strategy_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除策略"""
    await StrategyService.delete_strategy(db, strategy_id)
