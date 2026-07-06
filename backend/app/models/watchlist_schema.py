"""
自选股 Pydantic 模型
"""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class WatchlistItemResponse(BaseModel):
    """自选股列表项（含 JOIN stocks 表的名称/行业）"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    stock_code: str
    stock_name: str = ""
    market: str = ""
    industry: str | None = None
    listed_date: date | None = None
    is_st: bool = False
    added_at: datetime
    note: str | None = None

    @classmethod
    def from_orm_row(cls, watchlist) -> "WatchlistItemResponse":
        """从 ORM 对象构建，自动填充关联的 stock 字段"""
        stock = watchlist.stock
        return cls(
            id=watchlist.id,
            stock_code=watchlist.stock_code,
            stock_name=stock.name if stock else "",
            market=stock.market if stock else "",
            industry=stock.industry if stock else None,
            listed_date=stock.listed_date if stock else None,
            is_st=stock.is_st if stock else False,
            added_at=watchlist.added_at,
            note=watchlist.note,
        )


class WatchlistListResponse(BaseModel):
    """自选股列表"""
    items: list[WatchlistItemResponse]
    total: int
    page: int
    page_size: int


class WatchlistCreateRequest(BaseModel):
    """添加自选股"""
    stock_code: str
    note: str | None = None


class WatchlistUpdateRequest(BaseModel):
    """修改自选股备注"""
    note: str | None = None
