"""
API 依赖注入
提供 get_db 等 FastAPI 依赖
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.database import async_session


async def get_db() -> AsyncSession:
    """FastAPI 依赖注入：获取数据库会话，请求结束后自动关闭"""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
