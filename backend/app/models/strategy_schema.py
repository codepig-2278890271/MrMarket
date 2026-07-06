"""
策略 Pydantic 模型
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# ---------- 指标配置子模型 ----------

class IndicatorConfig(BaseModel):
    """单个技术指标配置"""
    indicator: str = Field(description="指标类型: macd, kdj, ma, rsi, bollinger")
    params: dict = Field(default_factory=dict, description="指标参数")


# ---------- 请求模型 ----------

class StrategyCreateRequest(BaseModel):
    """创建策略"""
    name: str = Field(min_length=1, max_length=100, description="策略名称")
    description: str | None = Field(default=None, description="策略描述")
    indicators: list[IndicatorConfig] = Field(default_factory=list, description="指标配置")


class StrategyUpdateRequest(BaseModel):
    """修改策略"""
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    indicators: list[IndicatorConfig] | None = None


class StrategyToggleRequest(BaseModel):
    """启停策略"""
    enabled: bool


# ---------- 响应模型 ----------

class StrategyResponse(BaseModel):
    """策略信息"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    indicators: list[IndicatorConfig] = []
    enabled: bool = True
    created_at: datetime
    updated_at: datetime


class StrategyListResponse(BaseModel):
    """策略列表"""
    items: list[StrategyResponse]
    total: int
    page: int
    page_size: int
