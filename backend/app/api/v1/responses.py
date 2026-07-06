"""
API v1 统一响应格式

所有接口均返回 { code: int, message: str, data: T } 格式。
分页接口的 data 为 { items, total, page, page_size }。
错误由异常处理器统一转换为该格式。
"""

from datetime import datetime, timezone
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """统一 API 响应包装器"""

    code: int = 0
    message: str = "ok"
    data: T | None = None
    timestamp: str = ""

    @classmethod
    def ok(cls, data: T, message: str = "ok") -> "APIResponse[T]":
        return cls(
            code=0,
            message=message,
            data=data,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    @classmethod
    def error(cls, code: int, message: str, data: T | None = None) -> "APIResponse[T]":
        return cls(
            code=code,
            message=message,
            data=data,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )


class PaginatedData(BaseModel, Generic[T]):
    """分页数据结构"""

    items: list[T]
    total: int
    page: int
    page_size: int
