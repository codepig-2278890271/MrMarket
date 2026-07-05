#!/bin/bash
# ================================================================
# MrMarket 构建脚本
# 构建前后端生产包
# ================================================================

set -e
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

echo "🔨 MrMarket 构建中..."
echo ""

# 构建前端
echo "📦 构建前端..."
cd "$PROJECT_DIR/frontend"
npm install
npm run build
echo "   ✅ 前端构建完成 → frontend/dist/"

# 后端无需构建（Python 直接运行）
echo "📡 后端就绪（Python 项目无需编译）"

echo ""
echo "✅ 构建完成！"
