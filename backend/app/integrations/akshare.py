"""
AkShare 数据获取实现
基于新浪财经数据源，获取股票列表和日K线
"""

from datetime import date, timedelta

import akshare as ak
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
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[dict]:
        """拉取单只股票的日K线数据（前复权）"""
        if end_date is None:
            end_date = date.today()
        if start_date is None:
            start_date = end_date - timedelta(days=730)

        try:
            df = ak.stock_zh_a_hist(
                symbol=stock_code,
                period="daily",
                start_date=start_date.strftime("%Y%m%d"),
                end_date=end_date.strftime("%Y%m%d"),
                adjust="qfq",
            )

            if df.empty:
                return []

            klines = []
            for _, row in df.iterrows():
                klines.append({
                    "trade_date": self._parse_date(row["日期"]),
                    "open": float(row["开盘"]),
                    "close": float(row["收盘"]),
                    "high": float(row["最高"]),
                    "low": float(row["最低"]),
                    "volume": int(row["成交量"]),
                    "amount": float(row["成交额"]),
                    "amplitude": float(row.get("振幅", 0) or 0),
                    "change_pct": float(row.get("涨跌幅", 0) or 0),
                    "change": float(row.get("涨跌额", 0) or 0),
                    "turnover_rate": float(row.get("换手率", 0) or 0),
                })

            return klines

        except Exception as e:
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


# 便捷函数 — 兼容旧调用方式
_fetcher = AkshareFetcher()


def fetch_stock_list() -> list[dict]:
    """拉取全A股股票列表（兼容旧 API）"""
    return _fetcher.fetch_stock_list()


def fetch_kline_daily(
    stock_code: str,
    market: str = "",
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict]:
    """拉取单只股票的日K线数据（兼容旧 API）"""
    return _fetcher.fetch_kline_daily(stock_code, start_date=start_date, end_date=end_date)
