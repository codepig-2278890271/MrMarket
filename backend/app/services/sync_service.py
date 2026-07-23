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
            out_share = k.get("outstanding_share")
            circ_cap = k.get("circulating_market_cap")
            values = {
                "stock_code": stock_code,
                "trade_date": k["trade_date"],
                "open": Decimal(str(k["open"])),
                "high": Decimal(str(k["high"])),
                "low": Decimal(str(k["low"])),
                "close": Decimal(str(k["close"])),
                "pre_close": Decimal(str(k.get("pre_close", 0))),
                "volume": k["volume"],
                "amount": Decimal(str(k["amount"])),
                "turnover_rate": Decimal(str(k.get("turnover_rate", 0))),
                "outstanding_share": int(out_share) if out_share else None,
                "circulating_market_cap": Decimal(str(circ_cap)) if circ_cap else None,
                "adj_factor": Decimal(str(k["adj_factor"])) if k.get("adj_factor") else None,
            }
            stmt = insert(KLineDaily).values(**values).on_conflict_do_update(
                index_elements=["stock_code", "trade_date"],
                set_={
                    "open": values["open"],
                    "high": values["high"],
                    "low": values["low"],
                    "close": values["close"],
                    "pre_close": values["pre_close"],
                    "volume": values["volume"],
                    "amount": values["amount"],
                    "turnover_rate": values["turnover_rate"],
                    "outstanding_share": values["outstanding_share"],
                    "circulating_market_cap": values["circulating_market_cap"],
                    "adj_factor": values["adj_factor"],
                },
            )
            await db.execute(stmt)

        await db.commit()
        return len(klines)

    @staticmethod
    async def upsert_market_caps(
        db: AsyncSession,
        market_caps: dict[str, float],
        trade_date: date | None = None,
    ) -> int:
        """
        批量更新流通市值到最新日K线记录。
        market_caps: {股票代码: 流通市值(元)}
        返回更新的股票数量。
        """
        if not market_caps:
            return 0

        from sqlalchemy import update

        updated = 0
        for code, cap in market_caps.items():
            # 找到该股票最新的 K 线记录并更新流通市值
            if trade_date:
                stmt = (
                    update(KLineDaily)
                    .where(
                        KLineDaily.stock_code == code,
                        KLineDaily.trade_date == trade_date,
                    )
                    .values(circulating_market_cap=Decimal(str(cap)))
                )
            else:
                # 更新最近一个交易日的记录
                from sqlalchemy import select
                sub = (
                    select(KLineDaily.trade_date)
                    .where(KLineDaily.stock_code == code)
                    .order_by(KLineDaily.trade_date.desc())
                    .limit(1)
                    .scalar_subquery()
                )
                stmt = (
                    update(KLineDaily)
                    .where(
                        KLineDaily.stock_code == code,
                        KLineDaily.trade_date == sub,
                    )
                    .values(circulating_market_cap=Decimal(str(cap)))
                )

            result = await db.execute(stmt)
            if result.rowcount > 0:
                updated += 1

        await db.commit()
        logger.info(f"✅ 批量更新流通市值: {updated} 只股票")
        return updated
