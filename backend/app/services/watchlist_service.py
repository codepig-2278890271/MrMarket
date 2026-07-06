"""
自选股服务
提供自选股的增删改查业务逻辑
"""

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.errors import ConflictError, NotFoundError
from app.models.stock import Stock
from app.models.watchlist import Watchlist


class WatchlistService:
    """自选股业务逻辑"""

    @staticmethod
    async def list_items(
        db: AsyncSession,
        *,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Watchlist], int]:
        """分页查询自选股列表，按添加时间降序"""
        count_stmt = select(func.count()).select_from(Watchlist)
        total = (await db.execute(count_stmt)).scalar()

        data_stmt = (
            select(Watchlist)
            .order_by(Watchlist.added_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = (await db.execute(data_stmt)).scalars().all()

        return list(rows), total

    @staticmethod
    async def add_item(db: AsyncSession, stock_code: str, note: str | None = None) -> Watchlist:
        """添加一只股票到自选"""
        # 验证股票存在
        stock_result = await db.execute(select(Stock).where(Stock.code == stock_code))
        if stock_result.scalar_one_or_none() is None:
            raise NotFoundError(f"股票 {stock_code} 不存在")

        # 验证不重复
        exists = await db.execute(
            select(Watchlist).where(Watchlist.stock_code == stock_code)
        )
        if exists.scalar_one_or_none() is not None:
            raise ConflictError(f"股票 {stock_code} 已在自选中")

        item = Watchlist(stock_code=stock_code, note=note, added_at=datetime.now())
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def update_note(db: AsyncSession, stock_code: str, note: str | None) -> Watchlist:
        """修改自选股的备注"""
        result = await db.execute(
            select(Watchlist).where(Watchlist.stock_code == stock_code)
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise NotFoundError(f"自选股 {stock_code} 不存在")

        item.note = note
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def remove_item(db: AsyncSession, stock_code: str) -> None:
        """从自选中移除一只股票"""
        result = await db.execute(
            select(Watchlist).where(Watchlist.stock_code == stock_code)
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise NotFoundError(f"自选股 {stock_code} 不存在")

        await db.delete(item)
        await db.commit()
