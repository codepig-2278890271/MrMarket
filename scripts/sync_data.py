#!/usr/bin/env python3
"""
MrMarket 数据同步脚本
- 同步A股股票列表 → stocks 表
- 同步日K线数据 → kline_daily 表
- 数据来源：东方财富 API

用法：
  python3 scripts/sync_data.py stocks          # 只同步股票列表
  python3 scripts/sync_data.py kline           # 只同步K线（前100只）
  python3 scripts/sync_data.py kline --all     # 同步全部K线
  python3 scripts/sync_data.py all             # 全部同步
"""

import asyncio
import sys
import os
from datetime import date, timedelta
from decimal import Decimal

# 把 api 目录加入 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

from sqlalchemy.dialects.postgresql import insert
from loguru import logger

from app.database import async_session, engine, Base
from app.models import Stock, KLineDaily
from app.services.data_fetcher import fetch_stock_list, fetch_kline_daily


async def sync_stocks():
    """同步 A 股股票列表到数据库（增量更新：存在则更新，不存在则插入）"""
    logger.info("📋 开始同步股票列表...")

    stocks = fetch_stock_list()
    if not stocks:
        logger.error("❌ 未获取到股票数据，请检查网络")
        return

    async with async_session() as session:
        for s in stocks:
            # PostgreSQL upsert：存在就更新，不存在就插入
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
            await session.execute(stmt)

        await session.commit()

    logger.info(f"✅ 股票列表同步完成，共 {len(stocks)} 只")


async def sync_klines(limit: int = 100):
    """
    同步日K线数据
    limit: 最多同步多少只股票（按股票列表顺序），避免一次性请求太多
    """
    logger.info(f"📊 开始同步K线数据（最多 {limit} 只）...")

    async with async_session() as session:
        # 查询已有哪些股票
        from sqlalchemy import select
        result = await session.execute(
            select(Stock.code, Stock.market).order_by(Stock.code).limit(limit)
        )
        stocks = result.all()

    success_count = 0
    fail_count = 0

    # 默认拉最近2年的日K
    start_date = date.today() - timedelta(days=730)

    for i, (code, market) in enumerate(stocks):
        klines = fetch_kline_daily(code, market, start_date=start_date)

        if not klines:
            fail_count += 1
            continue

        async with async_session() as session:
            for k in klines:
                # 计算 pre_close（前收盘价）
                pre_close = (
                    Decimal(str(k["close"])) - Decimal(str(k["change"]))
                ).quantize(Decimal("0.001"))

                stmt = insert(KLineDaily).values(
                    stock_code=code,
                    trade_date=k["trade_date"],
                    open=Decimal(str(k["open"])),
                    high=Decimal(str(k["high"])),
                    low=Decimal(str(k["low"])),
                    close=Decimal(str(k["close"])),
                    pre_close=pre_close,
                    volume=k["volume"],
                    amount=Decimal(str(k["amount"])),
                    turnover_rate=Decimal(str(k["turnover_rate"])),
                ).on_conflict_do_update(
                    index_elements=["stock_code", "trade_date"],
                    set_={
                        "open": Decimal(str(k["open"])),
                        "high": Decimal(str(k["high"])),
                        "low": Decimal(str(k["low"])),
                        "close": Decimal(str(k["close"])),
                        "pre_close": pre_close,
                        "volume": k["volume"],
                        "amount": Decimal(str(k["amount"])),
                        "turnover_rate": Decimal(str(k["turnover_rate"])),
                    },
                )
                await session.execute(stmt)

            await session.commit()

        success_count += 1
        if (i + 1) % 20 == 0:
            logger.info(f"  进度: {i + 1}/{len(stocks)}")

    logger.info(f"✅ K线同步完成: 成功 {success_count}, 失败 {fail_count}")


async def main():
    """主入口 — 解析命令行参数并执行同步"""
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1]

    if cmd == "stocks":
        await sync_stocks()

    elif cmd == "kline":
        # 默认只拉100只股票的数据，加 --all 则全部
        limit = 999999 if "--all" in sys.argv else 100
        await sync_klines(limit=limit)

    elif cmd == "all":
        await sync_stocks()
        await sync_klines(limit=100)

    else:
        print(f"未知命令: {cmd}")
        print(__doc__)


if __name__ == "__main__":
    # 初始化数据库表（如果在 main.py 之外直接运行）
    asyncio.run(main())
