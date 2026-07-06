"""
API v1 错误定义 & 异常处理器

所有异常都会被全局处理器捕获并转换为 { code, message, data, timestamp } 统一格式。
"""

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

# ================================================================
# 业务异常
# ================================================================


class AppError(Exception):
    """应用级异常基类 — 子类指定 http_status_code 和 error_code"""

    http_status_code: int = 500
    error_code: int = -1

    def __init__(self, detail: str = "内部错误"):
        self.detail = detail


class NotFoundError(AppError):
    """资源不存在（404）"""

    http_status_code = 404
    error_code = 1001

    def __init__(self, detail: str = "资源不存在"):
        super().__init__(detail)


class ConflictError(AppError):
    """资源冲突（409），如重复添加"""

    http_status_code = 409
    error_code = 1002

    def __init__(self, detail: str = "资源已存在"):
        super().__init__(detail)


class BadRequestError(AppError):
    """请求参数错误（400）"""

    http_status_code = 400
    error_code = 1003

    def __init__(self, detail: str = "请求参数有误"):
        super().__init__(detail)


# ================================================================
# 全局异常处理器
# ================================================================

def _build_error_response(status_code: int, error_code: int, message: str) -> JSONResponse:
    """构建统一格式的错误响应 JSON"""
    from datetime import datetime, timezone

    return JSONResponse(
        status_code=status_code,
        content={
            "code": error_code,
            "message": message,
            "data": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """处理 AppError 及其子类"""
    return _build_error_response(exc.http_status_code, exc.error_code, exc.detail)


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """处理 FastAPI / Starlette 原生 HTTPException"""
    return _build_error_response(exc.status_code, -1, exc.detail)


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """处理 Pydantic 校验失败（422）"""
    errors = []
    for err in exc.errors():
        field = ".".join(str(loc) for loc in err["loc"] if loc != "body")
        errors.append(f"{field}: {err['msg']}" if field else err["msg"])
    message = "; ".join(errors) if errors else "请求参数校验失败"
    return _build_error_response(422, 1004, message)


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """兜底：处理未预料到的异常"""
    import logging
    logger = logging.getLogger("mrmarket")
    logger.exception(f"未捕获的异常: {type(exc).__name__}: {exc}")
    return _build_error_response(500, -1, "服务器内部错误")


# ================================================================
# 注册到 FastAPI app
# ================================================================

def register_exception_handlers(app):
    """将全局异常处理器注册到 FastAPI 应用实例"""
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
