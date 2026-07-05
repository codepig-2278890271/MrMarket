"""
API v1 错误定义
"""

from fastapi import HTTPException


class NotFoundError(HTTPException):
    """资源不存在"""
    def __init__(self, detail: str = "资源不存在"):
        super().__init__(status_code=404, detail=detail)


class ConflictError(HTTPException):
    """资源冲突（如重复添加）"""
    def __init__(self, detail: str = "资源已存在"):
        super().__init__(status_code=409, detail=detail)
