"""
数据同步服务
提供股票列表和K线数据的批量 upsert 逻辑，供脚本和定时任务复用
"""

from decimal import Decimal

from loguru import logger
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.stock import KLineDaily, Stock


class SyncService:
    """数据同步业务逻辑"""

    @staticmethod
    async def upsert_stocks(db: AsyncSession, stocks: list[dict]) -> int:
        """
        批量 upsert 股票列表
        返回写入的股票数量
        """
        if not stocks:
            return 0

        for s in stocks:
            stmt = insert(Stock).values(
                code=s["code"],
                name=s["name"],
                market=s["market"],
                industry=s.get("industry"),
                listed_date=s.get("listed_date"),
                is_st=s.get("is_st", False),
            ).on_conflict_do_update(
                index_elements=["code"],
                set_={
                    "name": s["name"],
                    "industry": s.get("industry"),
                    "is_st": s.get("is_st", False),
                },
            )
            await db.execute(stmt)

        await db.commit()
        logger.info(f"✅ 批量 upsert 股票: {len(stocks)} 只")
        return len(stocks)

    @staticmethod
    async def upsert_klines(
        db: AsyncSession,
        stock_code: str,
        klines: list[dict],
    ) -> int:
        """
        批量 upsert 单只股票的日K线数据
        返回写入的K线条数
        """
        if not klines:
            return 0

        for k in klines:
            stmt = insert(KLineDaily).values(
                stock_code=stock_code,
                trade_date=k["trade_date"],
                open=Decimal(str(k["open"])),
                high=Decimal(str(k["high"])),
                low=Decimal(str(k["low"])),
                close=Decimal(str(k["close"])),
                pre_close=Decimal(str(k.get("pre_close", 0))),
                volume=k["volume"],
                amount=Decimal(str(k["amount"])),
                turnover_rate=Decimal(str(k.get("turnover_rate", 0))),
            ).on_conflict_do_update(
                index_elements=["stock_code", "trade_date"],
                set_={
                    "open": Decimal(str(k["open"])),
                    "high": Decimal(str(k["high"])),
                    "low": Decimal(str(k["low"])),
                    "close": Decimal(str(k["close"])),
                    "pre_close": Decimal(str(k.get("pre_close", 0))),
                    "volume": k["volume"],
                    "amount": Decimal(str(k["amount"])),
                    "turnover_rate": Decimal(str(k.get("turnover_rate", 0))),
                },
            )
            await db.execute(stmt)

        await db.commit()
        return len(klines)
