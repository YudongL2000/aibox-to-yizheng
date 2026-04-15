#!/bin/bash
# Qwen-0.6 Web 聊天应用启动脚本

echo "=========================================="
echo "启动 Qwen-0.6 Web 聊天应用"
echo "=========================================="

# 检查 Python 是否安装
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 Python3，请先安装 Python"
    exit 1
fi

# 检查是否安装了依赖
if ! python3 -c "import flask" 2>/dev/null; then
    echo "正在安装依赖..."
    pip3 install -r requirements.txt
fi

# 启动服务器
echo ""
echo "正在启动 Web 服务器..."
echo "访问 http://localhost:5000 使用 Web 界面"
echo "按 Ctrl+C 停止服务器"
echo "=========================================="
echo ""

python3 app.py

