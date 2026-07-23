"""
AkShare 数据获取实现
基于新浪财经数据源，获取股票列表和日K线
"""

from datetime import date, timedelta

import akshare as ak
import pandas as pd
from loguru import logger

from app.integrations.base import BaseFetcher


class AkshareFetcher(BaseFetcher):
    """AkShare 数据获取器（新浪财经源）"""

    def fetch_stock_list(self) -> list[dict]:
        """拉取全A股股票列表（沪深两市）"""
        all_stocks = []

        # 沪市：主板 + 科创板
        for symbol, market in [
            ("主板A股", "SH"),
            ("科创板", "SH"),
        ]:
            try:
                df = ak.stock_info_sh_name_code(symbol=symbol)
                for _, row in df.iterrows():
                    code = row["证券代码"]
                    name = row["证券简称"]
                    if "退" in name:
                        continue
                    all_stocks.append({
                        "code": code,
                        "name": name,
                        "market": market,
                        "industry": None,
                        "listed_date": self._parse_date(row.get("上市日期")),
                        "is_st": "ST" in name,
                    })
                logger.info(f"  拉取 沪市{symbol}: {len(df)} 只")
            except Exception as e:
                logger.error(f"  拉取 沪市{symbol} 失败: {e}")

        # 深市：主板 + 创业板
        for symbol, market in [
            ("A股列表", "SZ"),
        ]:
            try:
                df = ak.stock_info_sz_name_code(symbol=symbol)
                for _, row in df.iterrows():
                    code = row["A股代码"]
                    name = row["A股简称"]
                    if "退" in name:
                        continue
                    all_stocks.append({
                        "code": code,
                        "name": name,
                        "market": market,
                        "industry": None,
                        "listed_date": self._parse_date(row.get("上市日期")),
                        "is_st": "ST" in name,
                    })
                logger.info(f"  拉取 深市{symbol}: {len(df)} 只")
            except Exception as e:
                logger.error(f"  拉取 深市{symbol} 失败: {e}")

        logger.info(f"共拉取 A 股股票 {len(all_stocks)} 只")
        return all_stocks

    def fetch_kline_daily(
        self,
        stock_code: str,
        market: str = "SH",
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[dict]:
        """拉取单只股票的日K线数据（前复权），使用新浪数据源，更稳定"""
        if end_date is None:
            end_date = date.today()
        if start_date is None:
            start_date = end_date - timedelta(days=730)

        # stock_zh_a_daily 需要 sh600519 格式的前缀
        prefix = {"SH": "sh", "SZ": "sz", "BJ": "bj"}.get(market, "sh")
        symbol = f"{prefix}{stock_code}"

        import time
        max_retries = 2
        for attempt in range(max_retries):
            try:
                df = ak.stock_zh_a_daily(
                    symbol=symbol,
                    start_date=start_date.strftime("%Y%m%d"),
                    end_date=end_date.strftime("%Y%m%d"),
                    adjust="qfq",
                )

                if df is None or df.empty:
                    return []

                klines = []
                prev_close = None
                for _, row in df.iterrows():
                    cur_close = float(row["close"])
                    out_share = row.get("outstanding_share")
                    out_share_int = int(out_share) if out_share and pd.notna(out_share) else None
                    circulating_mcap = (
                        cur_close * out_share_int if out_share_int else None
                    )
                    klines.append({
                        "trade_date": self._parse_date(row["date"]),
                        "open": float(row["open"]),
                        "close": cur_close,
                        "high": float(row["high"]),
                        "low": float(row["low"]),
                        "pre_close": prev_close if prev_close is not None else cur_close,
                        "volume": int(row["volume"]),
                        "amount": float(row["amount"]) if row.get("amount") else 0.0,
                        "turnover_rate": float(row["turnover"]) if row.get("turnover") else 0.0,
                        "outstanding_share": out_share_int,
                        "circulating_market_cap": circulating_mcap,
                    })
                    prev_close = cur_close

                return klines

            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue
                logger.error(f"  拉取 {stock_code} K线失败: {e}")
                return []

    @staticmethod
    def _parse_date(val) -> date | None:
        """将各种日期格式统一转为 datetime.date，失败返回 None"""
        if val is None:
            return None
        import pandas as pd
        if isinstance(val, date):
            return val
        if isinstance(val, pd.Timestamp):
            return val.date()
        if isinstance(val, str):
            for fmt in ["%Y-%m-%d", "%Y%m%d", "%Y/%m/%d"]:
                try:
                    from datetime import datetime
                    return datetime.strptime(val[:10], fmt).date()
                except ValueError:
                    continue
        return None

    def fetch_market_cap_snapshot(self) -> dict[str, float]:
        """
        从东方财富获取全 A 股实时流通市值快照。
        返回 {股票代码: 流通市值(元)} 字典。
        流通市值单位：东方财富返回的是元。
        """
        import time

        logger.info("📊 正在从东方财富获取全 A 股市值快照...")
        for attempt in range(3):
            try:
                df = ak.stock_zh_a_spot_em()

                if df is None or df.empty:
                    logger.warning("  stock_zh_a_spot_em 返回空数据")
                    return {}

                result: dict[str, float] = {}
                for _, row in df.iterrows():
                    code = str(row["代码"])
                    cap_raw = row.get("流通市值")
                    if cap_raw is not None and float(cap_raw) > 0:
                        result[code] = float(cap_raw)

                logger.info(f"✅ 获取到 {len(result)} 只股票的流通市值数据")
                return result

            except Exception as e:
                logger.warning(f"  第 {attempt + 1} 次尝试获取市值数据失败: {e}")
                if attempt < 2:
                    time.sleep(3)

        logger.error("❌ 获取流通市值数据全部失败")
        return {}


# 便捷函数 — 兼容旧调用方式
_fetcher = AkshareFetcher()


def fetch_stock_list() -> list[dict]:
    """拉取全A股股票列表（兼容旧 API）"""
    return _fetcher.fetch_stock_list()


def fetch_kline_daily(
    stock_code: str,
    market: str = "SH",
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict]:
    """拉取单只股票的日K线数据（兼容旧 API）"""
    return _fetcher.fetch_kline_daily(stock_code, market=market, start_date=start_date, end_date=end_date)


def fetch_market_cap_snapshot() -> dict[str, float]:
    """获取全 A 股流通市值快照（兼容旧 API）"""
    return _fetcher.fetch_market_cap_snapshot()
