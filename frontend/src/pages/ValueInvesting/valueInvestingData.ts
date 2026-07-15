/**
 * 投资理念页面 — 内容数据
 * 经典书籍、视频推荐、重要文献、大师语录
 */

// ==================== 类型定义 ====================

export interface BookItem {
  title: string
  author: string
  cover?: string
  description: string
  why: string
  links: { label: string; url: string }[]
  tags: string[]
}

export interface VideoItem {
  title: string
  speaker: string
  platform: string
  description: string
  url: string
  duration?: string
  tags: string[]
}

export interface DocumentItem {
  title: string
  author: string
  description: string
  url: string
  tags: string[]
}

export interface QuoteItem {
  text: string
  author: string
  source?: string
}

// ==================== 经典书籍 ====================

export const BOOKS: BookItem[] = [
  {
    title: '聪明的投资者',
    author: '本杰明·格雷厄姆',
    description:
      '价值投资的开山之作，首次提出「市场先生」寓言和安全边际原则。巴菲特称其为「有史以来最好的投资书籍」。',
    why: '建立正确的投资世界观 — 区分投资与投机，理解市场波动不是风险而是机会。',
    links: [
      { label: '豆瓣', url: 'https://book.douban.com/subject/5243775/' },
    ],
    tags: ['入门必读', '经典', '格雷厄姆'],
  },
  {
    title: '证券分析',
    author: '本杰明·格雷厄姆 & 大卫·多德',
    description:
      '价值投资的圣经级教材，系统阐述了证券分析的方法论。1934 年出版至今影响了一代又一代投资者。',
    why: '理解如何分析一家公司的真实价值，学会定量分析的方法。',
    links: [
      { label: '豆瓣', url: 'https://book.douban.com/subject/25834048/' },
    ],
    tags: ['进阶', '经典', '分析方法'],
  },
  {
    title: '巴菲特致股东的信',
    author: '沃伦·巴菲特（劳伦斯·坎宁安 编）',
    description:
      '将巴菲特历年致伯克希尔股东的信按主题编排，涵盖公司治理、投资理念、会计原则等核心内容。',
    why: '从巴菲特自己的文字中学习他的投资逻辑，比任何解读都更直接、更有价值。',
    links: [
      { label: '豆瓣', url: 'https://book.douban.com/subject/30190128/' },
    ],
    tags: ['入门必读', '巴菲特', '股东信'],
  },
  {
    title: '穷查理宝典',
    author: '查理·芒格（彼得·考夫曼 编）',
    description:
      '收录芒格的核心演讲和文章，展示了他的多元思维模型、逆向思考法以及对人类误判心理学的深刻洞察。',
    why: '学会从多个学科角度思考投资，避免单一思维导致的决策失误。',
    links: [
      { label: '豆瓣', url: 'https://book.douban.com/subject/26825465/' },
    ],
    tags: ['入门必读', '芒格', '思维模型'],
  },
  {
    title: '段永平投资问答录',
    author: '段永平（雪球用户整理）',
    description:
      '段永平在网易博客和雪球上与投资者的互动问答合集，涵盖「本分」文化、right business / right people / right price 等核心投资理念。',
    why: '中国最具实践性的价值投资者的一手分享，语言平实但直击本质。',
    links: [
      { label: '豆瓣', url: 'https://book.douban.com/subject/30391188/' },
    ],
    tags: ['入门必读', '段永平', '实战'],
  },
  {
    title: '投资中最简单的事',
    author: '邱国鹭',
    description:
      '中国价值投资者的实战经验总结，用朴素的语言讲清楚了 A 股投资的底层逻辑：便宜是硬道理、定价权是核心竞争力。',
    why: '结合 A 股实际的价值投资方法论，贴近中国市场实践。',
    links: [
      { label: '豆瓣', url: 'https://book.douban.com/subject/25836625/' },
    ],
    tags: ['入门', 'A股', '实战'],
  },
  {
    title: '安全边际',
    author: '塞思·卡拉曼',
    description: '被誉为价值投资领域最重要的著作之一（已绝版，二手价极高）。深入阐述了安全边际的核心理念和实战应用。',
    why: '深入理解「什么是真正的风险」以及「如何构建安全边际」。',
    links: [
      { label: '豆瓣', url: 'https://book.douban.com/subject/4904203/' },
    ],
    tags: ['进阶', '经典', '风险控制'],
  },
  {
    title: '巴菲特之道',
    author: '罗伯特·哈格斯特朗',
    description:
      '系统梳理了巴菲特的 12 条投资准则，将格雷厄姆、费雪、芒格的影响整合为一个完整的投资框架。',
    why: '快速建立对巴菲特投资体系的整体认知，是入门巴菲特的最佳导读书。',
    links: [
      { label: '豆瓣', url: 'https://book.douban.com/subject/26373629/' },
    ],
    tags: ['入门', '巴菲特', '方法论'],
  },
]

// ==================== 视频推荐 ====================

export const VIDEOS: VideoItem[] = [
  {
    title: '段永平网易财经访谈',
    speaker: '段永平',
    platform: 'Bilibili',
    description:
      '段永平罕见接受媒体专访，系统分享了从实业到投资的转型经历，对投资和创业的深刻思考。',
    url: 'https://search.bilibili.com/all?keyword=段永平 访谈',
    tags: ['段永平', '访谈', '入门'],
  },
  {
    title: '2024 巴菲特股东大会全程',
    speaker: '沃伦·巴菲特',
    platform: 'Bilibili',
    description:
      '伯克希尔·哈撒韦年度股东大会完整录像。巴菲特和接班人格雷格·阿贝尔回答股东提问长达 5 小时。',
    url: 'https://search.bilibili.com/all?keyword=巴菲特股东大会 2024',
    tags: ['巴菲特', '股东大会', '年度'],
  },
  {
    title: '《成为沃伦·巴菲特》纪录片',
    speaker: 'HBO 出品',
    platform: 'Bilibili',
    description:
      'HBO 拍摄的巴菲特官方纪录片，揭示了巴菲特的成长历程、投资哲学和日常生活。豆瓣 8.7 分。',
    url: 'https://search.bilibili.com/all?keyword=成为沃伦·巴菲特 纪录片',
    tags: ['纪录片', '巴菲特', '传记'],
  },
  {
    title: '查理·芒格 Daily Journal 年会讲话',
    speaker: '查理·芒格',
    platform: 'Bilibili',
    description:
      '芒格在 Daily Journal 年会上的经典演讲和问答，充满智慧和幽默。每年一次，涵盖投资、人生和世界的思考。',
    url: 'https://search.bilibili.com/all?keyword=查理芒格 Daily Journal',
    tags: ['芒格', '演讲', '智慧'],
  },
  {
    title: '价值投资在中国的实践',
    speaker: '李录',
    platform: 'Bilibili',
    description:
      '芒格家族资产管理者、喜马拉雅资本创始人李录谈价值投资在中国的实践。中文演讲，逻辑清晰。',
    url: 'https://search.bilibili.com/all?keyword=李录 价值投资',
    tags: ['李录', '中国', '实战'],
  },
  {
    title: '《华尔街》系列纪录片',
    speaker: 'CCTV 出品',
    platform: 'Bilibili',
    description:
      '央视制作的华尔街纪录片，共 10 集。梳理了华尔街 400 年历史，帮助理解资本市场的本质。',
    url: 'https://search.bilibili.com/all?keyword=华尔街 纪录片',
    tags: ['纪录片', '金融史', '入门'],
  },
  {
    title: '《资本的故事》系列',
    speaker: 'CCTV 出品',
    platform: 'Bilibili',
    description:
      '每集 8 分钟，讲述一个金融史上的经典故事。轻松了解资本市场演进的底层逻辑。共四季 80 集。',
    url: 'https://search.bilibili.com/all?keyword=资本的故事',
    tags: ['纪录片', '金融史', '入门', '短篇'],
  },
  {
    title: '巴菲特经典演讲合集',
    speaker: '沃伦·巴菲特',
    platform: 'Bilibili',
    description:
      '巴菲特在佛罗里达大学、内布拉斯加大学等地的经典演讲。没有 PPT、没有讲稿，但每一句都是干货。',
    url: 'https://search.bilibili.com/all?keyword=巴菲特 演讲',
    tags: ['巴菲特', '演讲', '经典'],
  },
]

// ==================== 重要文献 ====================

export const DOCUMENTS: DocumentItem[] = [
  {
    title: '巴菲特致股东的信全集（1957–2024）',
    author: '沃伦·巴菲特',
    description:
      '巴菲特每年写给伯克希尔股东的信，是价值投资最重要的第一手资料。每年一封，坚持不懈超过 60 年。',
    url: 'https://www.berkshirehathaway.com/letters/letters.html',
    tags: ['巴菲特', '股东信', '一手资料'],
  },
  {
    title: '《格雷厄姆—多德村的超级投资者》',
    author: '沃伦·巴菲特',
    description:
      '巴菲特 1984 年在哥伦比亚大学的著名演讲，用 9 位投资者的业绩证明：价值投资不是运气，而是一种可以通过学习掌握的方法论。',
    url: 'https://www8.gsb.columbia.edu/valueinvesting/sites/valueinvesting/files/files/Graham%20%26%20Dodd.pdf',
    tags: ['巴菲特', '演讲', '经典'],
  },
  {
    title: '段永平网易博客存档',
    author: '段永平',
    description:
      '段永平 2006–2018 年在网易博客上的投资思考，涵盖了他在苹果、茅台、腾讯等投资上的真实决策过程。',
    url: 'https://www.xueqiupan.com/duanyongping/blog',
    tags: ['段永平', '博客', '实战记录'],
  },
  {
    title: '段永平雪球发言合集',
    author: '段永平（大道无形我有型）',
    description:
      '段永平在雪球上的互动留言，回答了无数投资者关于价值投资的提问。ID：大道无形我有型。',
    url: 'https://xueqiu.com/u/dyplovestheworld',
    tags: ['段永平', '雪球', '互动问答'],
  },
  {
    title: '查理·芒格在 Daily Journal 年会上的讲话（2014–2023）',
    author: '查理·芒格',
    description:
      '芒格在 Daily Journal 年会上的完整讲话记录，每年一次，共 10 年。是芒格晚年思想的集中呈现。',
    url: 'https://www.youtube.com/results?search_query=charlie+munger+daily+journal+annual+meeting',
    tags: ['芒格', '演讲', '一手资料'],
  },
  {
    title: '巴菲特 1999 年太阳谷演讲',
    author: '沃伦·巴菲特',
    description:
      '巴菲特在互联网泡沫顶峰时的著名演讲，准确预言了科技泡沫的破裂。堪称逆向投资的经典案例。',
    url: 'https://search.bilibili.com/all?keyword=巴菲特 太阳谷 演讲',
    tags: ['巴菲特', '演讲', '经典'],
  },
  {
    title: '约翰·博格：指数基金的投资常识',
    author: '约翰·博格',
    description:
      '指数基金之父博格的经典文章。如果你不确定自己能战胜市场，博格的建议是最理性的选择。',
    url: 'https://www.bogleheads.org/wiki/Bogleheads%C2%AE_investment_philosophy',
    tags: ['博格', '指数基金', '理性选择'],
  },
]

// ==================== 核心理念 ====================

export const QUOTES: QuoteItem[] = [
  {
    text: '别人贪婪时我恐惧，别人恐惧时我贪婪。',
    author: '沃伦·巴菲特',
    source: '1986 年致股东的信',
  },
  {
    text: '投资的第一条原则是不要亏损，第二条原则是不要忘记第一条。',
    author: '沃伦·巴菲特',
  },
  {
    text: '股市短期是投票机，长期是称重机。',
    author: '本杰明·格雷厄姆',
    source: '《聪明的投资者》',
  },
  {
    text: '以合理的价格买入一家优秀的公司，远胜过以便宜的价格买入一家平庸的公司。',
    author: '沃伦·巴菲特',
  },
  {
    text: '反过来想，总是反过来想。',
    author: '查理·芒格',
    source: '《穷查理宝典》',
  },
  {
    text: '买股票就是买公司，买公司就是买其未来现金流的折现。',
    author: '段永平',
  },
  {
    text: 'right business, right people, right price — 这三个 right 就是全部的投资秘诀。',
    author: '段永平',
  },
  {
    text: '如果你不愿意持有一只股票十年，那就连十分钟都不要持有。',
    author: '沃伦·巴菲特',
  },
  {
    text: '投资中最重要的事是：知道你在做什么。',
    author: '沃伦·巴菲特',
  },
  {
    text: '在别人犯错时，保持清醒。',
    author: '查理·芒格',
  },
  {
    text: '我从不试图跳过七英尺的栏杆，我只是到处寻找我能跨过去的一英尺栏杆。',
    author: '沃伦·巴菲特',
  },
  {
    text: '做对的事情，然后把事情做对。',
    author: '段永平',
  },
]

// ==================== 估值方法 ====================

export interface ConceptItem {
  title: string
  description: string
  key: string
}

export const CONCEPTS: ConceptItem[] = [
  {
    title: '自由现金流折现（DCF）',
    description:
      '公司的内在价值等于其未来所有自由现金流按适当折现率折现到今天的价值之和。这是价值投资最核心的估值方法，但巴菲特和段永平都强调：DCF 是一个思维框架，不是精确计算的工具。重要的不是算出一个确切的数字，而是确保你买入的价格显著低于你估算的价值范围。',
    key: 'dcf',
  },
  {
    title: '安全边际',
    description:
      '任何估值都有不确定性。安全边际就是你的买入价格与内在价值之间的差距。格雷厄姆建议至少 30% 的安全边际。安全边际越大，你对抗错误判断和市场波动的能力就越强。买得便宜是你最好的保护。',
    key: 'margin-of-safety',
  },
  {
    title: '护城河分析',
    description:
      '护城河是公司抵御竞争、维持超额利润的能力。巴菲特将护城河分为五类：品牌溢价、转换成本、网络效应、成本优势、规模效应。拥有宽阔护城河的公司，其内在价值不会因为竞争而被迅速侵蚀。',
    key: 'moat',
  },
  {
    title: '能力圈',
    description:
      '只投资你能理解的生意。如果你不能用 10 分钟向一个 12 岁的孩子解释清楚这家公司怎么赚钱，那你就不在你的能力圈内。能力圈的大小不重要，重要的是你清楚它的边界在哪里。',
    key: 'circle-of-competence',
  },
  {
    title: 'ROE 与 ROIC',
    description:
      '净资产收益率（ROE）和投入资本回报率（ROIC）是衡量公司质量的核心指标。巴菲特看重长期稳定高于 15% 的 ROE。但要注意：高 ROE 如果是靠高杠杆实现的，风险可能很大。ROIC 剔除了杠杆的影响，更能反映公司经营本身的质量。',
    key: 'roe-roic',
  },
  {
    title: 'PE 与 PEG',
    description:
      '市盈率（PE）是最直观的估值指标，但不能孤立使用。不同行业、不同增长阶段的合理 PE 差异很大。PEG（PE / 盈利增速）提供了结合成长的视角：PEG < 1 通常被视为低估信号，但盈利增速的预测本身就是不确定的。',
    key: 'pe-peg',
  },
]
