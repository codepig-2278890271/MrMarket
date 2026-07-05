#!/bin/bash
# ================================================================
# MrMarket 一键启动脚本
# 用法:
#   bash scripts/dev/start.sh          → 启动全部服务
#   bash scripts/dev/start.sh stop     → 停止全部服务
#   bash scripts/dev/start.sh status   → 查看服务状态
#
# 启动后浏览器打开 http://localhost:5173 即可使用
# ================================================================

set -e
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LOGS_DIR="$PROJECT_DIR/.logs"
mkdir -p "$LOGS_DIR"

# ---------- 启动 ----------
start() {
  echo "🚀 MrMarket 启动中..."
  echo ""

  # 1. 基础设施（数据库 + 缓存）
  echo "📦 Step 1/3: 启动数据库和缓存..."
  docker compose -f "$PROJECT_DIR/docker/docker-compose.yml" up -d 2>/dev/null || true
  # 等待 PostgreSQL 就绪
  for i in $(seq 1 30); do
    if docker exec mrmarket-postgres pg_isready -U mrmarket 2>/dev/null | grep -q "accepting connections"; then
      echo "   ✅ PostgreSQL 已就绪"
      break
    fi
    sleep 1
  done

  # 2. 后端（从 backend/ 目录启动）
  echo "📡 Step 2/3: 启动后端 (端口 8000)..."
  cd "$PROJECT_DIR/backend"
  if lsof -ti:8000 > /dev/null 2>&1; then
    echo "   ⚠️  端口 8000 已被占用，尝试复用已有后端"
  else
    python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 \
      > "$LOGS_DIR/backend.log" 2>&1 &
    echo $! > "$LOGS_DIR/backend.pid"
    sleep 2
    if curl -s http://127.0.0.1:8000/api/v1/health > /dev/null 2>&1; then
      echo "   ✅ 后端已就绪"
    else
      echo "   ⚠️  后端可能启动失败，查看 $LOGS_DIR/backend.log"
    fi
  fi

  # 3. 前端
  echo "🎨 Step 3/3: 启动前端 (端口 5173)..."
  cd "$PROJECT_DIR/frontend"
  # 如果端口被占用（如上次未正常关闭），先杀掉再启动
  if lsof -ti:5173 > /dev/null 2>&1; then
    echo "   ⚠️  端口 5173 已被占用，杀掉旧进程..."
    lsof -ti:5173 | xargs kill 2>/dev/null || true
    sleep 1
  fi
  npm run dev > "$LOGS_DIR/frontend.log" 2>&1 &
  echo $! > "$LOGS_DIR/frontend.pid"
  # 等待 Vite 就绪
  for i in $(seq 1 20); do
    if curl -s http://127.0.0.1:5173 > /dev/null 2>&1; then
      echo "   ✅ 前端已就绪"
      break
    fi
    sleep 1
  done

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ✅ MrMarket 启动完成！"
  echo "  🌐 浏览器打开: http://localhost:5173"
  echo "  📖 API 文档:   http://localhost:8000/docs"
  echo "  📋 日志目录:   $LOGS_DIR"
  echo "  🛑 停止服务:   bash scripts/dev/start.sh stop"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ---------- 停止 ----------
stop() {
  echo "🛑 停止 MrMarket 服务..."

  # 停止前端
  if [ -f "$LOGS_DIR/frontend.pid" ]; then
    kill $(cat "$LOGS_DIR/frontend.pid") 2>/dev/null && echo "   前端已停止" || true
    rm -f "$LOGS_DIR/frontend.pid"
  fi
  lsof -ti:5173 | xargs kill 2>/dev/null || true

  # 停止后端
  if [ -f "$LOGS_DIR/backend.pid" ]; then
    kill $(cat "$LOGS_DIR/backend.pid") 2>/dev/null && echo "   后端已停止" || true
    rm -f "$LOGS_DIR/backend.pid"
  fi
  lsof -ti:8000 | xargs kill 2>/dev/null || true

  echo "✅ 所有服务已停止（数据库和缓存未关闭，如需停止请用 docker compose down）"
}

# ---------- 状态 ----------
status() {
  echo "📊 MrMarket 服务状态"
  echo "---"
  if curl -s http://127.0.0.1:8000/api/v1/health > /dev/null 2>&1; then
    echo "✅ 后端 (8000):  运行中  → http://localhost:8000"
  else
    echo "❌ 后端 (8000):  未启动"
  fi
  if curl -s http://127.0.0.1:5173 > /dev/null 2>&1; then
    echo "✅ 前端 (5173):  运行中  → http://localhost:5173"
  else
    echo "❌ 前端 (5173):  未启动"
  fi
  docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | grep mrmarket || true
}

# ---------- 入口 ----------
case "${1:-start}" in
  start)  start ;;
  stop)   stop ;;
  status) status ;;
  *)
    echo "用法: bash scripts/dev/start.sh [start|stop|status]"
    ;;
esac
