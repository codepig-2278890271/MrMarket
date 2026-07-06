"""
策略服务
提供策略的创建、编辑、启停、删除业务逻辑
"""

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.errors import NotFoundError
from app.models.strategy import Strategy
from app.models.strategy_schema import (
    StrategyCreateRequest,
    StrategyUpdateRequest,
)


class StrategyService:
    """策略业务逻辑"""

    @staticmethod
    async def list_strategies(
        db: AsyncSession,
        *,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Strategy], int]:
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

        return list(rows), total

    @staticmethod
    async def get_strategy(db: AsyncSession, strategy_id: int) -> Strategy:
        """查询单个策略"""
        result = await db.execute(select(Strategy).where(Strategy.id == strategy_id))
        strategy = result.scalar_one_or_none()
        if strategy is None:
            raise NotFoundError(f"策略 {strategy_id} 不存在")
        return strategy

    @staticmethod
    async def create_strategy(db: AsyncSession, body: StrategyCreateRequest) -> Strategy:
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
        return strategy

    @staticmethod
    async def update_strategy(db: AsyncSession, strategy_id: int, body: StrategyUpdateRequest) -> Strategy:
        """修改策略的名称、描述或指标配置"""
        result = await db.execute(select(Strategy).where(Strategy.id == strategy_id))
        strategy = result.scalar_one_or_none()
        if strategy is None:
            raise NotFoundError(f"策略 {strategy_id} 不存在")

        if body.name is not None:
            strategy.name = body.name
        if body.description is not None:
            strategy.description = body.description
        if body.indicators is not None:
            strategy.indicators = [ind.model_dump() for ind in body.indicators]
        strategy.updated_at = datetime.now()

        await db.commit()
        await db.refresh(strategy)
        return strategy

    @staticmethod
    async def toggle_strategy(db: AsyncSession, strategy_id: int, enabled: bool) -> Strategy:
        """启用或停用策略"""
        result = await db.execute(select(Strategy).where(Strategy.id == strategy_id))
        strategy = result.scalar_one_or_none()
        if strategy is None:
            raise NotFoundError(f"策略 {strategy_id} 不存在")

        strategy.enabled = enabled
        strategy.updated_at = datetime.now()
        await db.commit()
        await db.refresh(strategy)
        return strategy

    @staticmethod
    async def delete_strategy(db: AsyncSession, strategy_id: int) -> None:
        """删除策略"""
        result = await db.execute(select(Strategy).where(Strategy.id == strategy_id))
        strategy = result.scalar_one_or_none()
        if strategy is None:
            raise NotFoundError(f"策略 {strategy_id} 不存在")

        await db.delete(strategy)
        await db.commit()
