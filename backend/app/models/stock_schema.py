"""
行情相关 Pydantic 响应模型
将 SQLAlchemy ORM 对象序列化为 JSON
"""

from datetime import date

from pydantic import BaseModel, ConfigDict


class StockResponse(BaseModel):
    """股票基本信息"""
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    market: str
    industry: str | None = None
    listed_date: date | None = None
    is_st: bool = False


class KLineResponse(BaseModel):
    """单条日K线"""
    model_config = ConfigDict(from_attributes=True)

    trade_date: date
    open: float
    high: float
    low: float
    close: float
    pre_close: float
    volume: int
    amount: float
    turnover_rate: float | None = None
    adj_factor: float | None = None


class StocksListResponse(BaseModel):
    """股票分页列表"""
    items: list[StockResponse]
    total: int
    page: int
    page_size: int


class KLineListResponse(BaseModel):
    """K线列表"""
    items: list[KLineResponse]
    total: int
