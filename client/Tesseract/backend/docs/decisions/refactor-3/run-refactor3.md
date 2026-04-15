# Refactor-3 快速启动指南
## 一键启动并行开发环境

**迭代 ID**: refactor-3
**执行周期**: 4 周 (2026-03-06 ~ 2026-04-03)

---

## 一、环境准备

### 1.1 前置条件

```bash
# 1. 确保在项目根目录
cd /mnt/c/Users/sam/Documents/Sam/code/tesseract-BE

# 2. 确保 main 分支最新
git checkout main
git pull origin main

# 3. 确保依赖已安装
npm install

# 4. 确保测试通过
npm run build && npm test
```

### 1.2 环境变量

```bash
# 设置环境变量（可选，脚本有默认值）
export ROOT_BRANCH=main
export INTEGRATOR_BRANCH=chore/integrate-refactor3
export WT_BASE=../.zcf/tesseract-BE
export SESSION=refactor3
export START_CODEX=true      # 自动启动 Claude Code 并输入提示词（默认）
export USE_SSH=true          # 使用 SSH 连接 GitHub（默认）
```

**START_CODEX 说明**:
- `true`（默认）: 自动启动 Claude Code 并输入首次提示词（前 4 个 pane）
- `false`: 仅创建 pane，不启动 Claude Code（需手动执行）

**注意**: Integrator pane（第 5 个）不会自动启动 Claude Code，需要手动执行。

### 1.3 SSH 连接检查（重要）

如果使用 SSH 连接 GitHub，请确保：

```bash
# 1. 检查 SSH agent 是否运行
ssh-add -l

# 如果显示 "Could not open a connection to your authentication agent"
# 启动 SSH agent 并添加密钥
eval $(ssh-agent -s)
ssh-add ~/.ssh/id_rsa  # 或你的密钥路径

# 2. 测试 GitHub SSH 连接
ssh -T git@github.com

# 应该看到：
# Hi username! You've successfully authenticated, but GitHub does not provide shell access.

# 3. 如果连接失败，检查 SSH 密钥是否已添加到 GitHub
# https://github.com/settings/keys
```

### 1.4 VSCode 工作区配置（推荐）

为了在 VSCode 中同时查看所有 worktree，使用提供的工作区文件：

```bash
# 在 VSCode 中打开工作区文件
code refactor3-parallel.code-workspace

# 或者从命令行启动
cd /mnt/c/Users/sam/Documents/Sam/code/tesseract-BE
code refactor3-parallel.code-workspace
```

**⚠️ 重要：WSL + VSCode 路径兼容性问题**

由于 worktree 在 WSL 中创建，但 VSCode 在 Windows 上运行，需要修复 Git 路径格式：

```powershell
# 在 PowerShell 中执行（修复 VSCode Git 显示）
cd C:\Users\sam\Documents\Sam\code\tesseract-BE
.\docs\scripts\fix-worktree-paths-for-vscode.ps1

# 然后在 VSCode 中重新加载窗口
# Ctrl+Shift+P → "Developer: Reload Window"
```

**如果需要在 WSL 中使用 Git 命令**，先恢复路径：

```bash
# 在 WSL 中执行（恢复 WSL Git 功能）
bash docs/scripts/restore-worktree-paths-for-wsl.sh
```

**工作区功能**:
- 同时显示 6 个文件夹（main + 5 个 worktree）
- 每个文件夹独立的 Git 状态显示
- 源代码管理面板显示所有仓库
- 支持在不同分支间快速切换文件
- 推荐安装 GitLens 和 Git Graph 扩展

**快捷操作**:
- `Ctrl+Shift+E`: 打开资源管理器，查看所有文件夹
- `Ctrl+Shift+G`: 打开源代码管理，查看所有仓库状态
- `Ctrl+P`: 快速打开文件（跨所有 worktree）
- `Ctrl+Shift+P` → "Git: Focus on SCM View": 聚焦到 Git 面板

---

## 二、一键启动

### 2.1 启动并行开发环境

```bash
# 执行启动脚本（默认自动启动 Claude Code）
bash docs/scripts/refactor3_parallel_tmux.sh

# 或者禁用自动启动（手动执行 claude）
START_CODEX=false bash docs/scripts/refactor3_parallel_tmux.sh
```

**脚本功能**:
- 创建 5 个 git worktree（4 个 feat 分支 + 1 个集成分支）
- 启动 tmux 会话，每个分支一个窗格
- 自动切换到对应分支
- **自动启动 Claude Code 并输入首次提示词**（前 4 个 pane）
- Integrator pane 不自动启动，等待手动执行

### 2.2 Tmux 布局（分屏模式）

```
┌─────────────────────────────────┬─────────────────────────────────┐
│                                 │                                 │
│  Pane 0                         │  Pane 2                         │
│  feat/capability-registry       │  feat/component-composer-       │
│                                 │  refactor                       │
│                                 │                                 │
├─────────────────────────────────┼─────────────────────────────────┤
│                                 │                                 │
│  Pane 1                         │  Pane 3                         │
│  feat/reflection-engine         │  feat/orchestrator-integration  │
│                                 │                                 │
│                                 ├─────────────────────────────────┤
│                                 │                                 │
│                                 │  Pane 4                         │
│                                 │  chore/integrate-refactor3      │
│                                 │  (Integrator)                   │
└─────────────────────────────────┴─────────────────────────────────┘
```

**Tmux 快捷键（分屏模式）**:
- `Ctrl+b` + `方向键 (↑↓←→)`: 切换 pane
- `Ctrl+b` + `z`: 最大化/还原当前 pane（重要！）
- `Ctrl+b` + `q`: 显示 pane 编号（按数字快速跳转）
- `Ctrl+b` + `o`: 循环切换 pane
- `Ctrl+b` + `d`: 分离会话（后台运行）
- `tmux attach -t refactor3`: 重新连接会话
- `Ctrl+b` + `x`: 关闭当前 pane

---

## 三、各分支首次提示词

### 3.1 Pane 0: feat/capability-registry

**切换方式**:
- `Ctrl+b` + `q` 然后按 `0`
- 或 `Ctrl+b` + `方向键` 导航到左上角

**首次提示词**:
```
我需要实现能力注册表（CapabilityRegistry），这是 Refactor-3 的基础设施。

核心需求：
1. 从 HARDWARE_COMPONENTS 构建能力注册表
2. 支持关键词查询（如 "手势识别" → camera.gesture_recognition）
3. 支持能力组合验证（检查依赖关系）
4. 构建关键词倒排索引，优化查询性能

参考设计文档：
@docs/decisions/refactor-3/AGENT_ARCHITECTURE_OPTIMIZATION_CC_FRAMEWORK_V2.md
第 3.1 节 "硬件能力注册表"

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
- 单元测试通过
```

---

### 3.2 Pane 1: feat/reflection-engine

**切换方式**:
- `Ctrl+b` + `q` 然后按 `1`
- 或 `Ctrl+b` + `方向键` 导航到左下角

**首次提示词**:
```
我需要实现反思引擎（ReflectionEngine），负责多轮需求澄清。

核心需求：
1. 检查工作流完整性（trigger/action/feedback/logic）
2. 识别缺失信息并分优先级
3. 使用 LLM 生成针对性澄清问题
4. 计算置信度（0-1），决定是否可以生成工作流

参考设计文档：
@docs/decisions/refactor-3/AGENT_ARCHITECTURE_OPTIMIZATION_CC_FRAMEWORK_V2.md
第 3.2 节 "反思引擎实现"

依赖：feat/capability-registry 已合并到 chore/integrate-refactor3
请先从集成分支拉取最新代码：
git merge chore/integrate-refactor3

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
- 最多 5 轮澄清后强制生成
```

---

### 3.3 Pane 2: feat/component-composer-refactor

**切换方式**:
- `Ctrl+b` + `q` 然后按 `2`
- 或 `Ctrl+b` + `方向键` 导航到右上角

**首次提示词**:
```
我需要重构组件组合器（ComponentComposer），消除所有场景依赖。

核心需求：
1. 删除所有场景相关代码（CATEGORY_REQUIRED_FIELDS、Intent['category']）
2. 重构为基于能力的动态组合
3. 实现能力 → 节点的映射规则
4. 自动构建拓扑结构（无需场景指导）

参考设计文档：
@docs/decisions/refactor-3/AGENT_ARCHITECTURE_OPTIMIZATION_CC_FRAMEWORK_V2.md
第 3.3 节 "组件组合器实现"

依赖：feat/capability-registry 已合并到 chore/integrate-refactor3
请先从集成分支拉取最新代码：
git merge chore/integrate-refactor3

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
- 性能无明显下降
```

---

### 3.4 Pane 3: feat/orchestrator-integration

**切换方式**:
- `Ctrl+b` + `q` 然后按 `3`
- 或 `Ctrl+b` + `方向键` 导航到右中

**首次提示词**:
```
我需要实现 Orchestrator，这是整个 Refactor-3 的集成层。

核心需求：
1. 协调 CapabilityDiscoverer、ReflectionEngine、ComponentComposer
2. 实现完整的能力驱动流程（发现 → 反思 → 组合 → 验证）
3. 管理多轮对话状态
4. 重构 IntakeAgent 为调用 Orchestrator

参考设计文档：
@docs/decisions/refactor-3/AGENT_ARCHITECTURE_OPTIMIZATION_CC_FRAMEWORK_V2.md
第 2.2.2 节 "核心 Agent 设计 - Orchestrator"

依赖：所有 feat 分支已合并到 chore/integrate-refactor3
请先从集成分支拉取最新代码：
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
- 平均响应时间 <8s
```

---

### 3.5 Pane 4: chore/integrate-refactor3 (Integrator)

**切换方式**:
- `Ctrl+b` + `q` 然后按 `4`
- 或 `Ctrl+b` + `方向键` 导航到右下角

**首次提示词**:
```
我是 Integrator，负责合并所有 feat 分支并解决冲突。

合并顺序（严格执行）：
1. feat/capability-registry
2. feat/reflection-engine
3. feat/component-composer-refactor
4. feat/orchestrator-integration

每次合并后执行：
npm run build && npm test

高冲突文件预警：
- src/agents/types.ts（多个分支扩展接口）
- src/agents/intake-agent.ts（删除 + 重构）
- src/agents/component-composer.ts（重构）

冲突解决原则：
1. 删除优先：场景相关代码一律删除
2. 新增保留：新增的能力驱动代码一律保留
3. 重构优先：重构后的代码优先于原有代码
4. 测试完整：合并后确保所有测试通过

当前任务：
等待 feat/capability-registry 完成，准备第一次合并。

请阅读 @docs/decisions/refactor-3/ITER_REFACTOR3_PARALLEL.md 第四节"集成流程"。
```

---

## 四、开发流程

### 4.1 标准开发流程

```bash
# 1. 确保在正确的分支
git branch

# 2. 拉取最新代码（如有依赖）
git merge chore/integrate-refactor3

# 3. 开发 + 测试
npm run build
npm test

# 4. 提交代码
git add .
git commit -m "feat: implement capability registry"

# 5. 推送到远程
git push origin feat/capability-registry

# 6. 通知 Integrator 准备合并
```

### 4.2 合并流程（Integrator）

```bash
# 1. 切换到集成分支
git checkout chore/integrate-refactor3

# 2. 合并 feat 分支
git merge feat/capability-registry --no-ff

# 3. 解决冲突（如有）
# 编辑冲突文件，然后：
git add .
git commit -m "chore: merge feat/capability-registry"

# 4. 运行完整测试
npm run build
npm test
npm run test:integration

# 5. 推送到远程
git push origin chore/integrate-refactor3

# 6. 通知下一个分支可以拉取
```

---

## 五、常见问题

### 5.1 Worktree 创建失败

**问题**: `fatal: 'feat/capability-registry' is already checked out`

**解决**:
```bash
# 删除现有 worktree
git worktree remove ../.zcf/tesseract-BE/feat-capability-registry --force

# 重新运行脚本
bash docs/scripts/refactor3_parallel_tmux.sh
```

### 5.2 SSH 连接失败

**问题**: `Permission denied (publickey)` 或 `Could not open a connection to your authentication agent`

**解决**:
```bash
# 1. 启动 SSH agent
eval $(ssh-agent -s)

# 2. 添加 SSH 密钥
ssh-add ~/.ssh/id_rsa  # 或你的密钥路径

# 3. 验证密钥已加载
ssh-add -l

# 4. 测试 GitHub 连接
ssh -T git@github.com

# 5. 如果仍然失败，检查密钥是否已添加到 GitHub
# https://github.com/settings/keys

# 6. 如果使用 HTTPS，可以临时禁用 SSH 检查
export USE_SSH=false
bash docs/scripts/refactor3_parallel_tmux.sh
```

### 5.3 Tmux 会话丢失

**问题**: 终端关闭后找不到会话

**解决**:
```bash
# 列出所有会话
tmux ls

# 重新连接
tmux attach -t refactor3
```

### 5.4 Pane 太小看不清

**问题**: 分屏后每个 pane 太小

**解决**:
```bash
# 最大化当前 pane（重要！）
Ctrl+b + z

# 再按一次还原
Ctrl+b + z

# 或者调整 pane 大小
Ctrl+b + :
# 输入: resize-pane -D 10  # 向下扩展 10 行
# 输入: resize-pane -U 10  # 向上扩展 10 行
# 输入: resize-pane -L 10  # 向左扩展 10 列
# 输入: resize-pane -R 10  # 向右扩展 10 列
```

### 5.5 合并冲突无法解决

**问题**: 冲突太复杂，不确定如何处理

**解决**:
1. 查看冲突文件：`git diff`
2. 参考 `ITER_REFACTOR3_PARALLEL.md` 第 4.3 节"高冲突文件预警"
3. 遵循冲突解决原则（删除优先、新增保留、重构优先）
4. 如仍无法解决，联系架构师

### 5.6 测试失败

**问题**: 合并后测试失败

**解决**:
```bash
# 1. 查看失败的测试
npm test -- --verbose

# 2. 检查是否有未删除的场景代码
grep -r "CATEGORY_REQUIRED_FIELDS\|face_recognition_action" src/agents/

# 3. 检查类型错误
npm run typecheck

# 4. 如果是集成测试失败，检查端到端流程
npm run test:integration -- --verbose
```

---

## 六、验收与交付

### 6.1 分支验收

每个 feat 分支完成后，执行以下检查：

```bash
# 1. 代码质量
npm run lint
npm run typecheck

# 2. 测试覆盖率
npm run test:coverage

# 3. 功能验证
npm run build
npm test

# 4. 文档完整性
# 检查是否更新了 CLAUDE.md
# 检查是否添加了 L3 头部注释
```

### 6.2 迭代验收

整个 Refactor-3 完成后，执行以下检查：

```bash
# 1. 完整测试套件
npm run build
npm test
npm run test:integration

# 2. 性能测试
npm run test:performance

# 3. 场景验证（grep 确认无场景代码）
grep -r "CATEGORY_REQUIRED_FIELDS\|face_recognition_action\|emotion_interaction\|game_interaction" src/agents/

# 4. 端到端测试（3 个场景）
# 石头剪刀布
# 人脸识别 + 语音欢迎
# 自定义场景

# 5. 填写集成输出报告
# 编辑 docs/decisions/refactor-3/ITER_REFACTOR3_INTEGRATION_OUTPUT.md
```

---

## 七、紧急联系

**架构师**: [联系方式]
**Integrator**: [联系方式]
**Slack 频道**: #refactor-3

**紧急情况触发条件**:
- 发现阻塞性问题
- 架构设计需要调整
- 合并冲突无法解决
- 测试失败无法修复

**响应时间**: 2 小时内

---

**Conceived by Romuald Członkowski** - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)
