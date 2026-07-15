/**
 * 价值投资页面
 *
 * 价值投资资源中心 — 提供经典书籍、视频推荐、重要文献、
 * 大师语录和核心概念的阅读与学习。
 */
import { useState } from 'react'
import { Tabs, Card, Tag, List, Button } from 'antd'
import {
  BookOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  BulbOutlined,
  LinkOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  BOOKS,
  VIDEOS,
  DOCUMENTS,
  QUOTES,
  CONCEPTS,
} from './valueInvestingData'

// ==================== 标签页配置 ====================

const TAB_ITEMS = [
  { key: 'books', icon: <BookOutlined />, label: '经典书籍' },
  { key: 'videos', icon: <PlayCircleOutlined />, label: '视频推荐' },
  { key: 'docs', icon: <FileTextOutlined />, label: '重要文献' },
  { key: 'quotes', icon: <BulbOutlined />, label: '大师语录' },
  { key: 'concepts', icon: <BulbOutlined />, label: '核心概念' },
]

// ==================== 颜色主题（红绿双色） ====================

const COLORS = {
  primary: '#dc2626', // 红 — 上涨、安全边际警示
  accent: '#16a34a', // 绿 — 价值、长期持有
  gold: '#d4a017', // 金 — 经典
}

// ==================== Hero 区域 ====================

function HeroSection() {
  return (
    <div
      className="rounded-xl p-6 mb-6"
      style={{
        background: 'linear-gradient(135deg, #fef2f2 0%, #f0fdf4 100%)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* 左侧：市场先生故事 */}
        <div className="flex-1">
          <h1
            className="text-2xl font-bold mb-3"
            style={{ color: COLORS.primary }}
          >
            💡 价值投资
          </h1>
          <blockquote
            className="border-l-4 pl-4 mb-3 text-base leading-relaxed"
            style={{
              borderLeftColor: COLORS.primary,
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
            }}
          >
            假设你持有某家公司的一小部分股份，你有一位合伙人名叫市场先生。他每天都会向你报出一个价格——
            有时高得离谱，有时低得荒谬——你可以选择以他的价格买入更多，也可以卖出你手中的股份，当然你也可以
            完全无视他。市场先生并不介意被冷落，他明天还会带着新报价回来。
          </blockquote>
          <p className="text-sm font-medium" style={{ color: COLORS.accent }}>
            关键在于：市场先生是你的仆人，而非你的向导。
            他的情绪波动是你的机会，而非你的行动指令。
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            —— 本杰明·格雷厄姆《聪明的投资者》，1949 年
          </p>
        </div>

        {/* 右侧：快速统计 */}
        <div
          className="rounded-lg p-4 flex-shrink-0"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            minWidth: 160,
          }}
        >
          <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
            资源导航
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <span>
              📚 <strong>{BOOKS.length}</strong> 本经典书籍
            </span>
            <span>
              🎬 <strong>{VIDEOS.length}</strong> 部推荐视频
            </span>
            <span>
              📄 <strong>{DOCUMENTS.length}</strong> 篇重要文献
            </span>
            <span>
              💬 <strong>{QUOTES.length}</strong> 条大师语录
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== 书籍卡片 ====================

function BooksPanel() {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
      }}
    >
      {BOOKS.map((book) => (
        <Card
          key={book.title}
          size="small"
          hoverable
          styles={{
            body: { padding: 20 },
          }}
          style={{
            height: '100%',
            border: '1px solid var(--border-color)',
          }}
        >
          <div className="flex flex-col h-full">
            {/* 标题行 */}
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-base font-bold m-0" style={{ color: 'var(--text-primary)' }}>
                {book.title}
              </h3>
            </div>

            {/* 作者 */}
            <div
              className="text-xs mb-2 flex items-center gap-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              <UserOutlined />
              {book.author}
            </div>

            {/* 简介 */}
            <p className="text-sm mb-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {book.description}
            </p>

            {/* 为什么推荐 */}
            <div
              className="text-sm mb-3 p-2 rounded flex-1"
              style={{
                background: 'var(--bg-app)',
                borderLeft: `3px solid ${COLORS.accent}`,
              }}
            >
              <span style={{ color: COLORS.accent, fontWeight: 600 }}>推荐理由：</span>
              <span style={{ color: 'var(--text-primary)' }}>{book.why}</span>
            </div>

            {/* 标签 */}
            <div className="flex flex-wrap gap-1 mb-3">
              {book.tags.map((t) => (
                <Tag key={t} color="volcano" style={{ margin: 0 }}>
                  {t}
                </Tag>
              ))}
            </div>

            {/* 链接 */}
            <div className="flex gap-2 mt-auto">
              {book.links.map((link) => (
                <Button
                  key={link.label}
                  type="default"
                  size="small"
                  icon={<LinkOutlined />}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ==================== 视频列表 ====================

function VideosPanel() {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
      }}
    >
      {VIDEOS.map((video) => (
        <Card
          key={video.title}
          size="small"
          hoverable
          styles={{ body: { padding: 20 } }}
          style={{
            height: '100%',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* 视频缩略图占位 + 播放按钮 */}
          <div
            className="rounded-lg mb-3 flex items-center justify-center"
            style={{
              height: 120,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <PlayCircleOutlined
              style={{
                fontSize: 48,
                color: 'rgba(255,255,255,0.9)',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
              }}
            />
            {video.duration && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                }}
              >
                <ClockCircleOutlined className="mr-1" />
                {video.duration}
              </span>
            )}
          </div>

          {/* 标题 */}
          <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            {video.title}
          </h3>

          {/* 讲者 + 平台 */}
          <div
            className="text-xs mb-2 flex items-center gap-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            <UserOutlined />
            {video.speaker}
            <span className="mx-1">·</span>
            <Tag
              color="blue"
              style={{ margin: 0, fontSize: 11, lineHeight: '18px' }}
            >
              {video.platform}
            </Tag>
          </div>

          {/* 简介 */}
          <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {video.description}
          </p>

          {/* 标签 */}
          <div className="flex flex-wrap gap-1 mb-3">
            {video.tags.map((t) => (
              <Tag key={t} color="red" style={{ margin: 0 }}>
                {t}
              </Tag>
            ))}
          </div>

          {/* 观看链接 */}
          <Button
            type="primary"
            size="small"
            icon={<PlayCircleOutlined />}
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: COLORS.primary, borderColor: COLORS.primary }}
          >
            搜索观看
          </Button>
        </Card>
      ))}
    </div>
  )
}

// ==================== 文献列表 ====================

function DocumentsPanel() {
  return (
    <List
      dataSource={DOCUMENTS}
      split={false}
      renderItem={(doc) => (
        <List.Item style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
          <Card
            size="small"
            hoverable
            styles={{ body: { padding: 20 } }}
            style={{
              width: '100%',
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              {/* 左侧：内容 */}
              <div className="flex-1 min-w-0">
                {/* 标题 */}
                <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  <FileTextOutlined className="mr-2" style={{ color: COLORS.accent }} />
                  {doc.title}
                </h3>

                {/* 作者 */}
                <div
                  className="text-xs mb-2 flex items-center gap-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <UserOutlined />
                  {doc.author}
                </div>

                {/* 简介 */}
                <p className="text-sm mb-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {doc.description}
                </p>

                {/* 标签 */}
                <div className="flex flex-wrap gap-1">
                  {doc.tags.map((t) => (
                    <Tag key={t} color="green" style={{ margin: 0 }}>
                      {t}
                    </Tag>
                  ))}
                </div>
              </div>

              {/* 右侧：操作 */}
              <div className="flex-shrink-0 flex items-start">
                <Button
                  type="primary"
                  icon={<LinkOutlined />}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: COLORS.accent, borderColor: COLORS.accent }}
                >
                  阅读原文
                </Button>
              </div>
            </div>
          </Card>
        </List.Item>
      )}
    />
  )
}

// ==================== 大师语录 ====================

function QuotesPanel() {
  const [visibleCount, setVisibleCount] = useState(6)
  const hasMore = visibleCount < QUOTES.length

  return (
    <div>
      <div
        className="grid gap-4 mb-4"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        }}
      >
        {QUOTES.slice(0, visibleCount).map((quote, idx) => (
          <Card
            key={idx}
            size="small"
            styles={{ body: { padding: 24 } }}
            style={{
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
            }}
          >
            {/* 引导号 */}
            <div
              className="text-4xl leading-none mb-2"
              style={{ color: COLORS.primary, opacity: 0.3 }}
            >
              &ldquo;
            </div>

            {/* 语录正文 */}
            <p
              className="text-base leading-relaxed mb-4"
              style={{
                color: 'var(--text-primary)',
                fontStyle: 'italic',
              }}
            >
              {quote.text}
            </p>

            {/* 出处 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold" style={{ color: COLORS.accent }}>
                  —— {quote.author}
                </div>
                {quote.source && (
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {quote.source}
                  </div>
                )}
              </div>
              {/* 大师头像占位 */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{
                  background: 'linear-gradient(135deg, #fef2f2, #f0fdf4)',
                  border: `2px solid ${COLORS.accent}`,
                }}
              >
                {quote.author.charAt(0)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 加载更多 */}
      {hasMore && (
        <div className="text-center">
          <Button
            type="dashed"
            size="large"
            onClick={() => setVisibleCount((c) => Math.min(c + 6, QUOTES.length))}
            style={{ color: COLORS.primary, borderColor: COLORS.primary }}
          >
            查看更多语录（剩余 {QUOTES.length - visibleCount} 条）
          </Button>
        </div>
      )}
    </div>
  )
}

// ==================== 核心概念 ====================

function ConceptsPanel() {
  return (
    <div className="space-y-4">
      {CONCEPTS.map((concept, idx) => (
        <Card
          key={concept.key}
          size="small"
          styles={{ body: { padding: 24 } }}
          style={{
            border: '1px solid var(--border-color)',
            borderLeft: `4px solid ${idx % 2 === 0 ? COLORS.primary : COLORS.accent}`,
          }}
        >
          {/* 编号 */}
          <div
            className="text-xs font-bold mb-1"
            style={{ color: idx % 2 === 0 ? COLORS.primary : COLORS.accent }}
          >
            概念 {String(idx + 1).padStart(2, '0')}
          </div>

          {/* 标题 */}
          <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            {concept.title}
          </h3>

          {/* 描述 */}
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {concept.description}
          </p>
        </Card>
      ))}

      {/* 底部提示 */}
      <div
        className="rounded-lg p-4 text-center"
        style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #f0fdf4 100%)',
          border: '1px solid var(--border-color)',
        }}
      >
        <p className="text-sm m-0" style={{ color: 'var(--text-secondary)' }}>
          以上概念是价值投资的基石。建议去「经典书籍」和「视频推荐」中深入学习每一个概念。
        </p>
      </div>
    </div>
  )
}

// ==================== 主页面 ====================

export default function PhilosophyPage() {
  const [activeTab, setActiveTab] = useState('books')

  return (
    <div>
      {/* Hero 区域 */}
      <HeroSection />

      {/* Tab 内容区 */}
      <Card
        styles={{ body: { padding: '20px 24px' } }}
        style={{
          border: '1px solid var(--border-color)',
          background: 'var(--bg-surface)',
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={TAB_ITEMS.map((tab) => ({
            key: tab.key,
            label: (
              <span className="flex items-center gap-1.5 px-1">
                {tab.icon}
                {tab.label}
              </span>
            ),
            children: (
              <div className="mt-2" style={{ minHeight: 400 }}>
                {tab.key === 'books' && <BooksPanel />}
                {tab.key === 'videos' && <VideosPanel />}
                {tab.key === 'docs' && <DocumentsPanel />}
                {tab.key === 'quotes' && <QuotesPanel />}
                {tab.key === 'concepts' && <ConceptsPanel />}
              </div>
            ),
          }))}
          tabBarStyle={{
            marginBottom: 24,
            borderBottom: '1px solid var(--border-color)',
          }}
        />
      </Card>
    </div>
  )
}
