"""
Redis 缓存工具
提供异步缓存读写，用于加速高频只读查询（如K线数据）
"""

import json
from typing import Any

import redis.asyncio as aioredis
from loguru import logger

from app.utils.config import settings

# 全局 Redis 连接池（延迟初始化）
_pool: aioredis.ConnectionPool | None = None
_client: aioredis.Redis | None = None

# 缓存 TTL 常量（秒）
TTL_KLINE = 300        # K线数据缓存 5 分钟
TTL_STOCK_LIST = 600   # 股票列表缓存 10 分钟


async def get_redis() -> aioredis.Redis:
    """获取 Redis 客户端（懒初始化 + 连接复用）"""
    global _pool, _client
    if _client is None:
        try:
            _pool = aioredis.ConnectionPool.from_url(
                settings.redis_url,
                max_connections=10,
                decode_responses=True,
            )
            _client = aioredis.Redis(connection_pool=_pool)
            # 健康检查
            await _client.ping()
            logger.info("✅ Redis 连接成功")
        except Exception as e:
            logger.warning(f"⚠️ Redis 连接失败，缓存功能禁用: {e}")
            _client = None
            _pool = None
            raise
    return _client


async def cache_get(key: str) -> Any | None:
    """从缓存读取 JSON 值，key 不存在或 Redis 不可用时返回 None"""
    try:
        client = await get_redis()
        raw = await client.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception:
        return None


async def cache_set(key: str, value: Any, ttl: int = TTL_KLINE) -> None:
    """将值序列化为 JSON 写入缓存"""
    try:
        client = await get_redis()
        await client.setex(key, ttl, json.dumps(value, default=str))
    except Exception:
        pass  # 缓存写入失败不应影响主流程


async def cache_delete(pattern: str) -> None:
    """按模式删除缓存（如 'klines:*' ）"""
    try:
        client = await get_redis()
        keys = await client.keys(pattern)
        if keys:
            await client.delete(*keys)
    except Exception:
        pass


async def close_redis() -> None:
    """关闭 Redis 连接池"""
    global _client, _pool
    if _client:
        await _client.close()
        _client = None
    if _pool:
        await _pool.disconnect()
        _pool = None
