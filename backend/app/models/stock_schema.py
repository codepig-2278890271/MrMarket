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


class StockWithPriceResponse(BaseModel):
    """股票信息 + 最新行情数据"""
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    market: str
    industry: str | None = None
    is_st: bool = False
    # 最新行情
    latest_price: float | None = None
    change_pct: float | None = None       # 涨跌幅 %
    change_amt: float | None = None        # 涨跌额
    volume: int | None = None              # 成交量
    amount: float | None = None            # 成交额
    turnover_rate: float | None = None     # 换手率 %
    circulating_market_cap: float | None = None  # 流通市值
    trade_date: date | None = None         # 最新交易日


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
    outstanding_share: int | None = None
    circulating_market_cap: float | None = None
    adj_factor: float | None = None


class KLineWithMAResponse(BaseModel):
    """K线 + 均线"""
    trade_date: date
    open: float
    high: float
    low: float
    close: float
    volume: int
    amount: float
    turnover_rate: float | None = None
    # 移动均线（前端计算或后端预计算）
    ma5: float | None = None
    ma10: float | None = None
    ma20: float | None = None
    ma60: float | None = None


class MarketOverviewResponse(BaseModel):
    """大盘概览"""
    trade_date: date | None = None        # 最新交易日
    total_stocks: int = 0                  # 总股票数
    up_count: int = 0                      # 上涨家数
    down_count: int = 0                    # 下跌家数
    flat_count: int = 0                    # 平盘家数
    limit_up_count: int = 0                # 涨停家数
    limit_down_count: int = 0              # 跌停家数
    avg_change_pct: float = 0.0            # 平均涨跌幅
    total_volume: int = 0                  # 总成交量
    total_amount: float = 0.0              # 总成交额


class StocksListResponse(BaseModel):
    """股票分页列表"""
    items: list[StockResponse]
    total: int
    page: int
    page_size: int


class TreemapGroupResponse(BaseModel):
    """大盘云图：单行业分组"""
    industry: str
    stocks: list[StockWithPriceResponse]


class TreemapResponse(BaseModel):
    """大盘云图：全市场行业分组数据"""
    groups: list[TreemapGroupResponse]
    trade_date: str | None = None


class KLineListResponse(BaseModel):
    """K线列表"""
    items: list[KLineResponse]
    total: int
