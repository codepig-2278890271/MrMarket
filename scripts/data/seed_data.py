#!/usr/bin/env python3
"""
MrMarket 种子数据脚本
在数据源 API 不可用时，手动填充少量代表性A股数据用于开发测试。
等 API 恢复后再用 sync_data.py 拉全量数据。

用法：
  python3 scripts/seed_data.py
"""

import asyncio
import sys
import os
from datetime import date, timedelta
from decimal import Decimal
import random

# 把 backend 目录加入 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

from sqlalchemy.dialects.postgresql import insert
from loguru import logger

from app.utils.database import async_session, engine, Base
import app.models  # noqa: F401

# ================================================================
# 种子股票数据（市值top + 行业代表，共15只）
# ================================================================

SEED_STOCKS = [
    # (代码, 名称, 市场, 行业, 上市日期, 是否ST)
    ("600519", "贵州茅台", "SH", "食品饮料", date(2001, 8, 27), False),
    ("000858", "五粮液",   "SZ", "食品饮料", date(1998, 4, 27), False),
    ("601318", "中国平安", "SH", "金融",     date(2007, 3, 1),  False),
    ("000001", "平安银行", "SZ", "金融",     date(1991, 4, 3),  False),
    ("600036", "招商银行", "SH", "金融",     date(2002, 4, 9),  False),
    ("000333", "美的集团", "SZ", "家用电器", date(2013, 9, 18), False),
    ("000651", "格力电器", "SZ", "家用电器", date(1996, 11, 18), False),
    ("600276", "恒瑞医药", "SH", "医药生物", date(2000, 10, 18), False),
    ("300760", "迈瑞医疗", "SZ", "医药生物", date(2018, 10, 16), False),
    ("002415", "海康威视", "SZ", "信息技术", date(2010, 5, 28), False),
    ("600900", "长江电力", "SH", "公用事业", date(2003, 11, 18), False),
    ("601899", "紫金矿业", "SH", "有色金属", date(2008, 4, 25), False),
    ("002594", "比亚迪",   "SZ", "汽车",     date(2011, 6, 30), False),
    ("300750", "宁德时代", "SZ", "电力设备", date(2018, 6, 11), False),
    ("688981", "中芯国际", "SH", "半导体",   date(2020, 7, 16), False),
]


def generate_klines(
    base_price: float, days: int = 250
) -> list[dict]:
    """
    为一只股票生成模拟日K线数据
    用随机游走模拟价格走势，保证数据"看起来合理"
    """
    random.seed(42)  # 固定种子，每次生成的数据一致

    klines = []
    today = date.today()
    price = base_price
    daily_volatility = 0.025  # 日波动率 2.5%

    for i in range(days, -1, -1):
        trade_date = today - timedelta(days=i)
        # 跳过周末
        if trade_date.weekday() >= 5:
            continue

        # 随机涨跌
        change_pct = random.gauss(0, daily_volatility)  # 正态分布
        change = price * change_pct
        close = price + change
        open_p = price + random.uniform(-0.5, 0.5) * abs(change)
        high = max(open_p, close) * (1 + random.uniform(0, 0.02))
        low = min(open_p, close) * (1 - random.uniform(0, 0.02))
        volume = int(abs(change) * random.uniform(1000000, 10000000))
        amount = price * volume * random.uniform(0.8, 1.2)
        turnover = random.uniform(0.1, 5.0)

        klines.append({
            "trade_date": trade_date,
            "open": round(open_p, 3),
            "high": round(high, 3),
            "low": round(low, 3),
            "close": round(close, 3),
            "change": round(change, 3),
            "volume": volume,
            "amount": round(amount, 2),
            "turnover_rate": round(turnover, 4),
        })

        price = close  # 下一天从当前收盘价出发

    return klines


async def seed():
    """写入种子数据"""
    logger.info("🌱 开始写入种子数据...")

    # 1. 写入股票列表
    async with async_session() as session:
        for code, name, market, industry, listed, is_st in SEED_STOCKS:
            stmt = insert(app.models.Stock).values(
                code=code, name=name, market=market,
                industry=industry, listed_date=listed, is_st=is_st,
            ).on_conflict_do_update(
                index_elements=["code"],
                set_={"name": name, "industry": industry},
            )
            await session.execute(stmt)
        await session.commit()
    logger.info(f"✅ 写入 {len(SEED_STOCKS)} 只股票")

    # 2. 为每只股票生成 K 线数据
    base_prices = {
        "600519": 1800, "000858": 160, "601318": 50, "000001": 12,
        "600036": 40, "000333": 60, "000651": 38, "600276": 50,
        "300760": 280, "002415": 35, "600900": 22, "601899": 15,
        "002594": 250, "300750": 200, "688981": 45,
    }

    total_klines = 0
    for code, name, market, *_ in SEED_STOCKS:
        base = base_prices.get(code, 20)
        klines = generate_klines(base, days=250)

        async with async_session() as session:
            for k in klines:
                pre_close = round(k["close"] - k["change"], 3)
                stmt = insert(app.models.KLineDaily).values(
                    stock_code=code,
                    trade_date=k["trade_date"],
                    open=Decimal(str(k["open"])),
                    high=Decimal(str(k["high"])),
                    low=Decimal(str(k["low"])),
                    close=Decimal(str(k["close"])),
                    pre_close=Decimal(str(pre_close)),
                    volume=k["volume"],
                    amount=Decimal(str(k["amount"])),
                    turnover_rate=Decimal(str(k["turnover_rate"])),
                ).on_conflict_do_update(
                    index_elements=["stock_code", "trade_date"],
                    set_={
                        "close": Decimal(str(k["close"])),
                        "open": Decimal(str(k["open"])),
                        "high": Decimal(str(k["high"])),
                        "low": Decimal(str(k["low"])),
                        "volume": k["volume"],
                        "amount": Decimal(str(k["amount"])),
                    },
                )
                await session.execute(stmt)
            await session.commit()

        total_klines += len(klines)
        logger.info(f"  {code} {name}: {len(klines)} 根K线")

    logger.info(f"✅ 全部种子数据写入完成: {len(SEED_STOCKS)} 只股票, {total_klines} 条K线")


async def init_tables():
    """先建表再写数据"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def main():
    await init_tables()
    await seed()


if __name__ == "__main__":
    asyncio.run(main())
