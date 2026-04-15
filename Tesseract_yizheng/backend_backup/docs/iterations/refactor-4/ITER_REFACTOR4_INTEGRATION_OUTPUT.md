# Refactor-4 集成输出
## Harness Engineering 重构 - 当前阶段验收记录

## 1. 集成信息

- Integrator 分支：`chore/integrate-refactor4`
- 基线分支：`main`
- 目标分支：`main`
- 记录日期：`2026-03-13`
- Integrator：`Codex / 本地单工作树连续实现`
- 说明：`当前尚未执行真实 lane merge，本文件记录的是 Refactor-4 各阶段的本地验收状态，而不是最终 git merge 审计。`

## 2. 合并顺序与提交

1. `feat/unified-validator` -> `已等价实现，未执行真实 merge`
2. `feat/progressive-disclosure` -> `已等价实现，未执行真实 merge`
3. `feat/agent-loop` -> `已等价实现，未执行真实 merge`
4. `feat/tool-simplification` -> `已等价实现，未执行真实 merge`
5. `feat/metadata-driven-filter` -> `已等价实现，未执行真实 merge`
6. `chore/integrate-refactor4` -> `正在收口`
   - `fix: correct database native availability probe`
   - `fix: stabilize websocket/open-frame test helpers and agent protocol fixtures`

## 3. 冲突与解决

- 当前没有真实 branch merge，因此没有 git 级冲突记录。
- 已处理的“实现级冲突”：
  - 文件：`src/agents/orchestrator.ts` 与 `src/agents/orchestrator/workflow-config-normalizer.ts`
  - 原因：抽取子模块后，prompt 工具输入契约与 normalizer 新接口不一致
  - 解决策略：回贴到现有 `detectNodeCategory / generateNodeNotes / generateNodeName` 契约，不额外发明新接口
  - 文件：`src/agents/prompts/architect-system.ts`
  - 原因：压缩 prompt 时模板字符串内反引号未转义，导致 TypeScript 解析失败
  - 解决策略：保留高信号规则，但统一改为转义反引号文本
  - 文件：`src/mcp/server.ts`
  - 原因：`get_node` 拆分后，legacy `mode/propertyQuery/fromVersion` 调用会被模型继续沿用，导致边界重新变脏
  - 解决策略：显式拒绝 legacy 参数，并回给 `get_node_docs / search_node_properties / get_node_versions` 迁移指引
  - 文件：`tests/utils/test-helpers.ts`
  - 原因：Refactor-4 WebSocket 运行时会在连接建立后立即推送 `runtime_status`，旧 helper 在 `open` 之后才建消息队列，导致首帧丢失和偶发超时
  - 解决策略：建连等待前先注册消息队列，并在 `OPEN` 状态下立即返回
  - 文件：`tests/integration/agent/{agent-api,agent-websocket}.test.ts`
  - 原因：旧 fixture 仍在伪造 Refactor-3 风格的分类输出，未提供新的 semantic discovery / reflection / workflow validation 闭环
  - 解决策略：改为 deterministic Orchestrator fixture，并补齐 `validateWorkflow / autofixWorkflow` stub
  - 文件：`tests/integration/database/test-utils.ts`
  - 原因：之前只靠 `require('better-sqlite3')` 判断 native 可用性，会把“模块可加载但 native binding 不可实例化”的环境误判成可运行
  - 解决策略：改为真实 `:memory:` 探针，失败即跳过数据库 native 集成测

## 4. Refactor-4 验收结果

- 初始化 token：`29` / 目标 `< 500` / 状态 `通过`
- 系统 prompt token：`2221` / 目标 `2-4K` / 状态 `通过`
- 10 轮历史 token：`544` / 目标 `< 8K` / 状态 `通过`
- 验证修复成功率：`85.7%` / 目标 `> 85%` / 状态 `通过`
- 最大文件行数（P0 目标文件 `orchestrator.ts`）：`493` / 目标 `< 500` / 状态 `通过`
- validator API 数量（公开入口）：`1` / 目标 `1` / 状态 `通过`
- 硬编码节点数：`8` / 目标 `< 20` / 状态 `通过`

## 5. 回归测试结果

- [x] `npm run typecheck`
- [ ] `npm test`
  - 说明：全量仓库仍未作为最终门通过，但阻塞已不再是 Refactor-4 scoped 回归
  - 当前剩余失败样本：`tests/unit/docker/*.test.ts`、`tests/logger.test.ts`、根级 `apps/agent-ui` 测试环境、旧 `tests/e2e/*.test.ts`
  - 根因：仓库既有基线问题，包括 docker 断言、时区格式预期、jsdom 环境配置与旧 E2E 语义
- [x] Refactor-4 scoped regression gates
  - 命令：`vitest run` 覆盖数据库/MCP/Agent/Refactor-4 核心 14 文件包
  - 结果：`10 passed + 4 skipped`
  - 说明：4 个数据库集成测试在 native binding 不可用时已按设计跳过，不再误报失败
- [x] 主循环可运行
  - 证据：`agent-loop.test.ts`、`orchestrator.test.ts`、`refactor4-acceptance.test.ts`
- [x] 无 hint-style 硬编码回流
  - 说明：本轮改动集中于 loop/validator/disclosure/filter，未重新引入 HINTS 风格捷径
- [x] 文档、脚本、分支矩阵、merge order 一致
  - 证据：`ITER_REFACTOR4_PARALLEL.md` 与本文件状态同步

## 6. 遗留风险与 Follow-up

- `src/agents/workflow-architect.ts` 仍为 `4085` 行，未满足“每文件 < 800 行”的质量门
- 真实 `chore/integrate-refactor4` merge、冲突解决和全量回归尚未执行
- 全量 `npm test` 仍受仓库既有基线问题阻塞，尚不能作为 Refactor-4 最终 gate
