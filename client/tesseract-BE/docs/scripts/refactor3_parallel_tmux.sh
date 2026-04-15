#!/usr/bin/env bash
# ============================================================================
# Refactor-3 并行开发环境启动脚本
# ============================================================================
# 功能：创建 5 个 git worktree + 启动 tmux 会话
# 用法：bash docs/scripts/refactor3_parallel_tmux.sh
# ============================================================================

set -euo pipefail

# ============================================================================
# 配置变量（可通过环境变量覆盖）
# ============================================================================

ROOT_BRANCH="${ROOT_BRANCH:-main}"
INTEGRATOR_BRANCH="${INTEGRATOR_BRANCH:-chore/integrate-refactor3}"
WT_BASE="${WT_BASE:-../.zcf/tesseract-BE}"
SESSION="${SESSION:-refactor3}"
START_CODEX="${START_CODEX:-true}"  # 默认启动 Claude Code 并输入提示词
USE_SSH="${USE_SSH:-true}"  # 默认使用 SSH

# 分支列表
BRANCHES=(
  "feat/capability-registry"
  "feat/reflection-engine"
  "feat/component-composer-refactor"
  "feat/orchestrator-integration"
  "$INTEGRATOR_BRANCH"
)

# Worktree 目录名（去掉 / 替换为 -）
WT_DIRS=(
  "feat-capability-registry"
  "feat-reflection-engine"
  "feat-component-composer-refactor"
  "feat-orchestrator-integration"
  "chore-integrate-refactor3"
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

# 检查命令是否存在
check_command() {
  if ! command -v "$1" &>/dev/null; then
    log_error "命令 '$1' 未找到，请先安装"
    exit 1
  fi
}

# 检查是否在 git 仓库中
check_git_repo() {
  if ! git rev-parse --git-dir &>/dev/null; then
    log_error "当前目录不是 git 仓库"
    exit 1
  fi
}

# 检查并转换 remote URL 为 SSH
ensure_ssh_remote() {
  if [ "$USE_SSH" != "true" ]; then
    return 0
  fi

  if ! git remote get-url origin &>/dev/null; then
    log_info "未配置 remote origin，跳过"
    return 0
  fi

  local remote_url
  remote_url=$(git remote get-url origin)

  # 如果已经是 SSH URL，直接返回
  if [[ "$remote_url" == git@github.com:* ]]; then
    log_info "Remote URL 已是 SSH 格式"
    return 0
  fi

  # 如果是 HTTPS URL，转换为 SSH
  if [[ "$remote_url" =~ https://github.com/([^/]+)/(.+)\.git ]]; then
    local user="${BASH_REMATCH[1]}"
    local repo="${BASH_REMATCH[2]}"
    local ssh_url="git@github.com:${user}/${repo}.git"

    log_info "检测到 HTTPS URL: $remote_url"
    log_info "转换为 SSH URL: $ssh_url"

    git remote set-url origin "$ssh_url"
    log_success "Remote URL 已转换为 SSH"
  else
    log_info "Remote URL 格式未知，保持不变: $remote_url"
  fi
}

# 检查 SSH 连接（如果使用 SSH）
check_ssh_connection() {
  if [ "$USE_SSH" != "true" ]; then
    return 0
  fi

  log_info "检查 SSH 连接..."

  # 检查是否有 SSH agent
  if ! ssh-add -l &>/dev/null; then
    log_error "SSH agent 未运行或未加载密钥"
    log_info "请执行以下命令："
    log_info "  eval \$(ssh-agent -s)"
    log_info "  ssh-add ~/.ssh/id_rsa  # 或你的密钥路径"
    exit 1
  fi

  # 测试 GitHub SSH 连接
  # 注意：GitHub 在认证成功时通常返回退出码 1（不提供 shell），
  # 不能直接用退出码判断成功，否则会被 pipefail 误判。
  local ssh_output
  ssh_output=$(ssh -T git@github.com 2>&1 || true)
  if echo "$ssh_output" | grep -qi "successfully authenticated"; then
    log_success "GitHub SSH 连接正常"
  else
    log_error "GitHub SSH 连接失败"
    echo "$ssh_output" | head -5 >&2
    log_info "请检查："
    log_info "  1. SSH 密钥是否已添加到 GitHub: https://github.com/settings/keys"
    log_info "  2. 测试连接: ssh -T git@github.com"
    log_info "  3. 查看 SSH 配置: cat ~/.ssh/config"
    exit 1
  fi
}

# 创建或切换分支
ensure_branch() {
  local branch=$1
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    log_info "分支 '$branch' 已存在"
  else
    log_info "创建分支 '$branch' 基于 '$ROOT_BRANCH'"
    git branch "$branch" "$ROOT_BRANCH"
  fi
}

# 创建 worktree（幂等）
ensure_worktree() {
  local branch=$1
  local wt_dir=$2
  local wt_path="$WT_BASE/$wt_dir"

  # 检查 worktree 是否已存在
  if git worktree list | grep -q "$wt_path"; then
    log_info "Worktree '$wt_path' 已存在，跳过创建"
    return 0
  fi

  # 创建父目录
  mkdir -p "$WT_BASE"

  # 创建 worktree
  log_info "创建 worktree: $wt_path (分支: $branch)"
  git worktree add "$wt_path" "$branch"
}

# 启动 tmux 会话（分屏模式）
start_tmux_session() {
  # 检查会话是否已存在
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    log_info "Tmux 会话 '$SESSION' 已存在"
    log_info "使用 'tmux attach -t $SESSION' 连接"
    return 0
  fi

  log_info "创建 tmux 会话: $SESSION（分屏模式）"

  # 定义首次提示词
  local PROMPT_0="我需要实现能力注册表（CapabilityRegistry），这是 Refactor-3 的基础设施。

核心需求：
1. 从 HARDWARE_COMPONENTS 构建能力注册表
2. 支持关键词查询（如 \"手势识别\" → camera.gesture_recognition）
3. 支持能力组合验证（检查依赖关系）
4. 构建关键词倒排索引，优化查询性能

参考设计文档：
@docs/decisions/refactor-3/AGENT_ARCHITECTURE_OPTIMIZATION_CC_FRAMEWORK_V2.md
第 3.1 节 \"硬件能力注册表\"

请先阅读现有的 @src/agents/hardware-components.ts，然后开始实现。

实现步骤：
1. 定义 HardwareCapability 接口（扩展 types.ts）
2. 实现 CapabilityRegistry 类（新建 capability-registry.ts）
3. 实现 query() 方法（关键词查询）
4. 实现 canCompose() 方法（依赖检查）
5. 编写单元测试（覆盖率 >90%）

验收标准：
- 查询性能 <10ms
- 支持模糊匹配
- 单元测试通过"

  local PROMPT_1="我需要实现反思引擎（ReflectionEngine），负责多轮需求澄清。

核心需求：
1. 检查工作流完整性（trigger/action/feedback/logic）
2. 识别缺失信息并分优先级
3. 使用 LLM 生成针对性澄清问题
4. 计算置信度（0-1），决定是否可以生成工作流

参考设计文档：
@docs/decisions/refactor-3/AGENT_ARCHITECTURE_OPTIMIZATION_CC_FRAMEWORK_V2.md
第 3.2 节 \"反思引擎实现\"


然后阅读 @src/agents/capability-registry.ts 和 @src/agents/llm-client.ts，开始实现。

实现步骤：
1. 定义 ReflectionResult、MissingInfo、ClarificationQuestion 接口
2. 实现 ReflectionEngine 类（新建 reflection-engine.ts）
3. 实现 checkCompleteness() 方法
4. 实现 identifyMissingInfo() 方法
5. 实现 generateClarificationQuestions() 方法（集成 LLM）
6. 实现 calculateConfidence() 方法
7. 编写单元测试（覆盖率 >85%）

验收标准：
- 能识别 5 类缺失信息
- 生成的问题针对性强
- 置信度计算合理
- 最多 5 轮澄清后强制生成"

  local PROMPT_2="我需要重构组件组合器（ComponentComposer），消除所有场景依赖。

核心需求：
1. 删除所有场景相关代码（CATEGORY_REQUIRED_FIELDS、Intent['category']）
2. 重构为基于能力的动态组合
3. 实现能力 → 节点的映射规则
4. 自动构建拓扑结构（无需场景指导）

参考设计文档：
@docs/decisions/refactor-3/AGENT_ARCHITECTURE_OPTIMIZATION_CC_FRAMEWORK_V2.md
第 3.3 节 \"组件组合器实现\"


然后阅读 @src/agents/capability-registry.ts 和现有的 @src/agents/component-composer.ts，开始重构。

⚠️ 重要：删除代码前请确认无其他模块依赖。

实现步骤：
1. 删除 CATEGORY_REQUIRED_FIELDS（intake-agent.ts）
2. 删除 Intent['category'] 场景枚举（types.ts）
3. 重构 ComponentComposer.compose() 方法
4. 实现 capabilitiesToNodes() 方法（能力 → 节点）
5. 实现 buildTopology() 方法（自动拓扑）
6. 更新集成测试

验收标准：
- 无任何硬编码场景（grep 验证）
- 支持任意能力组合
- 生成的工作流通过验证
- 性能无明显下降"

  local PROMPT_3="我需要实现 Orchestrator，这是整个 Refactor-3 的集成层。

核心需求：
1. 协调 CapabilityDiscoverer、ReflectionEngine、ComponentComposer
2. 实现完整的能力驱动流程（发现 → 反思 → 组合 → 验证）
3. 管理多轮对话状态
4. 重构 IntakeAgent 为调用 Orchestrator

参考设计文档：
@docs/decisions/refactor-3/AGENT_ARCHITECTURE_OPTIMIZATION_CC_FRAMEWORK_V2.md
第 2.2.2 节 \"核心 Agent 设计 - Orchestrator\"
git merge chore/integrate-refactor3

然后阅读所有依赖模块：
- @src/agents/capability-registry.ts
- @src/agents/reflection-engine.ts
- @src/agents/component-composer.ts

开始集成。

实现步骤：
1. 实现 Orchestrator 类（新建 orchestrator.ts）
2. 实现能力发现阶段（调用 CapabilityRegistry）
3. 实现反思阶段（调用 ReflectionEngine）
4. 实现组合阶段（调用 ComponentComposer）
5. 实现验证循环
6. 重构 IntakeAgent 为调用 Orchestrator
7. 编写端到端测试（3 个场景）

测试场景：
1. 石头剪刀布机器人（参考文档 2.3 节）
2. 人脸识别 + 语音欢迎
3. 自定义场景（用户自由描述）

验收标准：
- 支持任意用户需求
- 多轮对话流畅
- 生成的工作流质量不低于现有系统
- 平均响应时间 <8s"

  # 创建会话，第一个 pane (0) - feat/capability-registry
  tmux new-session -d -s "$SESSION" -c "$WT_BASE/${WT_DIRS[0]}"
  tmux send-keys -t "$SESSION:0.0" "echo '=== ${BRANCHES[0]} ==='" C-m
  tmux send-keys -t "$SESSION:0.0" "git branch" C-m
  tmux send-keys -t "$SESSION:0.0" "echo ''" C-m
  if [ "$START_CODEX" = "true" ]; then
    sleep 2
    tmux send-keys -t "$SESSION:0.0" "q" C-m
    sleep 2
    tmux send-keys -t "$SESSION:0.0" "codex --dangerously-bypass-approvals-and-sandbox" C-m
    sleep 2
    tmux send-keys -t "$SESSION:0.0" "$PROMPT_0" C-m
    sleep 2
    tmux send-keys -t "$SESSION:0.0" 0 Enter
  fi

  # 水平分割创建第二个 pane (1) - feat/reflection-engine
  tmux split-window -h -t "$SESSION:0.0" -c "$WT_BASE/${WT_DIRS[1]}"
  tmux send-keys -t "$SESSION:0.1" "echo '=== ${BRANCHES[1]} ==='" C-m
  tmux send-keys -t "$SESSION:0.1" "git branch" C-m
  tmux send-keys -t "$SESSION:0.1" "echo ''" C-m
  if [ "$START_CODEX" = "true" ]; then
    sleep 2
    tmux send-keys -t "$SESSION:0.1" "q" C-m
    sleep 2
    tmux send-keys -t "$SESSION:0.1" "codex --dangerously-bypass-approvals-and-sandbox" C-m
    sleep 2
    tmux send-keys -t "$SESSION:0.1" "$PROMPT_1" C-m
    sleep 2
    tmux send-keys -t "$SESSION:0.1" 0 Enter
  fi

  # 在右侧 pane 垂直分割创建第三个 pane (2) - feat/component-composer-refactor
  tmux split-window -v -t "$SESSION:0.1" -c "$WT_BASE/${WT_DIRS[2]}"
  tmux send-keys -t "$SESSION:0.2" "echo '=== ${BRANCHES[2]} ==='" C-m
  tmux send-keys -t "$SESSION:0.2" "git branch" C-m
  tmux send-keys -t "$SESSION:0.2" "echo ''" C-m
  if [ "$START_CODEX" = "true" ]; then
    sleep 2
    tmux send-keys -t "$SESSION:0.2" "q" C-m
    sleep 2
    tmux send-keys -t "$SESSION:0.2" "codex --dangerously-bypass-approvals-and-sandbox" C-m
    sleep 2
    tmux send-keys -t "$SESSION:0.2" "$PROMPT_2" C-m
    sleep 2
    tmux send-keys -t "$SESSION:0.2" 0 Enter
  fi

  # 在右下 pane 垂直分割创建第四个 pane (3) - feat/orchestrator-integration
  tmux split-window -v -t "$SESSION:0.2" -c "$WT_BASE/${WT_DIRS[3]}"
  tmux send-keys -t "$SESSION:0.3" "echo '=== ${BRANCHES[3]} ==='" C-m
  tmux send-keys -t "$SESSION:0.3" "git branch" C-m
  tmux send-keys -t "$SESSION:0.3" "echo ''" C-m
  if [ "$START_CODEX" = "true" ]; then
    sleep 2
    tmux send-keys -t "$SESSION:0.3" "q" C-m
    sleep 2
    tmux send-keys -t "$SESSION:0.3" "codex --dangerously-bypass-approvals-and-sandbox" C-m
  fi


  # 调整布局为 tiled（平铺）
  tmux select-layout -t "$SESSION:0" tiled

  # 选择第一个 pane（左上角）
  tmux select-pane -t "$SESSION:0.0"

  log_success "Tmux 会话创建成功（5 个分屏）"
  log_info "使用 'tmux attach -t $SESSION' 连接"
  log_info ""
  log_info "分屏快捷键："
  log_info "  Ctrl+b + 方向键: 切换 pane"
  log_info "  Ctrl+b + z: 最大化/还原当前 pane"
  log_info "  Ctrl+b + q: 显示 pane 编号"
  log_info "  Ctrl+b + o: 循环切换 pane"
}

# ============================================================================
# 主流程
# ============================================================================

main() {
  log_info "开始 Refactor-3 并行开发环境初始化"
  log_info "配置："
  log_info "  ROOT_BRANCH=$ROOT_BRANCH"
  log_info "  INTEGRATOR_BRANCH=$INTEGRATOR_BRANCH"
  log_info "  WT_BASE=$WT_BASE"
  log_info "  SESSION=$SESSION"
  log_info "  START_CODEX=$START_CODEX"
  log_info "  USE_SSH=$USE_SSH"
  echo ""

  # 1. 检查依赖
  log_info "检查依赖..."
  check_command git
  check_command tmux
  check_git_repo
  check_ssh_connection
  ensure_ssh_remote

  # 2. 确保在 main 分支最新
  log_info "确保 $ROOT_BRANCH 分支最新..."
  git checkout "$ROOT_BRANCH"

  # 检查是否有远程仓库配置
  if git remote get-url origin &>/dev/null; then
    log_info "从远程拉取最新代码（使用 SSH）..."
    git pull origin "$ROOT_BRANCH" || {
      log_error "拉取 $ROOT_BRANCH 失败"
      log_info "如果是 SSH 密钥问题，请检查："
      log_info "  1. ssh-add -l  # 查看已加载的密钥"
      log_info "  2. ssh -T git@github.com  # 测试 GitHub SSH 连接"
      log_info "  3. eval \$(ssh-agent -s) && ssh-add ~/.ssh/id_rsa  # 添加密钥"
      exit 1
    }
  else
    log_info "未配置远程仓库，跳过拉取"
  fi

  # 3. 创建所有分支
  log_info "创建分支..."
  for branch in "${BRANCHES[@]}"; do
    ensure_branch "$branch"
  done

  # 4. 创建所有 worktree
  log_info "创建 worktree..."
  for i in {0..4}; do
    ensure_worktree "${BRANCHES[$i]}" "${WT_DIRS[$i]}"
  done

  # 5. 启动 tmux 会话
  log_info "启动 tmux 会话..."
  start_tmux_session
  tmux attach -t $SESSION

  # 6. 完成
  echo ""
  log_success "环境初始化完成！"
  echo ""
  echo "下一步:"
  echo "  1. 连接 tmux 会话: tmux attach -t $SESSION"
  echo "  2. 切换 pane: Ctrl+b + 方向键"
  echo "  3. 最大化 pane: Ctrl+b + z（再按一次还原）"
  echo "  4. 显示 pane 编号: Ctrl+b + q"
  echo "  5. 分离会话: Ctrl+b + d"
  echo "  6. 查看执行指南: docs/decisions/refactor-3/run-refactor3.md"
  echo ""
  echo "分支列表（分屏布局）:"
  echo "  ┌─────────────────┬─────────────────┐"
  echo "  │ Pane 0: ${BRANCHES[0]}"
  echo "  │                 │ Pane 2: ${BRANCHES[2]}"
  echo "  ├─────────────────┤"
  echo "  │ Pane 1: ${BRANCHES[1]}"
  echo "  │                 │ Pane 3: ${BRANCHES[3]}"
  echo "  │                 ├─────────────────┤"
  echo "  │                 │ Pane 4: ${BRANCHES[4]}"
  echo "  └─────────────────┴─────────────────┘"
  echo ""
}

# ============================================================================
# 脚本入口
# ============================================================================

main "$@"
