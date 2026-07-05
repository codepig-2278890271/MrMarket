"""
自选股 ORM 模型
用户收藏关注的股票，一条记录对应一只股票
"""

from datetime import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Watchlist(Base):
    """
    自选股表
    每行 = 一只被收藏的股票
    """
    __tablename__ = "watchlist"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, comment="自增主键")

    stock_code: Mapped[str] = mapped_column(
        String(10), ForeignKey("stocks.code"), nullable=False, comment="股票代码"
    )

    added_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, nullable=False, comment="添加时间"
    )

    note: Mapped[str | None] = mapped_column(
        Text, comment="用户备注"
    )

    # 关联股票基本信息（只读，用于 JOIN 展示）
    stock: Mapped["Stock"] = relationship(lazy="joined")

    __table_args__ = (
        UniqueConstraint("stock_code", name="uq_watchlist_stock_code"),
    )

    def __repr__(self) -> str:
        return f"<Watchlist(stock_code={self.stock_code}, added={self.added_at})>"
