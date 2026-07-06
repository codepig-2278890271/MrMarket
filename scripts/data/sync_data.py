#!/usr/bin/env python3
"""
MrMarket 数据同步脚本
- 同步A股股票列表 → stocks 表
- 同步日K线数据 → kline_daily 表
- 数据来源：AkShare（新浪财经）

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

# 把 backend 目录加入 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

from loguru import logger
from sqlalchemy import select

from app.utils.database import async_session, engine, Base
from app.models import Stock, KLineDaily
from app.integrations.akshare import fetch_stock_list, fetch_kline_daily
from app.services.sync_service import SyncService

# 限流配置：每次 API 调用间隔（秒），避免被数据源封 IP
RATE_LIMIT_SECONDS = 0.5


async def sync_stocks():
    """同步 A 股股票列表到数据库（增量更新：存在则更新，不存在则插入）"""
    logger.info("📋 开始同步股票列表...")

    stocks = fetch_stock_list()
    if not stocks:
        logger.error("❌ 未获取到股票数据，请检查网络")
        return

    # 使用 SyncService 单 session 批量写入
    async with async_session() as db:
        count = await SyncService.upsert_stocks(db, stocks)

    logger.info(f"✅ 股票列表同步完成，共 {count} 只")


async def sync_klines(limit: int = 100):
    """
    同步日K线数据
    limit: 最多同步多少只股票（按股票列表顺序），避免一次性请求太多
    """
    logger.info(f"📊 开始同步K线数据（最多 {limit} 只，API 间隔 {RATE_LIMIT_SECONDS}s）...")

    # 一次性查询所有待同步的股票
    async with async_session() as db:
        result = await db.execute(
            select(Stock.code, Stock.market).order_by(Stock.code).limit(limit)
        )
        stocks = list(result.all())

    success_count = 0
    fail_count = 0
    start_date = date.today() - timedelta(days=730)

    # 单 session 批量写入，避免每只股票重复建连
    async with async_session() as db:
        for i, (code, market) in enumerate(stocks):
            # 调用 AkShare API
            klines = fetch_kline_daily(code, market, start_date=start_date)

            if not klines:
                fail_count += 1
                continue

            # 确保每条K线有完整字段
            for k in klines:
                k.setdefault("pre_close", 0)
                k.setdefault("turnover_rate", 0)

            # 批量 upsert 到数据库
            await SyncService.upsert_klines(db, code, klines)
            success_count += 1

            # 限流：每次 API 调用后等待
            if RATE_LIMIT_SECONDS > 0:
                await asyncio.sleep(RATE_LIMIT_SECONDS)

            if (i + 1) % 20 == 0:
                logger.info(f"  进度: {i + 1}/{len(stocks)} (成功 {success_count}, 失败 {fail_count})")

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
        limit = 999999 if "--all" in sys.argv else 100
        await sync_klines(limit=limit)

    elif cmd == "all":
        await sync_stocks()
        await sync_klines(limit=100)

    else:
        print(f"未知命令: {cmd}")
        print(__doc__)


if __name__ == "__main__":
    asyncio.run(main())
