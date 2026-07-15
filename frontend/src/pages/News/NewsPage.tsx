/**
 * 资讯页面
 *
 * 重大财经消息、市场热点、财报日历
 * 后续将接入实时数据源，当前展示近期重要事件
 */

import { Card, Tag, Timeline } from 'antd'
import {
  ThunderboltOutlined,
  CalendarOutlined,
  FileTextOutlined,
  FireOutlined,
} from '@ant-design/icons'

// ==================== 重大消息 ====================

interface NewsItem {
  date: string
  title: string
  summary: string
  tags: string[]
}

const BIG_NEWS: NewsItem[] = [
  {
    date: '2025-07',
    title: 'A股市场深化改革持续推进',
    summary:
      '证监会发布多项新规，包括完善退市制度、优化交易机制、加强投资者保护等方面。注册制改革进一步深化，IPO审核更加注重信披质量而非盈利能力判断。',
    tags: ['政策', 'A股'],
  },
  {
    date: '2025-06',
    title: '美联储维持利率不变，降息预期升温',
    summary:
      '美联储连续第N次维持联邦基金利率不变。市场普遍预期下半年将开启降息周期，全球资产定价面临重估。港股及新兴市场有望受益于美元走弱。',
    tags: ['宏观', '全球'],
  },
  {
    date: '2025-05',
    title: '巴菲特股东大会2025：继续减持苹果，增持日本商社',
    summary:
      '伯克希尔·哈撒韦年度股东大会召开。巴菲特详细解释了近年来大幅减持苹果的逻辑，并透露在日本五大商社的持股比例持续上升。现金储备再创新高。',
    tags: ['巴菲特', '价值投资'],
  },
  {
    date: '2025-04',
    title: '人工智能产业链投资价值再评估',
    summary:
      '多家投资机构发布AI产业链深度研报。算力芯片、大模型应用、AI终端等领域被普遍看好，但也有声音警告部分公司估值已严重透支未来盈利预期。',
    tags: ['AI', '行业'],
  },
  {
    date: '2025-03',
    title: '港股估值修复行情：恒生指数低位反弹超20%',
    summary:
      '经过长期调整后，恒生指数从低点反弹超过20%，进入技术性牛市。互联网、消费、医药等板块领涨。南下资金持续净流入，机构认为港股仍处于历史低位。',
    tags: ['港股', '估值'],
  },
  {
    date: '2025-02',
    title: '日经225指数创34年新高',
    summary:
      '日本股市延续2023年以来的强劲表现，日经225指数创下1989年以来最高水平。日元贬值、公司治理改善、巴菲特增持等因素共同推动日本资产重估。',
    tags: ['日本', '全球'],
  },
]

// ==================== 财报日历占位 ====================

const EARNINGS_SEASONS = [
  { period: '2025年半年报', window: '7月–8月', status: '即将开始' },
  { period: '2025年一季报', window: '4月', status: '已结束' },
  { period: '2024年年报', window: '1月–4月', status: '已结束' },
]

// ==================== 投资箴言轮换 ====================

const DAILY_QUOTE = {
  text: '机会不会单独出现，它总是伴随着不确定性。投资的艺术就在于区分哪些不确定性是暂时的，哪些是永久性的。',
  author: '霍华德·马克斯',
  source: '《投资最重要的事》',
}

// ==================== 主页面 ====================

export default function NewsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">📰 资讯</h1>

      <div
        className="grid gap-6"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        }}
      >
        {/* 左列：重大消息 */}
        <div>
          <Card
            title={
              <span className="flex items-center gap-2">
                <ThunderboltOutlined style={{ color: '#dc2626' }} />
                重大消息
              </span>
            }
            styles={{ body: { padding: '12px 20px' } }}
            style={{ border: '1px solid var(--border-color)' }}
          >
            <Timeline
              items={BIG_NEWS.map((news) => ({
                color: 'red',
                children: (
                  <div key={news.title}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {news.date}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {news.title}
                      </span>
                    </div>
                    <p className="text-sm m-0 mb-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {news.summary}
                    </p>
                    <div className="flex gap-1">
                      {news.tags.map((t) => (
                        <Tag key={t} color="volcano" style={{ margin: 0, fontSize: 11 }}>
                          {t}
                        </Tag>
                      ))}
                    </div>
                  </div>
                ),
              }))}
            />
          </Card>
        </div>

        {/* 右列：财报日历 + 其他 */}
        <div className="flex flex-col gap-6">
          {/* 财报日历 */}
          <Card
            title={
              <span className="flex items-center gap-2">
                <CalendarOutlined style={{ color: '#16a34a' }} />
                财报日历
              </span>
            }
            styles={{ body: { padding: '12px 20px' } }}
            style={{ border: '1px solid var(--border-color)' }}
          >
            <div className="flex flex-col gap-3">
              {EARNINGS_SEASONS.map((season) => (
                <div
                  key={season.period}
                  className="flex items-center justify-between p-3 rounded"
                  style={{ background: 'var(--bg-app)' }}
                >
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      <FileTextOutlined className="mr-1" style={{ color: 'var(--text-secondary)' }} />
                      {season.period}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {season.window}
                    </div>
                  </div>
                  <Tag
                    color={season.status === '即将开始' ? 'green' : 'default'}
                    style={{ margin: 0 }}
                  >
                    {season.status}
                  </Tag>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3 m-0" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              更多财报数据接入中，届时将支持按股票代码筛选财报日期和预期数据
            </p>
          </Card>

          {/* 今日箴言 */}
          <Card
            title={
              <span className="flex items-center gap-2">
                <FireOutlined style={{ color: '#d4a017' }} />
                今日投资箴言
              </span>
            }
            styles={{ body: { padding: 20 } }}
            style={{
              border: '1px solid var(--border-color)',
              background: 'linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)',
            }}
          >
            <blockquote
              className="text-base leading-relaxed mb-3 m-0 italic"
              style={{ color: 'var(--text-primary)' }}
            >
              「{DAILY_QUOTE.text}」
            </blockquote>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold" style={{ color: '#92400e' }}>
                  —— {DAILY_QUOTE.author}
                </span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
                  {DAILY_QUOTE.source}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
