"""
市值数据同步脚本

从东方财富 (AkShare) 获取全 A 股实时流通市值，
并更新到最新交易日的 K 线记录中。

使用方式：
  cd backend
  python -m scripts.sync_market_cap

或通过 API 触发：
  POST /api/v1/admin/sync-market-cap
"""

import asyncio
from datetime import date

from loguru import logger

from app.integrations.akshare import fetch_market_cap_snapshot
from app.services.sync_service import SyncService
from app.utils.database import async_session


async def sync_market_cap():
    """主同步逻辑"""
    logger.info("=" * 60)
    logger.info("🔄 开始同步全 A 股流通市值...")

    # 1. 从东方财富获取实时市值快照
    market_caps = fetch_market_cap_snapshot()

    if not market_caps:
        logger.error("❌ 未获取到市值数据，同步终止")
        return 0

    # 2. 写入数据库
    async with async_session() as db:
        count = await SyncService.upsert_market_caps(db, market_caps)

    logger.info(f"🎉 市值同步完成：{count} 只股票更新")
    logger.info("=" * 60)
    return count


if __name__ == "__main__":
    asyncio.run(sync_market_cap())
