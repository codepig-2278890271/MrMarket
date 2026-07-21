#!/usr/bin/env python3
"""
MrMarket 数据增强脚本 — 行业分类 & 流通市值 & 数据库迁移
==========================================================
1. 添加 kline_daily 新列（outstanding_share, circulating_market_cap）
2. 从申万 2021 版行业分类下载并填充 stocks.industry 字段
3. 重同步部分 K 线数据以获取流通市值

用法：
  python3 scripts/data/enhance_data.py [--force-kline-sync]
    --force-kline-sync  重新拉取最近 N 天的 K 线数据（耗时较长）
"""

import asyncio
import sys
import os
import argparse
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

import requests
import pandas as pd
import io
import warnings
warnings.filterwarnings("ignore")

from loguru import logger
from sqlalchemy import text
from app.utils.database import async_session, engine

# ================================================================
# 申万 2021 版一级行业代码 → 名称映射
# ================================================================

SW_INDUSTRY_MAP = {
    "11": "农林牧渔",
    "22": "基础化工",
    "23": "钢铁",
    "24": "有色金属",
    "27": "电子",
    "28": "汽车",
    "33": "家用电器",
    "34": "食品饮料",
    "35": "纺织服饰",
    "36": "轻工制造",
    "37": "医药生物",
    "41": "公用事业",
    "42": "交通运输",
    "43": "房地产",
    "45": "商贸零售",
    "46": "社会服务",
    "48": "银行",
    "49": "非银金融",
    "51": "综合",
    "61": "建筑材料",
    "62": "建筑装饰",
    "63": "电力设备",
    "64": "机械设备",
    "65": "国防军工",
    "71": "计算机",
    "72": "传媒",
    "73": "通信",
    "74": "煤炭",
    "75": "石油石化",
    "76": "环保",
    "77": "美容护理",
}


async def migrate_add_columns():
    """添加 kline_daily 新列（如果不存在）"""
    migrations = [
        # (列名, 类型, 注释)
        ("outstanding_share", "BIGINT", "流通股本（股）"),
        ("circulating_market_cap", "NUMERIC(20,2)", "流通市值（元）"),
    ]

    async with engine.begin() as conn:
        for col_name, col_type, col_comment in migrations:
            # 检查列是否存在（PostgreSQL 方式）
            check_sql = text("""
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'kline_daily' AND column_name = :col
            """)
            result = await conn.execute(check_sql, {"col": col_name})
            exists = result.scalar() is not None

            if not exists:
                alter_sql = text(
                    f'ALTER TABLE kline_daily ADD COLUMN {col_name} {col_type}'
                )
                await conn.execute(alter_sql)
                # 添加注释
                comment_sql = text(
                    f"COMMENT ON COLUMN kline_daily.{col_name} IS '{col_comment}'"
                )
                await conn.execute(comment_sql)
                logger.info(f"  ✅ 添加列 kline_daily.{col_name} ({col_type})")
            else:
                logger.info(f"  ⏭️  列 kline_daily.{col_name} 已存在，跳过")


async def sync_industries_from_sw():
    """从申万 2021 行业分类 Excel 下载并填充 stocks.industry"""
    logger.info("📥 下载申万 2021 行业分类数据...")
    url = "https://www.swsresearch.com/swindex/pdf/SwClass2021/StockClassifyUse_stock.xls"

    try:
        resp = requests.get(
            url, verify=False, timeout=30,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        if resp.status_code != 200:
            logger.error(f"  下载失败: HTTP {resp.status_code}")
            return
    except Exception as e:
        logger.error(f"  下载失败: {e}")
        return

    df = pd.read_excel(
        io.BytesIO(resp.content),
        dtype={"股票代码": "str", "行业代码": "str"}
    )
    logger.info(f"  下载成功: {len(df)} 条记录")

    # 处理股票代码：补零到 6 位
    df["股票代码"] = df["股票代码"].str.zfill(6)

    # 提取一级行业（取行业代码前 2 位）
    df["一级行业代码"] = df["行业代码"].str[:2]

    # 映射为行业名称
    df["行业名称"] = df["一级行业代码"].map(SW_INDUSTRY_MAP)
    unmapped_codes = df[df["行业名称"].isna()]["一级行业代码"].unique()
    if len(unmapped_codes) > 0:
        logger.info(f"  未映射行业代码: {sorted(unmapped_codes)} — 归入「其他」")
    df["行业名称"] = df["行业名称"].fillna("其他")

    # 取每个股票的最新分类（按更新日期）
    df_sorted = df.sort_values("更新日期", ascending=False)
    df_latest = df_sorted.groupby("股票代码").first().reset_index()

    # 只保留行业名称与股票代码
    stock_industry = dict(zip(df_latest["股票代码"], df_latest["行业名称"]))
    logger.info(f"  解析完成: {len(stock_industry)} 只股票的行业分类")
    logger.info(f"  行业分布: {len(df_latest['行业名称'].unique())} 个一级行业")

    # 批量更新 stocks 表
    async with engine.begin() as conn:
        updated = 0
        for code, industry in stock_industry.items():
            update_sql = text(
                "UPDATE stocks SET industry = :industry WHERE code = :code"
            )
            result = await conn.execute(update_sql, {
                "industry": industry, "code": code
            })
            updated += result.rowcount

    logger.info(f"  ✅ 更新了 {updated} 只股票的行业分类")

    # 统计行业分布
    async with async_session() as db:
        stats = await db.execute(text(
            "SELECT industry, count(*) as cnt FROM stocks "
            "GROUP BY industry ORDER BY cnt DESC"
        ))
        logger.info("  📊 行业分布 Top 10:")
        for row in stats.fetchmany(10):
            logger.info(f"      {row[0]}: {row[1]} 只")


async def resync_recent_klines(days: int = 5):
    """
    重新拉取最近 N 天的 K 线数据以获取流通市值
    只更新最近 N 天有交易的数据
    """
    logger.info(f"🔄 重同步最近 {days} 天 K 线数据（含流通市值）...")

    from datetime import timedelta
    from app.integrations.akshare import fetch_kline_daily

    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    # 获取所有股票
    async with async_session() as db:
        result = await db.execute(text("SELECT code, market FROM stocks"))
        stocks = result.all()

    logger.info(f"  共 {len(stocks)} 只股票需要同步")

    total_updated = 0
    for i, (code, market) in enumerate(stocks):
        try:
            klines = fetch_kline_daily(
                stock_code=code,
                market=market,
                start_date=start_date,
                end_date=end_date,
            )

            if not klines:
                continue

            # 只更新有流通市值的数据
            for k in klines:
                if k.get("circulating_market_cap") is not None:
                    async with engine.begin() as conn:
                        # Upsert: 更新整个 K 线记录
                        upsert_sql = text("""
                            INSERT INTO kline_daily
                                (stock_code, trade_date, open, high, low, close,
                                 pre_close, volume, amount, turnover_rate,
                                 outstanding_share, circulating_market_cap)
                            VALUES
                                (:code, :td, :o, :h, :l, :c,
                                 :pc, :v, :amt, :tor,
                                 :os, :cmc)
                            ON CONFLICT (stock_code, trade_date)
                            DO UPDATE SET
                                outstanding_share = EXCLUDED.outstanding_share,
                                circulating_market_cap = EXCLUDED.circulating_market_cap
                        """)
                        await conn.execute(upsert_sql, {
                            "code": code,
                            "td": k["trade_date"],
                            "o": k["open"],
                            "h": k["high"],
                            "l": k["low"],
                            "c": k["close"],
                            "pc": k["pre_close"],
                            "v": k["volume"],
                            "amt": k["amount"],
                            "tor": k["turnover_rate"],
                            "os": k["outstanding_share"],
                            "cmc": k["circulating_market_cap"],
                        })
                    total_updated += 1

            if (i + 1) % 500 == 0:
                logger.info(f"    进度: {i+1}/{len(stocks)}, 已更新 {total_updated} 条")

            # 限流
            await asyncio.sleep(0.1)

        except Exception as e:
            logger.debug(f"    {code} 同步失败: {e}")
            continue

    logger.info(f"  ✅ 共更新 {total_updated} 条 K 线记录")


async def main():
    parser = argparse.ArgumentParser(description="MrMarket 数据增强")
    parser.add_argument(
        "--force-kline-sync", action="store_true",
        help="重新拉取最近 K 线数据以获取流通市值（耗时较长）"
    )
    parser.add_argument(
        "--kline-days", type=int, default=5,
        help="K 线重同步天数（默认 5 天）"
    )
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("🚀 MrMarket 数据增强脚本")
    logger.info("=" * 60)

    # Step 1: 数据库迁移
    logger.info("\n📦 Step 1/3: 数据库迁移（添加新列）")
    await migrate_add_columns()

    # Step 2: 行业分类
    logger.info("\n🏭 Step 2/3: 同步行业分类数据")
    await sync_industries_from_sw()

    # Step 3: 流通市值（可选）
    if args.force_kline_sync:
        logger.info(f"\n💰 Step 3/3: 重同步 K 线数据（{args.kline_days} 天）")
        await resync_recent_klines(days=args.kline_days)
    else:
        logger.info("\n⏭️  Step 3/3: 跳过 K 线重同步（使用 --force-kline-sync 开启）")

    logger.info("\n" + "=" * 60)
    logger.info("✅ 数据增强完成！")
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
