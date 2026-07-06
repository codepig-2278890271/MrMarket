"""
行情查询服务
提供股票列表、详情、K线查询的业务逻辑（含 Redis 缓存加速）
"""

from datetime import date

from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.stock import KLineDaily, Stock


class MarketService:
    """行情查询业务逻辑"""

    @staticmethod
    async def list_stocks(
        db: AsyncSession,
        *,
        page: int = 1,
        page_size: int = 20,
        market: str | None = None,
        search: str | None = None,
    ) -> tuple[list[Stock], int]:
        """分页查询股票列表，支持按交易所筛选和模糊搜索"""
        conditions = []
        if market:
            conditions.append(Stock.market == market)
        if search:
            conditions.append(
                (Stock.code.ilike(f"%{search}%")) | (Stock.name.ilike(f"%{search}%"))
            )

        # 总数
        count_stmt = select(func.count()).select_from(Stock)
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total = (await db.execute(count_stmt)).scalar()

        # 分页数据
        data_stmt = select(Stock).order_by(Stock.code)
        if conditions:
            data_stmt = data_stmt.where(*conditions)
        data_stmt = data_stmt.offset((page - 1) * page_size).limit(page_size)
        rows = (await db.execute(data_stmt)).scalars().all()

        return list(rows), total

    @staticmethod
    async def get_stock(db: AsyncSession, code: str) -> Stock | None:
        """根据股票代码查询单只股票"""
        result = await db.execute(select(Stock).where(Stock.code == code))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_klines(
        db: AsyncSession,
        code: str,
        *,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> tuple[list[KLineDaily], int]:
        """
        查询某只股票的日K线数据（优先走 Redis 缓存）。

        缓存策略：
        - 指定日期范围：缓存 5 分钟（历史数据不变）
        - 未指定日期范围（默认最近数据）：缓存 2 分钟（新交易日会有更新）
        """
        # 构建缓存 key
        cache_key = f"klines:{code}:{start_date or 'all'}:{end_date or 'all'}"

        # 尝试从 Redis 缓存读取
        cached = await _cache_get_json(cache_key)
        if cached is not None:
            logger.debug(f"📦 K线缓存命中: {cache_key}")
            return [], cached.get("total", 0)  # 缓存命中时 rows 由 endpoint 处理

        # 缓存未命中，查数据库
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

        return list(rows), total


async def _cache_get_json(key: str) -> dict | None:
    """从 Redis 读取缓存（内部辅助函数）"""
    try:
        from app.utils.redis import cache_get
        return await cache_get(key)
    except Exception:
        return None
