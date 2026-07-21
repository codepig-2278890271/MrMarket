"""
股票相关 ORM 模型
- Stock: A股股票基本信息
- KLineDaily: 日K线数据
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, Date, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.utils.database import Base


class Stock(Base):
    """
    A股股票基本信息表
    数据来源：AkShare stock_info_a_code_name()
    """
    __tablename__ = "stocks"

    # 股票代码，如 '600519'，主键
    code: Mapped[str] = mapped_column(String(10), primary_key=True, comment="股票代码")

    # 股票名称，如 '贵州茅台'
    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="股票名称")

    # 交易所：SH=上海, SZ=深圳, BJ=北京
    market: Mapped[str] = mapped_column(String(2), nullable=False, comment="交易所(SH/SZ/BJ)")

    # 申万一级行业
    industry: Mapped[str | None] = mapped_column(String(50), comment="申万一级行业")

    # 上市日期
    listed_date: Mapped[date | None] = mapped_column(Date, comment="上市日期")

    # 是否 ST（特别处理）
    is_st: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否ST")

    # 关联的K线数据
    klines: Mapped[list["KLineDaily"]] = relationship(
        back_populates="stock", lazy="raise"
    )

    def __repr__(self) -> str:
        return f"<Stock(code={self.code}, name={self.name})>"


class KLineDaily(Base):
    """
    日K线数据表
    每行 = 一只股票一个交易日的一条K线记录
    数据量最大（约5000只 × 250日/年），需定期分区管理
    """
    __tablename__ = "kline_daily"

    # 联合主键：股票代码 + 交易日期
    stock_code: Mapped[str] = mapped_column(
        String(10), ForeignKey("stocks.code"), primary_key=True, comment="股票代码"
    )
    trade_date: Mapped[date] = mapped_column(
        Date, primary_key=True, comment="交易日期"
    )

    # OHLCV 价格数据（Decimal 保证精度，10位有效数字，3位小数）
    open: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), nullable=False, comment="开盘价"
    )
    high: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), nullable=False, comment="最高价"
    )
    low: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), nullable=False, comment="最低价"
    )
    close: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), nullable=False, comment="收盘价"
    )
    pre_close: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), nullable=False, comment="前收盘价"
    )

    # 成交数据
    volume: Mapped[int] = mapped_column(
        BigInteger, nullable=False, comment="成交量（股）"
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(20, 2), nullable=False, comment="成交额（元）"
    )

    # 换手率（百分比，如 5.23 表示 5.23%）
    turnover_rate: Mapped[Decimal | None] = mapped_column(
        Numeric(8, 4), comment="换手率 %"
    )

    # 流通股本（股）
    outstanding_share: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, comment="流通股本（股）"
    )

    # 流通市值（元）= close × outstanding_share
    circulating_market_cap: Mapped[Decimal | None] = mapped_column(
        Numeric(20, 2), nullable=True, comment="流通市值（元）"
    )

    # 复权因子（前复权用）
    adj_factor: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 6), comment="复权因子"
    )

    # 关联的股票
    stock: Mapped["Stock"] = relationship(back_populates="klines", lazy="raise")

    # 索引：按股票代码查K线、按日期范围查询
    __table_args__ = (
        Index("ix_kline_date", "trade_date"),
        Index("ix_kline_code_date", "stock_code", "trade_date"),
    )

    def __repr__(self) -> str:
        return f"<KLine({self.stock_code}, {self.trade_date}, c={self.close})>"
