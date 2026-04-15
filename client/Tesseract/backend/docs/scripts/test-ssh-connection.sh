#!/usr/bin/env bash
# ============================================================================
# SSH 连接测试脚本
# ============================================================================
# 功能：测试 GitHub SSH 连接是否正常
# 用法：bash docs/scripts/test-ssh-connection.sh
# ============================================================================

set -euo pipefail

echo "=========================================="
echo "GitHub SSH 连接测试"
echo "=========================================="
echo ""

# 1. 检查 SSH agent
echo "[1/4] 检查 SSH agent..."
if ssh-add -l &>/dev/null; then
  echo "✅ SSH agent 正在运行"
  echo "已加载的密钥："
  ssh-add -l
else
  echo "❌ SSH agent 未运行或未加载密钥"
  echo ""
  echo "请执行以下命令："
  echo "  eval \$(ssh-agent -s)"
  echo "  ssh-add ~/.ssh/id_rsa  # 或你的密钥路径"
  exit 1
fi

echo ""

# 2. 检查 SSH 密钥文件
echo "[2/4] 检查 SSH 密钥文件..."
if [ -f ~/.ssh/id_rsa ]; then
  echo "✅ 找到 SSH 私钥: ~/.ssh/id_rsa"
elif [ -f ~/.ssh/id_ed25519 ]; then
  echo "✅ 找到 SSH 私钥: ~/.ssh/id_ed25519"
else
  echo "⚠️  未找到常见的 SSH 私钥文件"
  echo "请检查 ~/.ssh/ 目录"
fi

if [ -f ~/.ssh/id_rsa.pub ]; then
  echo "✅ 找到 SSH 公钥: ~/.ssh/id_rsa.pub"
elif [ -f ~/.ssh/id_ed25519.pub ]; then
  echo "✅ 找到 SSH 公钥: ~/.ssh/id_ed25519.pub"
fi

echo ""

# 3. 测试 GitHub SSH 连接
echo "[3/4] 测试 GitHub SSH 连接..."
# 注意：GitHub 在认证成功时通常返回退出码 1（不提供 shell），
# 不能直接用退出码判断成功，否则会被 pipefail 误判。
ssh_output=$(ssh -T git@github.com 2>&1 || true)
if echo "$ssh_output" | grep -qi "successfully authenticated"; then
  echo "✅ GitHub SSH 连接成功"
  echo "$ssh_output" | head -1
else
  echo "❌ GitHub SSH 连接失败"
  echo "$ssh_output" | head -5
  echo ""
  echo "请检查："
  echo "  1. SSH 密钥是否已添加到 GitHub: https://github.com/settings/keys"
  echo "  2. 查看详细错误: ssh -vT git@github.com"
  exit 1
fi

echo ""

# 4. 检查 git remote
echo "[4/4] 检查 git remote 配置..."
if git remote get-url origin &>/dev/null; then
  remote_url=$(git remote get-url origin)
  echo "当前 remote URL: $remote_url"

  if [[ "$remote_url" == git@github.com:* ]]; then
    echo "✅ 使用 SSH 协议"
  elif [[ "$remote_url" =~ https://github.com/([^/]+)/(.+)\.git ]]; then
    user="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
    ssh_url="git@github.com:${user}/${repo}.git"

    echo "⚠️  使用 HTTPS 协议"
    echo ""
    echo "建议切换到 SSH："
    echo "  git remote set-url origin $ssh_url"
    echo ""
    echo "或者让脚本自动转换（启动脚本会自动处理）"
  else
    echo "⚠️  未知的 remote 协议"
  fi
else
  echo "⚠️  未配置 remote origin"
fi

echo ""
echo "=========================================="
echo "测试完成！"
echo "=========================================="
