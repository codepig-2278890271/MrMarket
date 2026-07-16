/**
 * AI 投资助手页面
 *
 * 提供专门针对投资的 AI 对话功能：
 * - 流式输出（SSE），逐 token 显示回复
 * - 对话历史管理
 * - 快捷提问入口
 * - 投资分析专属上下文
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input, Button, Tag, Empty, Tooltip } from 'antd'
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  ClearOutlined,
  ThunderboltOutlined,
  BulbOutlined,
} from '@ant-design/icons'

// ================================================================
// 类型定义
// ================================================================

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
}

/** 快捷提问 */
const QUICK_PROMPTS = [
  { icon: '📊', label: '分析一家公司', text: '请帮我分析一家公司的框架：应该关注哪些核心指标？如何评估它的护城河和竞争优势？' },
  { icon: '📖', label: '解读财务指标', text: '请解释 ROE、ROIC、自由现金流这些指标分别代表什么？如何用它们判断一家公司的质量？' },
  { icon: '💡', label: '估值方法', text: '请介绍价值投资中常用的估值方法（DCF、PE、PB 等），以及各自的适用场景和局限性。' },
  { icon: '🏛️', label: '巴菲特投资理念', text: '请总结巴菲特和芒格的核心投资理念，以及它们对普通投资者的启示。' },
  { icon: '🌍', label: '宏观经济与股市', text: '利率、通胀、GDP 增速等宏观因素如何影响股市？价值投资者应该如何应对宏观波动？' },
  { icon: '🔍', label: '行业分析方法', text: '如何进行行业分析？如何判断一个行业是否值得投资？请提供一个系统的分析框架。' },
]

// ================================================================
// 工具函数
// ================================================================

let msgIdCounter = 0
function nextId(): string {
  return `msg-${Date.now()}-${++msgIdCounter}`
}

/** 解析 SSE 流 */
async function* parseSSEStream(response: Response): AsyncGenerator<string> {
  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') return
        yield data
      }
    }
  }
}

// ================================================================
// 聊天消息组件
// ================================================================

function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'

  return (
    <div
      className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}
      style={{ alignItems: 'flex-start' }}
    >
      {/* 头像 */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
            : 'linear-gradient(135deg, #16a34a, #15803d)',
          color: '#fff',
        }}
      >
        {isUser ? <UserOutlined /> : <RobotOutlined />}
      </div>

      {/* 消息内容 */}
      <div
        className="max-w-[75%] rounded-xl px-4 py-3"
        style={{
          background: isUser ? '#dc2626' : 'var(--bg-surface)',
          color: isUser ? '#fff' : 'var(--text-primary)',
          border: isUser ? 'none' : '1px solid var(--border-color)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.7,
          fontSize: 14,
        }}
      >
        {msg.content}
        {msg.isStreaming && (
          <span
            className="inline-block w-2 h-4 ml-0.5 animate-pulse"
            style={{ background: 'var(--text-secondary)', verticalAlign: 'text-bottom' }}
          />
        )}
      </div>
    </div>
  )
}

// ================================================================
// 主页面
// ================================================================

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<any>(null)
  const abortRef = useRef<AbortController | null>(null)

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // 发送消息
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    // 构建历史（取最近 20 轮）
    const history = messages
      .filter((m) => !m.isStreaming)
      .slice(-40)
      .map((m) => ({ role: m.role, content: m.content }))

    // 添加用户消息
    const userMsg: Message = {
      id: nextId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    // 创建 AI 占位消息
    const assistantId = nextId()
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }
    setMessages((prev) => [...prev, assistantMsg])
    setIsLoading(true)

    // 发起流式请求
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      let fullContent = ''
      for await (const token of parseSSEStream(response)) {
        fullContent += token
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fullContent } : m
          )
        )
      }

      // 标记流式完成
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        )
      )
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // 用户主动取消
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || '（已取消）', isStreaming: false }
              : m
          )
        )
      } else {
        // 错误
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: m.content + '\n\n⚠️ 请求失败，请检查 AI 服务配置或稍后重试。',
                  isStreaming: false,
                }
              : m
          )
        )
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [messages, isLoading])

  // 取消当前对话
  const handleStop = () => {
    abortRef.current?.abort()
  }

  // 清空对话
  const handleClear = () => {
    setMessages([])
  }

  // 快捷提问
  const handleQuickPrompt = (text: string) => {
    setInput(text)
    inputRef.current?.focus()
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RobotOutlined style={{ color: '#16a34a' }} />
          AI 投资助手
        </h1>
        {messages.length > 0 && (
          <Button
            icon={<ClearOutlined />}
            onClick={handleClear}
            size="small"
            disabled={isLoading}
          >
            清空对话
          </Button>
        )}
      </div>

      {/* 聊天区域 */}
      <div
        className="rounded-xl mb-4"
        style={{
          background: 'var(--bg-app)',
          border: '1px solid var(--border-color)',
          minHeight: 400,
          maxHeight: 'calc(100vh - 280px)',
          overflow: 'auto',
          padding: 20,
        }}
      >
        {messages.length === 0 ? (
          /* 空状态 — 展示快捷提问 */
          <div className="flex flex-col items-center justify-center py-12">
            <RobotOutlined
              style={{
                fontSize: 56,
                color: '#16a34a',
                opacity: 0.3,
                marginBottom: 16,
              }}
            />
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              投资分析 AI 助手
            </h3>
            <p
              className="text-sm mb-6 text-center"
              style={{ color: 'var(--text-secondary)', maxWidth: 480 }}
            >
              我可以帮你分析公司、解读财报、评估估值、讨论投资理念。
              <br />
              请提出你的投资问题，或者从下方快捷入口开始。
            </p>

            {/* 快捷提问网格 */}
            <div
              className="grid gap-2 w-full"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              }}
            >
              {QUICK_PROMPTS.map((prompt) => (
                <Tooltip key={prompt.label} title={prompt.text}>
                  <button
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left border-none cursor-pointer transition-colors"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                    onClick={() => handleQuickPrompt(prompt.text)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#16a34a'
                      e.currentTarget.style.background = '#f0fdf4'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)'
                      e.currentTarget.style.background = 'var(--bg-surface)'
                    }}
                  >
                    <span>{prompt.icon}</span>
                    <span>{prompt.label}</span>
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>
        ) : (
          /* 消息列表 */
          <div>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} msg={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="flex gap-2">
        <Input.TextArea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault()
              sendMessage(input)
            }
          }}
          placeholder="输入你的投资问题… (Enter 发送，Shift+Enter 换行)"
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={isLoading}
          style={{ flex: 1 }}
        />
        {isLoading ? (
          <Button
            danger
            icon={<span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#fff' }} />}
            onClick={handleStop}
            style={{ height: 'auto', minHeight: 40 }}
          >
            停止
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            style={{
              background: '#16a34a',
              borderColor: '#16a34a',
              height: 'auto',
              minHeight: 40,
            }}
          >
            发送
          </Button>
        )}
      </div>

      {/* 模型提示 */}
      <p
        className="text-xs mt-2 text-center"
        style={{ color: 'var(--text-secondary)' }}
      >
        AI 回复仅供参考，不构成投资建议。投资有风险，决策需谨慎。
      </p>
    </div>
  )
}
