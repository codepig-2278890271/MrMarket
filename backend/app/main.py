"""
MrMarket FastAPI 应用入口
提供 REST API 服务，端口默认 8000
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.utils.config import settings
from app.utils.database import init_db

# 必须 import models，否则 SQLAlchemy 的 Base.metadata 找不到表
import app.models  # noqa: F401


# ================================================================
# 应用生命周期管理
# ================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动 & 关闭时的回调"""
    logger.info(f"🚀 {settings.app_name} v{settings.app_version} 启动中...")

    # 自动建表（开发环境用，生产用 Alembic 迁移）
    await init_db()

    logger.info(f"📡 API 地址: http://127.0.0.1:8000{settings.api_prefix}")
    logger.info(f"📖 API 文档: http://127.0.0.1:8000/docs")

    yield  # ← 应用运行期间

    # 关闭时：清理资源
    logger.info(f"👋 {settings.app_name} 正在关闭...")


# ================================================================
# 创建 FastAPI 应用实例
# ================================================================

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="市场先生 — A股价值投资辅助分析工具",
    lifespan=lifespan,
)

# CORS 跨域配置（开发环境允许前端 5173 端口访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================================================================
# 健康检查 & 根路由
# ================================================================

@app.get("/")
async def root():
    """根路径 — 返回服务基本信息"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
    }


@app.get("/api/v1/health")
async def health_check():
    """健康检查接口 — 供前端和监控使用"""
    import datetime
    return {
        "code": 0,
        "message": "ok",
        "data": {
            "status": "healthy",
            "version": settings.app_version,
        },
        "timestamp": datetime.datetime.now().isoformat(),
    }


# ================================================================
# 注册 v1 路由模块
# ================================================================

from app.api.v1.router import router as v1_router
app.include_router(v1_router, prefix=settings.api_prefix)

# TODO: 逐步接入其余路由模块
# from app.api.v1.endpoints import news, backtest, trade
# app.include_router(news.router, prefix=settings.api_prefix)
# app.include_router(backtest.router, prefix=settings.api_prefix)
# app.include_router(trade.router, prefix=settings.api_prefix)
