"""
策略路由
提供策略的 CRUD 和启停接口
"""

from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.strategy import Strategy
from app.schemas.strategy import (
    StrategyResponse,
    StrategyListResponse,
    StrategyCreateRequest,
    StrategyUpdateRequest,
    StrategyToggleRequest,
)

router = APIRouter(prefix="/strategies", tags=["策略"])


# ================================================================
# GET /strategies — 分页查询策略列表
# ================================================================

@router.get("", response_model=StrategyListResponse)
async def list_strategies(
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询策略列表，按更新时间降序"""
    count_stmt = select(func.count()).select_from(Strategy)
    total = (await db.execute(count_stmt)).scalar()

    data_stmt = (
        select(Strategy)
        .order_by(Strategy.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(data_stmt)).scalars().all()

    return StrategyListResponse(
        items=[StrategyResponse.model_validate(s) for s in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


# ================================================================
# POST /strategies — 创建策略
# ================================================================

@router.post("", response_model=StrategyResponse, status_code=201)
async def create_strategy(
    body: StrategyCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """创建新策略"""
    now = datetime.now()
    strategy = Strategy(
        name=body.name,
        description=body.description,
        indicators=[ind.model_dump() for ind in body.indicators],
        created_at=now,
        updated_at=now,
    )
    db.add(strategy)
    await db.commit()
    await db.refresh(strategy)
    return StrategyResponse.model_validate(strategy)


# ================================================================
# GET /strategies/{id} — 查询单个策略
# ================================================================

@router.get("/{strategy_id}", response_model=StrategyResponse)
async def get_strategy(
    strategy_id: int,
    db: AsyncSession = Depends(get_db),
):
    """查询单个策略详情"""
    result = await db.execute(select(Strategy).where(Strategy.id == strategy_id))
    strategy = result.scalar_one_or_none()
    if strategy is None:
        raise HTTPException(status_code=404, detail=f"策略 {strategy_id} 不存在")
    return StrategyResponse.model_validate(strategy)


# ================================================================
# PUT /strategies/{id} — 修改策略
# ================================================================

@router.put("/{strategy_id}", response_model=StrategyResponse)
async def update_strategy(
    strategy_id: int,
    body: StrategyUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """修改策略的名称、描述或指标配置"""
    result = await db.execute(select(Strategy).where(Strategy.id == strategy_id))
    strategy = result.scalar_one_or_none()
    if strategy is None:
        raise HTTPException(status_code=404, detail=f"策略 {strategy_id} 不存在")

    if body.name is not None:
        strategy.name = body.name
    if body.description is not None:
        strategy.description = body.description
    if body.indicators is not None:
        strategy.indicators = [ind.model_dump() for ind in body.indicators]
    strategy.updated_at = datetime.now()

    await db.commit()
    await db.refresh(strategy)
    return StrategyResponse.model_validate(strategy)


# ================================================================
# PATCH /strategies/{id}/toggle — 启停策略
# ================================================================

@router.patch("/{strategy_id}/toggle", response_model=StrategyResponse)
async def toggle_strategy(
    strategy_id: int,
    body: StrategyToggleRequest,
    db: AsyncSession = Depends(get_db),
):
    """启用或停用策略"""
    result = await db.execute(select(Strategy).where(Strategy.id == strategy_id))
    strategy = result.scalar_one_or_none()
    if strategy is None:
        raise HTTPException(status_code=404, detail=f"策略 {strategy_id} 不存在")

    strategy.enabled = body.enabled
    strategy.updated_at = datetime.now()
    await db.commit()
    await db.refresh(strategy)
    return StrategyResponse.model_validate(strategy)


# ================================================================
# DELETE /strategies/{id} — 删除策略
# ================================================================

@router.delete("/{strategy_id}", status_code=204)
async def delete_strategy(
    strategy_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除策略"""
    result = await db.execute(select(Strategy).where(Strategy.id == strategy_id))
    strategy = result.scalar_one_or_none()
    if strategy is None:
        raise HTTPException(status_code=404, detail=f"策略 {strategy_id} 不存在")

    await db.delete(strategy)
    await db.commit()
