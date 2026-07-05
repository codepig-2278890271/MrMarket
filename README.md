# MrMarket（市场先生）

A 股价值投资辅助分析工具 — 本地运行的网站，帮助个人投资者进行行情查看、策略研究和模拟分析。

> 产品命名灵感来自本杰明·格雷厄姆《聪明的投资者》中的「市场先生」寓言。股价短期是投票机，长期是称重机。

## 快速开始

```bash
# 1. 启动全部服务
bash start.sh

# 2. 浏览器打开
# http://localhost:5173
```

首次运行会自动填充 15 只代表性 A 股的种子数据（含 250 天日 K 线），无需额外配置。

## 模块功能

| 模块 | 功能 | 状态 |
|------|------|------|
| 📈 行情 | 股票搜索、分页浏览、日 K 线蜡烛图 | ✅ |
| ⭐ 自选股 | 添加/删除自选、修改备注 | ✅ |
| 🎯 策略 | 创建/编辑/启停策略，支持 MACD/KDJ/MA/RSI/BOLL 自由组合 | ✅ |
| 📰 资讯 | 财报文章 | ⬜ |
| 📊 回测 | 历史数据回测，查看策略表现 | ⬜ |
| 💰 模拟交易 | A 股规则模拟交易（T+1、涨跌停、手续费） | ⬜ |

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Ant Design 6 + ECharts 6 + Tailwind CSS 4 |
| 后端 | FastAPI + SQLAlchemy 2.0 异步 + Pydantic 2 |
| 数据库 | PostgreSQL 16 + Redis 7 |
| 数据源 | AkShare（新浪财经） |

## 项目结构

```
MrMarket/
├── start.sh                  # 一键启动脚本
├── api/                      # 后端 (FastAPI, 端口 8000)
│   ├── app/
│   │   ├── main.py           # 应用入口
│   │   ├── config.py         # 配置管理
│   │   ├── database.py       # 数据库引擎
│   │   ├── models/           # ORM 模型
│   │   │   ├── stock.py      # 股票 + K 线
│   │   │   ├── watchlist.py  # 自选股
│   │   │   └── strategy.py   # 策略
│   │   ├── schemas/          # Pydantic 模型
│   │   ├── routers/          # API 路由
│   │   │   ├── market.py     # 行情查询
│   │   │   ├── watchlist.py  # 自选股 CRUD
│   │   │   └── strategy.py   # 策略 CRUD
│   │   ├── services/         # 业务逻辑
│   │   │   └── data_fetcher.py  # AkShare 数据拉取
│   │   └── tasks/            # 定时任务（预留）
│   └── requirements.txt
├── ui/                       # 前端 (React, 端口 5173)
│   └── src/
│       ├── pages/
│       │   ├── Market/       # 行情页
│       │   ├── Watchlist/    # 自选股页
│       │   ├── Strategy/     # 策略页
│       │   ├── News/         # 资讯页（占位）
│       │   ├── Backtest/     # 回测页（占位）
│       │   └── Trade/        # 模拟交易页（占位）
│       ├── components/       # 通用组件
│       ├── services/         # API 客户端
│       └── types/            # 类型定义
├── docker/                   # Docker 容器化
│   ├── docker-compose.yml    # PostgreSQL + Redis + API + UI
│   ├── Dockerfile.api        # 后端镜像
│   └── Dockerfile.ui         # 前端镜像
├── scripts/                  # 数据脚本
│   ├── seed_data.py          # 种子数据填充
│   └── sync_data.py          # 全量数据同步
└── docs/prompts/             # 设计文档
```

## 常用命令

```bash
# 启动
bash start.sh

# 停止
bash start.sh stop

# 状态
bash start.sh status

# 仅启动数据库
docker compose -f docker/docker-compose.yml up -d postgres redis

# 手动启动后端（支持热重载）
cd api && python3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# 手动启动前端
cd ui && npm run dev

# 填充种子数据
python3 scripts/seed_data.py

# 同步全量 A 股数据
python3 scripts/sync_data.py stocks   # 股票列表
python3 scripts/sync_data.py kline    # K 线数据
```

## API 文档

启动后端后访问 http://localhost:8000/docs 查看 Swagger 交互式文档。

## 环境要求

- Python 3.12+
- Node.js 22+
- Docker & Docker Compose
- PostgreSQL 16（Docker 提供）

## 设计原则

- **价值投资**：以格雷厄姆、巴菲特、芒格、段永平的投资哲学为指导，不鼓励投机
- **辅助分析**：不是交易软件，不连接券商，不自动下单，最终决策由用户完成
- **本地优先**：数据存在本地，代码可自由修改
