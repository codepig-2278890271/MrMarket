"""
MrMarket 应用配置
使用 pydantic-settings 从环境变量 / .env 文件加载配置
所有默认值适用于本地开发环境
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用全局配置"""

    # ---------- 应用基础 ----------
    app_name: str = "MrMarket"
    app_version: str = "0.1.0"
    debug: bool = True

    # ---------- 数据库 ----------
    # PostgreSQL 连接（本地开发默认值）
    database_url: str = "postgresql+asyncpg://mrmarket:mrmarket@localhost:5432/mrmarket"

    # ---------- Redis ----------
    redis_url: str = "redis://localhost:6379/0"

    # ---------- API ----------
    api_prefix: str = "/api/v1"

    # ---------- 数据源 ----------
    # Tushare Pro token（可选，有则优先使用）
    tushare_token: str = ""

    # ---------- AI 服务 ----------
    openai_api_key: str = ""
    openai_api_base: str = "https://api.openai.com/v1"
    deepseek_api_key: str = ""
    deepseek_api_base: str = "https://api.deepseek.com/v1"

    # ---------- 日志 ----------
    log_level: str = "INFO"

    model_config = {
        "env_file": ".env",        # 从 backend/ 目录读取 .env
        "env_file_encoding": "utf-8",
        "extra": "ignore",         # 忽略未定义的环境变量
    }


# 全局单例 — 其他模块直接 import 使用
settings = Settings()
