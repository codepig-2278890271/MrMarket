"""
AI 对话端点
提供投资分析对话接口（支持流式 SSE 输出）
"""

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from loguru import logger
from pydantic import BaseModel, Field

from app.api.v1.responses import APIResponse
from app.services.chat_service import chat, chat_stream

router = APIRouter(prefix="/chat", tags=["AI 对话"])


# ================================================================
# 请求模型
# ================================================================


class ChatRequest(BaseModel):
    """对话请求"""

    message: str = Field(..., min_length=1, max_length=4000, description="用户消息")
    history: list[dict] | None = Field(
        default=None,
        description="历史对话 [{\"role\": \"user/assistant\", \"content\": \"...\"}]",
    )


class ChatResponse(BaseModel):
    """对话响应"""

    reply: str = Field(..., description="AI 回复")
    model: str = Field(..., description="使用的模型")


# ================================================================
# POST /chat — 非流式对话
# ================================================================


@router.post("")
async def chat_endpoint(body: ChatRequest):
    """发送消息给 AI 投资助手，获取完整回复"""
    logger.info(f"📨 AI 对话请求: {body.message[:80]}...")

    reply = await chat(message=body.message, history=body.history)

    return APIResponse.ok(
        data=ChatResponse(
            reply=reply,
            model="deepseek-chat",
        )
    )


# ================================================================
# POST /chat/stream — 流式对话（SSE）
# ================================================================


@router.post("/stream")
async def chat_stream_endpoint(body: ChatRequest, request: Request):
    """发送消息给 AI 投资助手，流式返回 token（Server-Sent Events）"""

    logger.info(f"📨 AI 流式对话请求: {body.message[:80]}...")

    async def event_generator():
        """SSE 事件生成器 — 逐 token 推送给前端"""
        try:
            async for token in chat_stream(message=body.message, history=body.history):
                # 检查客户端是否已断开
                if await request.is_disconnected():
                    logger.debug("🔌 客户端断开连接，停止流式输出")
                    break
                # SSE 格式：data: <content>\n\n
                yield f"data: {token}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"流式对话异常: {e}")
            yield f"data: ⚠️ 对话异常: {e}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用 nginx 缓冲
        },
    )
