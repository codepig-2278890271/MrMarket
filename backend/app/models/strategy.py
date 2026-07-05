"""
策略 ORM 模型
存储用户创建的技术分析策略配置
"""

from datetime import datetime
from sqlalchemy import String, Text, DateTime, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.utils.database import Base


class Strategy(Base):
    """
    策略表
    每条记录 = 一个用户创建的技术分析策略
    """
    __tablename__ = "strategies"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, comment="自增主键")

    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="策略名称")

    description: Mapped[str | None] = mapped_column(Text, comment="策略描述")

    # 技术指标配置，JSON 格式
    # 示例: [{"indicator": "MACD", "params": {"fast": 12, "slow": 26, "signal": 9}}, ...]
    indicators: Mapped[dict] = mapped_column(JSON, default=list, comment="指标配置列表")

    # 是否启用
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, nullable=False, comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, nullable=False, comment="更新时间"
    )

    def __repr__(self) -> str:
        return f"<Strategy(id={self.id}, name={self.name}, enabled={self.enabled})>"
