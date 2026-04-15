#!/usr/bin/env bash
# ============================================================================
# Restore Git Worktree Paths for WSL
# ============================================================================
# 功能：将 worktree 的 .git 文件路径从 Windows 格式恢复为 WSL 格式
# 用法：bash docs/scripts/restore-worktree-paths-for-wsl.sh
# ============================================================================

set -euo pipefail

REPO_ROOT="/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE"
WORKTREE_BASE="/mnt/c/Users/sam/Documents/Sam/code/.zcf/tesseract-BE"

echo "=========================================="
echo "Restore Git Worktree Paths for WSL"
echo "=========================================="
echo ""

# 1. 恢复 worktree 目录中的 .git 文件
echo "[1/2] Restoring .git files in worktree directories..."

for dir in "$WORKTREE_BASE"/*/; do
  git_file="$dir/.git"
  if [ -f "$git_file" ]; then
    echo "  Processing: $git_file"
    current=$(cat "$git_file")
    echo "    Current: $current"

    # 转换路径：C:/ -> /mnt/c/
    new_content=$(echo "$current" | sed 's|C:/|/mnt/c/|g')
    echo "    New: $new_content"

    echo "$new_content" > "$git_file"
  fi
done

echo ""

# 2. 恢复主仓库中的 gitdir 文件
echo "[2/2] Restoring gitdir files in main repository..."

for worktree_dir in "$REPO_ROOT"/.git/worktrees/*/; do
  gitdir_file="$worktree_dir/gitdir"
  if [ -f "$gitdir_file" ]; then
    echo "  Processing: $gitdir_file"
    current=$(cat "$gitdir_file")
    echo "    Current: $current"

    # 转换路径：C:/ -> /mnt/c/
    new_content=$(echo "$current" | sed 's|C:/|/mnt/c/|g')
    echo "    New: $new_content"

    echo "$new_content" > "$gitdir_file"
  fi
done

echo ""
echo "=========================================="
echo "Done! Git commands in WSL should work now."
echo "=========================================="
