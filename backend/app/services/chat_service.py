"""
AI 对话服务
封装 OpenAI/DeepSeek 兼容 API 调用，支持流式输出
"""

import json
from collections.abc import AsyncGenerator

import httpx
from loguru import logger

from app.utils.config import settings

# 系统提示词 — 专门针对投资的 AI 助手
SYSTEM_PROMPT = """你是 MrMarket 的投资分析助手，专注于帮助用户进行价值投资分析和决策。

你的核心能力：
1. **公司分析** — 分析公司的商业模式、护城河、竞争优势、管理层质量
2. **财报解读** — 解读财务报表（资产负债表、利润表、现金流量表），识别关键财务指标
3. **估值分析** — 运用 DCF、PE、PB、ROE、ROIC 等估值方法评估公司内在价值
4. **行业分析** — 分析行业竞争格局、发展趋势、政策影响
5. **宏观经济** — 解读宏观经济数据对投资的影响
6. **投资理念** — 分享价值投资理念（格雷厄姆、巴菲特、芒格、段永平等）

回答原则：
- 提供客观、平衡的分析，明确区分事实和观点
- 不推荐具体的买卖操作，只提供分析框架和思考角度
- 用数据和逻辑支撑你的观点
- 对不确定的事情坦诚说明
- 鼓励用户独立思考，做好自己的功课
- 引用经典价值投资理念时注明出处

如果你被问到超出投资分析范围的问题，礼貌地引导用户回到投资相关话题。"""

# 投资对话系统提示词
INVESTMENT_SYSTEM_PROMPT = SYSTEM_PROMPT

# API 配置
API_KEY = settings.deepseek_api_key or settings.openai_api_key or ""
API_BASE = (
    settings.deepseek_api_base
    if settings.deepseek_api_key
    else settings.openai_api_base
)
MODEL = "deepseek-chat" if settings.deepseek_api_key else "gpt-4o"


def _build_messages(user_message: str, history: list[dict] | None = None) -> list[dict]:
    """构建消息列表"""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})
    return messages


async def chat(
    message: str,
    history: list[dict] | None = None,
) -> str:
    """
    非流式对话 — 发送消息并获取完整回复

    Args:
        message: 用户消息
        history: 历史对话 [{"role": "user", "content": "..."}, ...]

    Returns:
        AI 回复文本
    """
    if not API_KEY:
        return "⚠️ AI 服务未配置。请在 .env 中设置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY。"

    messages = _build_messages(message, history)

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{API_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": MODEL,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 2048,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    except httpx.HTTPStatusError as e:
        logger.error(f"AI API 请求失败: {e.response.status_code} — {e.response.text}")
        return f"⚠️ AI 服务请求失败（HTTP {e.response.status_code}），请稍后重试。"
    except Exception as e:
        logger.error(f"AI 服务异常: {e}")
        return f"⚠️ AI 服务异常，请稍后重试。"


async def chat_stream(
    message: str,
    history: list[dict] | None = None,
) -> AsyncGenerator[str, None]:
    """
    流式对话 — 逐 token 产出回复

    Args:
        message: 用户消息
        history: 历史对话

    Yields:
        每个 token 的文本片段
    """
    if not API_KEY:
        yield "⚠️ AI 服务未配置。请在 .env 中设置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY。"
        return

    messages = _build_messages(message, history)

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{API_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": MODEL,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 2048,
                    "stream": True,
                },
            ) as resp:
                resp.raise_for_status()

                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[6:]  # 去掉 "data: " 前缀
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue

    except httpx.HTTPStatusError as e:
        logger.error(f"AI API 流式请求失败: {e.response.status_code}")
        yield f"\n\n⚠️ AI 服务请求失败（HTTP {e.response.status_code}），请稍后重试。"
    except Exception as e:
        logger.error(f"AI 服务流式异常: {e}")
        yield f"\n\n⚠️ AI 服务异常，请稍后重试。"
