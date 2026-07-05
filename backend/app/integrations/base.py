"""
数据源抽象基类
定义统一的数据获取接口，便于后续扩展更多数据源（Tushare、Wind 等）
"""

from abc import ABC, abstractmethod
from datetime import date


class BaseFetcher(ABC):
    """数据获取器基类"""

    @abstractmethod
    def fetch_stock_list(self) -> list[dict]:
        """拉取股票列表，返回 [{"code": "600519", "name": "贵州茅台", ...}, ...]"""
        ...

    @abstractmethod
    def fetch_kline_daily(
        self,
        stock_code: str,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[dict]:
        """拉取单只股票日K线数据"""
        ...
