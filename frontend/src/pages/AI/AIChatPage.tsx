/**
 * AI 投资助手 — 极简对话框
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input, Button } from 'antd'
import { SendOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons'

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
// 单条消息
// ================================================================

function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div
      className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}
      style={{ alignItems: 'flex-start', marginBottom: 16 }}
    >
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs"
        style={{
          background: isUser ? '#dc2626' : '#16a34a',
          color: '#fff',
        }}
      >
        {isUser ? <UserOutlined /> : <RobotOutlined />}
      </div>
      <div
        className="max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm"
        style={{
          background: isUser ? '#dc2626' : 'var(--bg-surface)',
          color: isUser ? '#fff' : 'var(--text-primary)',
          border: isUser ? 'none' : '1px solid var(--border-color)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.7,
        }}
      >
        {msg.content}
        {msg.isStreaming && (
          <span
            className="inline-block w-1.5 h-4 ml-0.5 animate-pulse"
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
    <div style={{ height: 'calc(100vh - var(--navbar-height) - 2px)', display: 'flex', flexDirection: 'column', maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>
      {/* 消息列表 */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px 0',
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ opacity: 0.35 }}>
            <RobotOutlined style={{ fontSize: 48, color: '#16a34a', marginBottom: 12 }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              有什么投资问题尽管问我
            </p>
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} msg={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入栏 */}
      <div
        className="flex gap-2 py-3"
        style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-app)' }}
      >
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
          placeholder="输入你的问题… (Enter 发送，Shift+Enter 换行)"
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={isLoading}
          style={{ flex: 1 }}
        />
        {isLoading ? (
          <Button
            danger
            type="primary"
            onClick={() => abortRef.current?.abort()}
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
    </div>
  )
}
