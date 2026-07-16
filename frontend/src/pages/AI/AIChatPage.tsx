/**
 * AI 投资助手 — ChatGPT 风格布局 + 卡通市场先生形象
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from 'antd'
import { SendOutlined } from '@ant-design/icons'

// ================================================================
// 类型 & 工具
// ================================================================

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
}

let msgIdCounter = 0
function nextId(): string {
  return `msg-${Date.now()}-${++msgIdCounter}`
}

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
// 卡通市场先生 SVG
// ================================================================

function Mascot() {
  return (
    <span style={{ fontSize: 72, lineHeight: 1 }}>🐌</span>
  )
}

// ================================================================
// 单条消息 — ChatGPT 风格
// ================================================================

function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div
      style={{
        padding: '20px 0',
        borderBottom: isUser ? 'none' : '1px solid var(--border-color)',
        background: isUser ? 'transparent' : 'var(--bg-surface)',
      }}
    >
      <div
        className="flex gap-4"
        style={{ maxWidth: 768, margin: '0 auto', padding: '0 24px' }}
      >
        {/* 头像 */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-sm flex items-center justify-center"
          style={{
            background: isUser ? '#dc2626' : '#16a34a',
            borderRadius: isUser ? '50%' : '2px',
          }}
        >
          {isUser ? (
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>你</span>
          ) : (
            <span style={{ color: '#fff', fontSize: 13 }}>🐌</span>
          )}
        </div>

        {/* 消息内容 */}
        <div
          className="flex-1 text-sm"
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: 1.8,
            color: 'var(--text-primary)',
            minWidth: 0,
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, marginBottom: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
            {isUser ? '你' : '市场先生'}
          </p>
          <div style={{ margin: 0 }}>{msg.content}</div>
          {msg.isStreaming && (
            <span
              className="inline-block w-1.5 h-4 ml-0.5 animate-pulse"
              style={{ background: 'var(--text-secondary)', verticalAlign: 'text-bottom' }}
            />
          )}
        </div>
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
  const abortRef = useRef<AbortController | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const history = messages
      .filter((m) => !m.isStreaming)
      .slice(-40)
      .map((m) => ({ role: m.role, content: m.content }))

    const userMsg: Message = { id: nextId(), role: 'user', content: trimmed, timestamp: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    const assistantId = nextId()
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true }])
    setIsLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      let fullContent = ''
      for await (const token of parseSSEStream(response)) {
        fullContent += token
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m)))
      }
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)))
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + '\n\n⚠️ 请求失败，请稍后重试。', isStreaming: false }
              : m,
          ),
        )
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [messages, isLoading])

  return (
    <div style={{ height: 'calc(100vh - var(--navbar-height) - 2px)', display: 'flex', flexDirection: 'column' }}>
      {/* 消息区域 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {messages.length === 0 ? (
          /* 空状态 — 居中展示卡通形象 */
          <div
            className="flex flex-col items-center justify-center"
            style={{ height: '100%', gap: 16 }}
          >
            <Mascot />
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
              你好，我是市场先生
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 360 }}>
              我可以帮你分析公司、解读财报、评估估值、讨论投资理念。有什么想聊的？
            </p>
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} msg={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 底部输入栏 — ChatGPT 风格 */}
      <div style={{ padding: '0 24px 16px' }}>
        <div
          className="flex gap-3"
          style={{
            maxWidth: 768,
            margin: '0 auto',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 16,
            padding: '8px 8px 8px 20px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            placeholder="向市场先生提问…"
            disabled={isLoading}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 15,
              color: 'var(--text-primary)',
              padding: '6px 0',
            }}
          />
          {isLoading ? (
            <Button
              danger
              onClick={() => abortRef.current?.abort()}
              style={{ borderRadius: 10, height: 36, fontWeight: 600 }}
            >
              停止生成
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
                borderRadius: 10,
                height: 36,
                width: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            />
          )}
        </div>
        <p
          className="text-xs text-center mt-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          市场先生仅提供参考，不构成投资建议
        </p>
      </div>
    </div>
  )
}
