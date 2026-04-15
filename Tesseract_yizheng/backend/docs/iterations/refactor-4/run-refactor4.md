# Refactor-4 快速启动指南
## Harness Engineering 并行执行资产包

**迭代 ID**: `refactor4`  
**基线分支**: `main`  
**集成分支**: `chore/integrate-refactor4`

---

## 1) 一键启动

```bash
chmod +x docs/iterations/refactor-4/refactor4_parallel_tmux.sh
./docs/iterations/refactor-4/refactor4_parallel_tmux.sh
```

可选参数：

```bash
ROOT_BRANCH=main \
INTEGRATOR_BRANCH=chore/integrate-refactor4 \
WT_BASE=../.zcf/tesseract-BE \
SESSION=refactor4 \
START_CODEX=true \
USE_SSH=true \
./docs/iterations/refactor-4/refactor4_parallel_tmux.sh
```

---

## 2) 环境变量与默认值

```bash
export ROOT_BRANCH=main
export INTEGRATOR_BRANCH=chore/integrate-refactor4
export WT_BASE=../.zcf/tesseract-BE
export SESSION=refactor4
export START_CODEX=true
export USE_SSH=true
```

说明：

- `ROOT_BRANCH`: 所有 worktree 的基线分支
- `INTEGRATOR_BRANCH`: Integrator 收敛分支
- `WT_BASE`: worktree 根目录
- `SESSION`: tmux 会话名
- `START_CODEX`: 是否自动启动 Codex 并注入首次提示词
- `USE_SSH`: 是否检查并强制使用 GitHub SSH remote

---

## 3) 分支矩阵

1. `feat/agent-loop`
2. `feat/unified-validator`
3. `feat/progressive-disclosure`
4. `feat/tool-simplification`
5. `feat/metadata-driven-filter`
6. `chore/integrate-refactor4`

**启动顺序**：
- 先创建全部 worktree
- window 0 启动 5 个 feature panes
- window 1 打开 integrator 独立窗口待命

**固定 merge 顺序**：
1. `feat/unified-validator`
2. `feat/progressive-disclosure`
3. `feat/agent-loop`
4. `feat/tool-simplification`
5. `feat/metadata-driven-filter`
6. `chore/integrate-refactor4 -> main`

---

## 4) Tmux 布局

### window 0: Feature Lanes

- pane 0: `feat/agent-loop`
- pane 1: `feat/unified-validator`
- pane 2: `feat/progressive-disclosure`
- pane 3: `feat/tool-simplification`
- pane 4: `feat/metadata-driven-filter`

### window 1: Integrator

- pane 0: `chore/integrate-refactor4`

---

## 5) 首条 Prompt 模板

所有 lane 统一要求：

- 先读 `/root/.codex/AGENTS.md`
- 再读仓库根 `CLAUDE.md`
- 再读 `docs/iterations/refactor-4/ITER_REFACTOR4_PARALLEL.md`
- 再读 `docs/decisions/refactor-4/HARNESS_ENGINEERING_REFACTOR.md`
- 回复时必须包含：
  - `files changed`
  - `how to test`
  - `current checkpoint`

### A. feat/agent-loop

```text
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
```

### B. feat/unified-validator

```text
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
```

### C. feat/progressive-disclosure

```text
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
```

### D. feat/tool-simplification

```text
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
```

### E. feat/metadata-driven-filter

```text
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
```

### Integrator

```text
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
```

---

## 6) 阶段检查点 Commit 规范

### Feature 分支默认

1. `chore(<lane>): scaffold contracts and docs`
2. `feat(<lane>): implement core path`
3. `test(<lane>): cover edge cases and metrics`
4. `refactor(<lane>): tighten boundaries and merge prep`

### 特殊 lane

- `feat/agent-loop` 允许第 5 个 checkpoint：
  - `feat(agent-loop): add model-feedback validation loop`
- `feat/tool-simplification` 与 `feat/metadata-driven-filter` 最少 3 个 checkpoint

### Integrator 分支

- `merge: <branch> into chore/integrate-refactor4`
- `fix: resolve integration conflicts`
- `test: run refactor4 regression gates`

---

## 7) Integrator 合并步骤

```bash
git checkout chore/integrate-refactor4

git merge feat/unified-validator --no-ff
git merge feat/progressive-disclosure --no-ff
git merge feat/agent-loop --no-ff
git merge feat/tool-simplification --no-ff
git merge feat/metadata-driven-filter --no-ff
```

每次 merge 后最少执行：

```bash
npm run typecheck
```

最终收口执行：

```bash
npm test
```

并把结果回写到：

```text
docs/iterations/refactor-4/ITER_REFACTOR4_INTEGRATION_OUTPUT.md
```

---

## 8) 最终回归清单

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] 初始化 token：`< 500`
- [ ] 系统 prompt token：`2-4K`
- [ ] 10 轮对话 token：`< 8K`
- [ ] 验证修复成功率：`> 85%`
- [ ] 最大文件行数：`< 500`
- [ ] validator API 数量：`1`
- [ ] 硬编码节点数：`< 20`
- [ ] 文档、脚本、分支矩阵、merge order 一致

---

## 9) 可参考资产

- `docs/scripts/refactor3_parallel_tmux.sh`
- `docs/decisions/refactor-3/ITER_REFACTOR3_PARALLEL.md`
- `docs/decisions/refactor-3/run-refactor3.md`
- `docs/decisions/refactor-3/refactor3-parallel.code-workspace`
