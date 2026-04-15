# docs 文档导航（按现代化目录重组）

当前文档目录已按“概览 → 入门 → 使用 → 开发 → 部署 → 安全 → 决策 → 变更”重构。
同时新增 `memory/` 作为长时程开发记忆层，用来承接跨会话的小核心、日报沉淀与稳定经验库。
`docs/iterations/` 作为迭代执行资产目录，承载某次重构的 runbook、launcher 与 integration output。
`docs/scripts/` 则只保留跨迭代复用的通用脚本。

## 目录结构

```text
docs/
├── README.md
├── memory/
├── iterations/
├── scripts/
├── overview/
├── getting-started/
├── usage/
├── development/
├── deployment/
├── security/
├── decisions/
└── changelog/
```

## 各目录用途

- `docs/overview/`：项目背景、历史重构资料、研究分析与原型。
- `docs/memory/`：长时程项目记忆层，按 `MEMORY.md + daily/ + bank/` 组织长期上下文。
- `docs/iterations/`：迭代执行资产目录，按单次迭代聚合并行执行清单、启动脚本与集成留痕。
- `docs/scripts/`：跨迭代复用脚本目录，提供路径修复、环境检测等通用能力。
- `docs/getting-started/`：新同学快速上手入口（环境、初始化、阅读顺序）。
- `docs/usage/`：API、节点定义、工作流样例与调用说明。
- `docs/development/`：开发执行文档、重构计划、实施清单。
- `docs/deployment/`：部署相关文档、FRP 与运行辅助脚本。
- `docs/security/`：安全策略、凭据与访问控制规范（预留目录）。
- `docs/decisions/`：架构/流程关键决策与确认记录。
- `docs/changelog/`：阶段报告、状态追踪、完成记录。

## 当前核心入口

- 长时记忆入口：`docs/memory/MEMORY.md`
- Refactor-4 并行执行：`docs/iterations/refactor-4/ITER_REFACTOR4_PARALLEL.md`
- Refactor-4 快速启动：`docs/iterations/refactor-4/run-refactor4.md`
- API：`docs/usage/api/agent-api.md`
- ConfigAgent 执行：`docs/development/config-agent/CONFIG_AGENT_EXECUTION.md`
- Intake 工作流样例：`docs/usage/intake-agent/json/game_0203.json`
- 架构决策（v4）：`docs/decisions/refactor-2/AGENT_ARCHITECTURE_REFACTOR_v4.md`
- 执行状态：`docs/changelog/refactor-2/STATUS.md`

## 迁移说明

- 旧 `docs/refactor` 已归档到 `docs/overview/refactor-legacy/`。
- 旧 `docs/refactor_2` 已拆分到 `development/`、`decisions/`、`changelog/`。
- 旧 `docs/intake_agent` 已迁移到 `docs/usage/intake-agent/`。
- 旧 `docs/inbox/json` 已迁移到 `docs/usage/workflow-inbox/json/`。
