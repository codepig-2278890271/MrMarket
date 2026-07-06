"""
Alembic 迁移环境配置
从 app.utils.config 读取数据库 URL，自动发现所有 ORM 模型
"""

import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

# Alembic Config 对象
config = context.config

# 配置日志
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ------- 从 MrMarket 配置中读取数据库 URL 和 Metadata -------
from app.utils.config import settings
from app.utils.database import Base

# 导入所有模型，确保 Base.metadata 包含全部表
import app.models  # noqa: F401

target_metadata = Base.metadata

# 使用异步数据库 URL（与生产一致）
database_url = settings.database_url


def run_migrations_offline() -> None:
    """
    离线模式：生成 SQL 脚本而不是直接执行
    用于审查或手动执行迁移
    """
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    """在同步上下文中执行迁移"""
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """
    在线模式：连接真实数据库并执行迁移
    使用异步引擎的 run_sync 桥接 Alembic 同步 API
    """
    connectable = create_async_engine(
        database_url,
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
