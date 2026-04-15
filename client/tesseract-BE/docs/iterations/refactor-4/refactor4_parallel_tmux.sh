#!/usr/bin/env bash
# [INPUT]: 依赖 git worktree、tmux、可选 codex、docs/iterations/refactor-4 执行资产与 docs/decisions/refactor-4 设计文档
# [OUTPUT]: 对外提供 Refactor-4 并行开发环境的一键启动入口，创建 6 lane worktree 并注入首次提示词
# [POS]: docs/iterations/refactor-4 的执行脚本，与同目录 runbook 和并行清单保持同构
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

set -euo pipefail

# ============================================================================
# 配置变量
# ============================================================================

ROOT_BRANCH="${ROOT_BRANCH:-main}"
INTEGRATOR_BRANCH="${INTEGRATOR_BRANCH:-chore/integrate-refactor4}"
WT_BASE="${WT_BASE:-../.zcf/tesseract-BE}"
SESSION="${SESSION:-refactor4}"
START_CODEX="${START_CODEX:-true}"
USE_SSH="${USE_SSH:-true}"

FEATURE_BRANCHES=(
  "feat/agent-loop"
  "feat/unified-validator"
  "feat/progressive-disclosure"
  "feat/tool-simplification"
  "feat/metadata-driven-filter"
)

FEATURE_WT_DIRS=(
  "feat-agent-loop"
  "feat-unified-validator"
  "feat-progressive-disclosure"
  "feat-tool-simplification"
  "feat-metadata-driven-filter"
)

ALL_BRANCHES=(
  "feat/agent-loop"
  "feat/unified-validator"
  "feat/progressive-disclosure"
  "feat/tool-simplification"
  "feat/metadata-driven-filter"
  "$INTEGRATOR_BRANCH"
)

ALL_WT_DIRS=(
  "feat-agent-loop"
  "feat-unified-validator"
  "feat-progressive-disclosure"
  "feat-tool-simplification"
  "feat-metadata-driven-filter"
  "chore-integrate-refactor4"
)

# ============================================================================
# 辅助函数
# ============================================================================

log_info() {
  echo "[INFO] $*"
}

log_error() {
  echo "[ERROR] $*" >&2
}

log_success() {
  echo "[SUCCESS] $*"
}

check_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log_error "命令 '$1' 未找到，请先安装"
    exit 1
  fi
}

check_optional_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    return 1
  fi
  return 0
}

check_git_repo() {
  if ! git rev-parse --git-dir >/dev/null 2>&1; then
    log_error "当前目录不是 git 仓库"
    exit 1
  fi
}

ensure_ssh_remote() {
  if [ "$USE_SSH" != "true" ]; then
    return 0
  fi

  if ! git remote get-url origin >/dev/null 2>&1; then
    log_info "未配置 remote origin，跳过 SSH remote 检查"
    return 0
  fi

  local remote_url
  remote_url="$(git remote get-url origin)"

  if [[ "$remote_url" == git@github.com:* ]]; then
    log_info "Remote URL 已是 SSH 格式"
    return 0
  fi

  if [[ "$remote_url" =~ https://github.com/([^/]+)/(.+)\.git ]]; then
    local user="${BASH_REMATCH[1]}"
    local repo="${BASH_REMATCH[2]}"
    local ssh_url="git@github.com:${user}/${repo}.git"

    log_info "检测到 HTTPS remote，转换为 SSH: $ssh_url"
    git remote set-url origin "$ssh_url"
    log_success "Remote URL 已转换为 SSH"
    return 0
  fi

  log_info "Remote URL 格式未知，保持不变: $remote_url"
}

check_ssh_connection() {
  if [ "$USE_SSH" != "true" ]; then
    return 0
  fi

  if ! git remote get-url origin >/dev/null 2>&1; then
    return 0
  fi

  log_info "检查 GitHub SSH 连接..."
  if ! ssh-add -l >/dev/null 2>&1; then
    log_error "SSH agent 未运行或未加载密钥"
    log_info "请先执行: eval \$(ssh-agent -s) && ssh-add ~/.ssh/id_rsa"
    exit 1
  fi

  local ssh_output
  ssh_output="$(ssh -T git@github.com 2>&1 || true)"
  if echo "$ssh_output" | grep -qi "successfully authenticated"; then
    log_success "GitHub SSH 连接正常"
  else
    log_error "GitHub SSH 连接失败"
    echo "$ssh_output" | head -5 >&2
    exit 1
  fi
}

ensure_branch() {
  local branch="$1"
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    log_info "分支 '$branch' 已存在"
  else
    log_info "创建分支 '$branch' 基于 '$ROOT_BRANCH'"
    git branch "$branch" "$ROOT_BRANCH"
  fi
}

ensure_worktree() {
  local branch="$1"
  local wt_dir="$2"
  local wt_path="$WT_BASE/$wt_dir"

  if git worktree list | grep -q "$wt_path"; then
    log_info "Worktree '$wt_path' 已存在，跳过创建"
    return 0
  fi

  mkdir -p "$WT_BASE"
  log_info "创建 worktree: $wt_path (分支: $branch)"
  git worktree add "$wt_path" "$branch"
}

build_prompt() {
  local lane="$1"
  case "$lane" in
    "feat/agent-loop")
      cat <<'EOF'
Read /root/.codex/AGENTS.md and repo CLAUDE.md first.
Then read:
- docs/iterations/refactor-4/ITER_REFACTOR4_PARALLEL.md
- docs/decisions/refactor-4/HARNESS_ENGINEERING_REFACTOR.md

You are working on feat/agent-loop.

Scope:
- 剥离 orchestrator.ts 主循环
- 新增或等价实现 agent-loop.ts
- 引入模型反馈式验证回路
- 只修改 loop / orchestrator / session / agent-service 直接相关路径

Deliver:
- files changed
- how to test
- current checkpoint
EOF
      ;;
    "feat/unified-validator")
      cat <<'EOF'
Read /root/.codex/AGENTS.md and repo CLAUDE.md first.
Then read:
- docs/iterations/refactor-4/ITER_REFACTOR4_PARALLEL.md
- docs/decisions/refactor-4/HARNESS_ENGINEERING_REFACTOR.md

You are working on feat/unified-validator.

Scope:
- 统一 validate(target) 门面
- 合并 expression validator 三层逻辑
- 收敛 workflow/node/expression 校验入口

Deliver:
- files changed
- how to test
- current checkpoint
EOF
      ;;
    "feat/progressive-disclosure")
      cat <<'EOF'
Read /root/.codex/AGENTS.md and repo CLAUDE.md first.
Then read:
- docs/iterations/refactor-4/ITER_REFACTOR4_PARALLEL.md
- docs/decisions/refactor-4/HARNESS_ENGINEERING_REFACTOR.md

You are working on feat/progressive-disclosure.

Scope:
- lazy tool exposure
- prompt core + on-demand modules
- history compression
- token budget trigger

Deliver:
- files changed
- how to test
- current checkpoint
EOF
      ;;
    "feat/tool-simplification")
      cat <<'EOF'
Read /root/.codex/AGENTS.md and repo CLAUDE.md first.
Then read:
- docs/iterations/refactor-4/ITER_REFACTOR4_PARALLEL.md
- docs/decisions/refactor-4/HARNESS_ENGINEERING_REFACTOR.md

You are working on feat/tool-simplification.

Scope:
- 拆分 get_node 厚模式
- 收敛工具命名和分组前缀
- 限制单工具参数维度

Deliver:
- files changed
- how to test
- current checkpoint
EOF
      ;;
    "feat/metadata-driven-filter")
      cat <<'EOF'
Read /root/.codex/AGENTS.md and repo CLAUDE.md first.
Then read:
- docs/iterations/refactor-4/ITER_REFACTOR4_PARALLEL.md
- docs/decisions/refactor-4/HARNESS_ENGINEERING_REFACTOR.md

You are working on feat/metadata-driven-filter.

Scope:
- 用元数据推断 essentials
- 收敛 property filter 手写配置
- 保留少量 override 机制

Deliver:
- files changed
- how to test
- current checkpoint
EOF
      ;;
    "integrator")
      cat <<'EOF'
Read /root/.codex/AGENTS.md and repo CLAUDE.md first.
Then read:
- docs/iterations/refactor-4/ITER_REFACTOR4_PARALLEL.md
- docs/decisions/refactor-4/HARNESS_ENGINEERING_REFACTOR.md

You are the Integrator for refactor4.
Merge in this exact order:
1) feat/unified-validator
2) feat/progressive-disclosure
3) feat/agent-loop
4) feat/tool-simplification
5) feat/metadata-driven-filter

Then update:
- docs/iterations/refactor-4/ITER_REFACTOR4_INTEGRATION_OUTPUT.md

Deliver:
- merge summary
- unresolved conflicts
- files changed
- how to test
EOF
      ;;
  esac
}

maybe_start_codex() {
  local target="$1"
  local prompt="$2"

  if [ "$START_CODEX" != "true" ]; then
    return 0
  fi

  if ! check_optional_command codex; then
    log_info "未找到 codex，跳过自动启动"
    return 0
  fi

  sleep 1
  tmux send-keys -t "$target" "codex --dangerously-bypass-approvals-and-sandbox" C-m
  sleep 2
  tmux send-keys -t "$target" "$prompt" C-m
}

start_tmux_session() {
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    log_info "Tmux 会话 '$SESSION' 已存在"
    log_info "使用 'tmux attach -t $SESSION' 连接"
    return 0
  fi

  log_info "创建 tmux 会话: $SESSION"

  tmux new-session -d -s "$SESSION" -n feature -c "$WT_BASE/${FEATURE_WT_DIRS[0]}"
  tmux send-keys -t "$SESSION:feature.0" "echo '=== ${FEATURE_BRANCHES[0]} ==='" C-m
  tmux send-keys -t "$SESSION:feature.0" "git branch --show-current" C-m
  maybe_start_codex "$SESSION:feature.0" "$(build_prompt "${FEATURE_BRANCHES[0]}")"

  tmux split-window -h -t "$SESSION:feature.0" -c "$WT_BASE/${FEATURE_WT_DIRS[1]}"
  tmux send-keys -t "$SESSION:feature.1" "echo '=== ${FEATURE_BRANCHES[1]} ==='" C-m
  tmux send-keys -t "$SESSION:feature.1" "git branch --show-current" C-m
  maybe_start_codex "$SESSION:feature.1" "$(build_prompt "${FEATURE_BRANCHES[1]}")"

  tmux split-window -v -t "$SESSION:feature.1" -c "$WT_BASE/${FEATURE_WT_DIRS[2]}"
  tmux send-keys -t "$SESSION:feature.2" "echo '=== ${FEATURE_BRANCHES[2]} ==='" C-m
  tmux send-keys -t "$SESSION:feature.2" "git branch --show-current" C-m
  maybe_start_codex "$SESSION:feature.2" "$(build_prompt "${FEATURE_BRANCHES[2]}")"

  tmux split-window -v -t "$SESSION:feature.2" -c "$WT_BASE/${FEATURE_WT_DIRS[3]}"
  tmux send-keys -t "$SESSION:feature.3" "echo '=== ${FEATURE_BRANCHES[3]} ==='" C-m
  tmux send-keys -t "$SESSION:feature.3" "git branch --show-current" C-m
  maybe_start_codex "$SESSION:feature.3" "$(build_prompt "${FEATURE_BRANCHES[3]}")"

  tmux split-window -v -t "$SESSION:feature.3" -c "$WT_BASE/${FEATURE_WT_DIRS[4]}"
  tmux send-keys -t "$SESSION:feature.4" "echo '=== ${FEATURE_BRANCHES[4]} ==='" C-m
  tmux send-keys -t "$SESSION:feature.4" "git branch --show-current" C-m
  maybe_start_codex "$SESSION:feature.4" "$(build_prompt "${FEATURE_BRANCHES[4]}")"

  tmux select-layout -t "$SESSION:feature" tiled
  tmux select-pane -t "$SESSION:feature.0"

  tmux new-window -t "$SESSION" -n integrator -c "$WT_BASE/${ALL_WT_DIRS[5]}"
  tmux send-keys -t "$SESSION:integrator.0" "echo '=== $INTEGRATOR_BRANCH ==='" C-m
  tmux send-keys -t "$SESSION:integrator.0" "git branch --show-current" C-m
  tmux send-keys -t "$SESSION:integrator.0" "printf '%s\n' \"$(build_prompt integrator)\"" C-m

  log_success "Tmux 会话创建成功"
}

print_summary() {
  echo ""
  log_success "Refactor-4 并行环境已就绪"
  echo ""
  echo "Feature 窗口 pane 顺序:"
  echo "  0) feat/agent-loop"
  echo "  1) feat/unified-validator"
  echo "  2) feat/progressive-disclosure"
  echo "  3) feat/tool-simplification"
  echo "  4) feat/metadata-driven-filter"
  echo ""
  echo "Integrator 窗口:"
  echo "  window 1) chore/integrate-refactor4"
  echo ""
  echo "固定 merge 顺序:"
  echo "  1) feat/unified-validator"
  echo "  2) feat/progressive-disclosure"
  echo "  3) feat/agent-loop"
  echo "  4) feat/tool-simplification"
  echo "  5) feat/metadata-driven-filter"
  echo ""
  echo "下一步:"
  echo "  tmux attach -t $SESSION"
  echo "  查看执行文档: docs/iterations/refactor-4/ITER_REFACTOR4_PARALLEL.md"
  echo "  查看运行指南: docs/iterations/refactor-4/run-refactor4.md"
}

main() {
  log_info "开始 Refactor-4 并行开发环境初始化"
  log_info "ROOT_BRANCH=$ROOT_BRANCH"
  log_info "INTEGRATOR_BRANCH=$INTEGRATOR_BRANCH"
  log_info "WT_BASE=$WT_BASE"
  log_info "SESSION=$SESSION"
  log_info "START_CODEX=$START_CODEX"
  log_info "USE_SSH=$USE_SSH"
  echo ""

  check_command git
  check_command tmux
  check_git_repo

  if [ "$START_CODEX" = "true" ]; then
    check_optional_command codex || true
  fi

  ensure_ssh_remote
  check_ssh_connection

  git checkout "$ROOT_BRANCH"
  if git remote get-url origin >/dev/null 2>&1; then
    git pull origin "$ROOT_BRANCH"
  fi

  local i
  for i in "${!ALL_BRANCHES[@]}"; do
    ensure_branch "${ALL_BRANCHES[$i]}"
    ensure_worktree "${ALL_BRANCHES[$i]}" "${ALL_WT_DIRS[$i]}"
  done

  start_tmux_session
  print_summary
  tmux attach -t "$SESSION"
}

main "$@"
