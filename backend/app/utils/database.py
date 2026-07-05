"""
数据库连接管理
使用 SQLAlchemy 2.0 异步引擎 + asyncpg 驱动
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from loguru import logger

from app.utils.config import settings


# 异步引擎 — PostgreSQL 连接池
engine = create_async_engine(
    settings.database_url,
    pool_size=10,        # 连接池大小
    max_overflow=20,     # 超额连接数
    echo=False,          # SQL 日志（debug 时改 True）
)

# 会话工厂 — 每次请求创建一个新的异步会话
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # 提交后不使对象过期
)


# ORM 基类 — 所有 model 继承此类
class Base(DeclarativeBase):
    pass


async def init_db():
    """初始化数据库：创建所有表（开发环境用，生产用 Alembic 迁移）"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ 数据库表创建完成")
