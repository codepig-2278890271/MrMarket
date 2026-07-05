# ================================================================
# MrMarket 开发常用命令
# ================================================================

.PHONY: help dev-frontend dev-backend dev install install-frontend install-backend clean

help: ## 显示帮助信息
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ---------- 开发服务器 ----------

dev-frontend: ## 启动前端开发服务器 (端口 5173)
	cd frontend && npm run dev

dev-backend: ## 启动后端开发服务器 (端口 8000, 热重载)
	cd backend && python3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

dev: ## 同时启动前后端（需在 tmux 两个窗格中分别运行）
	@echo "请在两个终端中分别运行："
	@echo "  make dev-frontend"
	@echo "  make dev-backend"

# ---------- 依赖安装 ----------

install-frontend: ## 安装前端依赖
	cd frontend && npm install

install-backend: ## 安装后端依赖
	cd backend && pip install -e .

install: install-frontend install-backend ## 安装全部依赖

# ---------- 构建 ----------

build-frontend: ## 构建前端生产包
	cd frontend && npm run build

# ---------- 代码检查 ----------

lint-frontend: ## 前端代码检查
	cd frontend && npx tsc --noEmit

lint-backend: ## 后端代码检查
	cd backend && python3 -m ruff check app/

lint: lint-frontend lint-backend ## 前后端代码检查

# ---------- 数据脚本 ----------

seed-data: ## 填充种子数据
	python3 scripts/data/seed_data.py

sync-stocks: ## 同步股票列表
	python3 scripts/data/sync_data.py stocks

sync-kline: ## 同步K线数据（前100只）
	python3 scripts/data/sync_data.py kline

# ---------- 清理 ----------

clean: ## 清理构建产物
	rm -rf frontend/dist
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name '*.pyc' -delete
