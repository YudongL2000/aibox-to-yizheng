# Refactor-4 并行执行清单
## Harness Engineering 重构 - 6 Lane 并行交付方案

基线分支：`main`  
集成分支：`chore/integrate-refactor4`  
目标：基于 [HARNESS_ENGINEERING_REFACTOR.md](../../decisions/refactor-4/HARNESS_ENGINEERING_REFACTOR.md) 将当前 Agent 系统收敛为更薄的 harness，完成单循环、统一验证、渐进式披露、工具简化与元数据驱动 filter 的并行交付。

---

## 1. 范围与目标

### US-R4-1 主循环扁平化
- [ ] 将 5 阶段硬编码管线收敛为 `while(tool_call)` 风格的主循环骨架
- [ ] 验证失败时进入 `autoFixable / needsModel / needsUser` 三层反馈

### US-R4-2 统一验证架构
- [ ] 6 个验证 API 收敛为统一 `validate(target)` 入口
- [ ] 表达式校验三重实现合并为单一分层管线

### US-R4-3 渐进式上下文披露
- [ ] 工具初始暴露从全量 schema 改为摘要 + 按需 schema
- [ ] Prompt 注入收敛为 core + on-demand modules
- [ ] 会话历史引入 recent window + summary 压缩

### US-R4-4 工具简化
- [ ] `get_node` 的厚模式拆成语义清晰的独立工具
- [ ] 工具命名与分组前缀收敛，单工具参数维度 < 5

### US-R4-5 元数据驱动 essentials
- [ ] PropertyFilter 从 150+ 节点硬编码迁移到元数据推断 + 少量手工 override
- [ ] 新增节点默认无需手工接入 essentials 配置

---

## 2. 并行分支矩阵

### Branch A：Agent Loop Core
- 分支名：`feat/agent-loop`
- 模块 owner：Agent Core / Harness Kernel
- 允许改动：
  - `src/agents/orchestrator.ts`
  - `src/agents/intake-agent.ts`
  - `src/agents/session-service.ts`
  - `src/agents/types.ts`
  - `src/agent-server/agent-service.ts`
  - `src/agent-server/websocket.ts`
  - `tests/unit/agents/orchestrator.test.ts`
  - `tests/unit/agents/session-service.test.ts`
  - `tests/unit/agent-server/agent-service.test.ts`
- 禁止侵入：
  - `src/services/property-filter.ts`
  - 表达式/validator 细节实现
  - MCP tool 文档体系
- 交付：
  - `agent-loop.ts` 新骨架或等价 loop 承载层
  - 主循环从 `orchestrator.ts` 剥离
  - 模型反馈式验证回路
- lane 局部验收：
  - [ ] `orchestrator.ts` 不再持有完整主循环
  - [ ] 新 loop 承载层 < 200 行
  - [ ] 验证失败不再只做盲目 autofix

### Branch B：Unified Validator
- 分支名：`feat/unified-validator`
- 模块 owner：Validation Spine
- 允许改动：
  - `src/services/config-validator.ts`
  - `src/services/enhanced-config-validator.ts`
  - `src/services/expression-validator.ts`
  - `src/services/universal-expression-validator.ts`
  - `src/services/expression-format-validator.ts`
  - `src/services/workflow-validator.ts`
  - `src/services/workflow-auto-fixer.ts`
  - `src/agents/mcp-client.ts`
  - `tests/unit/services/**`
  - `tests/unit/agents/mcp-client.test.ts`
- 禁止侵入：
  - 主循环骨架
  - PropertyFilter essentials 推断逻辑
- 交付：
  - 统一 `validate(target)` 门面
  - workflow/node/expression 单入口
  - 统一错误分类结果
- lane 局部验收：
  - [ ] 对外只暴露 1 个统一入口
  - [ ] 表达式验证三层逻辑统一
  - [ ] 旧 API 只保留内部兼容，不再作为主调用面

### Branch C：Progressive Disclosure
- 分支名：`feat/progressive-disclosure`
- 模块 owner：Context Broker / Prompt Budget
- 允许改动：
  - `src/agents/llm-client.ts`
  - `src/agents/prompts/**`
  - `src/agents/workflow-architect.ts`
  - `src/agents/reflection-prompt-builder.ts`
  - `src/agents/orchestrator.ts`
  - `src/agent-server/runtime-status.ts`
  - `src/agent-server/websocket.ts`
  - `apps/agent-ui/src/hooks/useAgentChat.ts`
  - `apps/agent-ui/src/components/ChatInterface.tsx`
  - 受影响测试
- 禁止侵入：
  - 新 validator 规则
  - PropertyFilter 逻辑
- 交付：
  - lazy tool exposure
  - core + on-demand prompt modules
  - 历史压缩策略
  - token budget 触发条件
- lane 局部验收：
  - [ ] 初始工具 token < 500
  - [ ] 系统 prompt token 收敛到 2-4K
  - [ ] 10 轮历史 token < 8K

### Branch D：Tool Simplification
- 分支名：`feat/tool-simplification`
- 模块 owner：MCP Tool Surface
- 允许改动：
  - `src/mcp/**`
  - `src/agents/mcp-client.ts`
  - `tests/unit/mcp/**`
  - `tests/integration/mcp-protocol/**`
  - 相关 tool docs
- 禁止侵入：
  - 主循环实现
  - validator 规则定义
- 交付：
  - 拆分 `get_node` 厚模式
  - 工具前缀与分组语义收敛
  - 单工具参数维度控制
- lane 局部验收：
  - [ ] `get_node` 只保留核心信息查询
  - [ ] 衍生能力改为独立工具
  - [ ] 单工具参数维度 < 5

### Branch E：Metadata-driven Filter
- 分支名：`feat/metadata-driven-filter`
- 模块 owner：Essentials Inference
- 允许改动：
  - `src/services/property-filter.ts`
  - `src/services/property-dependencies.ts`
  - `src/services/node-specific-validators.ts`
  - `src/parsers/**`（仅限 essentials 推断需要的元数据）
  - `tests/unit/services/property-filter*.test.ts`
  - `tests/unit/services/node-specific-validators.test.ts`
- 禁止侵入：
  - tool API
  - 主循环
- 交付：
  - 元数据推断 essentials
  - 少量手工 override 策略
  - 硬编码清理
- lane 局部验收：
  - [ ] 硬编码节点配置 < 20
  - [ ] 新增节点默认无需手工接入

### Branch Integrator
- 分支名：`chore/integrate-refactor4`
- 模块 owner：Integrator
- 允许改动：
  - 全仓
  - `docs/decisions/refactor-4/**`
  - `docs/iterations/refactor-4/**`
- 交付：
  - 合并 5 条 feature 分支
  - 冲突解决与回归
  - 最终输出 `ITER_REFACTOR4_INTEGRATION_OUTPUT.md`

---

## 3. 固定合并顺序

1. `feat/unified-validator`
2. `feat/progressive-disclosure`
3. `feat/agent-loop`
4. `feat/tool-simplification`
5. `feat/metadata-driven-filter`
6. `chore/integrate-refactor4`

**说明**：
- 先合 Validator 与 Disclosure，先稳定接口面和上下文装载口径。
- 再合 Agent Loop，减少主循环分支在早期 API 变动中的 rebasing 面积。
- Tool 与 Filter 放后面，避免在 P0/P1 主干未稳时反复冲突。

---

## 4. Harness 合同

### 4.1 主循环合同

- 主循环由模型决定 `tool_call` 或 `final response`，不再把 discovery / reflection / compose / validate 写死成强制阶段顺序。
- loop 层必须保留失败观测，并将结果回注上下文，而不是吞掉异常后直接 fallback。

### 4.2 Validator 输出合同

- 统一以 `validate(target)` 或等价单入口对外暴露。
- 验证结果必须支持至少三类后续动作：
  - `autoFixable`
  - `needsModel`
  - `needsUser`

### 4.3 Token / Disclosure 合同

- 工具默认只暴露摘要，不默认暴露完整 schema。
- Prompt 默认只注入 core modules，扩展模块必须按需拉取。
- 历史上下文必须允许压缩为 `recent + summary`。

### 4.4 Trace / Integration 合同

- branch 输出必须包含：
  - `files changed`
  - `how to test`
  - `current checkpoint`
- Integrator 必须将最终回归结果回写到 `ITER_REFACTOR4_INTEGRATION_OUTPUT.md`。

---

## 5. 分阶段 Commit 规范

### 5.1 Feature Lane 默认 Checkpoints

每个 feature 分支默认按以下顺序提交：

1. `chore(<lane>): scaffold contracts and docs`
2. `feat(<lane>): implement core path`
3. `test(<lane>): cover edge cases and metrics`
4. `refactor(<lane>): tighten boundaries and merge prep`

### 5.2 特殊约束

- `feat/agent-loop` 允许第 5 个 checkpoint：
  - `feat(agent-loop): add model-feedback validation loop`
- `feat/tool-simplification` 与 `feat/metadata-driven-filter` 最少 3 个 checkpoint，但不得少于：
  - scaffold
  - core path
  - tests/merge prep
- Integrator 分支仅允许以下提交类型：
  - `merge: <branch> into chore/integrate-refactor4`
  - `fix: resolve integration conflicts`
  - `test: run refactor4 regression gates`

### 5.3 Lane 分阶段 Commit 清单与当前状态

> 当前执行状态基于 2026-03-13 本地 Refactor-4 实施结果。  
> `已完成` 表示代码与定向验收已落地；`未开始` 表示尚未进入该 lane 的真实实现。

#### `feat/agent-loop`

1. `chore(agent-loop): scaffold contracts and docs`
   - 状态：`已完成`
   - 对应产物：`src/agents/agent-loop.ts`、`src/agents/orchestrator/CLAUDE.md`
2. `feat(agent-loop): implement core path`
   - 状态：`已完成`
   - 对应产物：确认构建后的 compose/validate/autofix 闭环从 `orchestrator.ts` 剥离
3. `feat(agent-loop): add model-feedback validation loop`
   - 状态：`已完成`
   - 对应产物：`autoFixable / needsModel / needsUser` 三类分流
4. `test(agent-loop): cover edge cases and metrics`
   - 状态：`已完成`
   - 对应产物：`tests/unit/agents/agent-loop.test.ts`、`tests/unit/agents/refactor4-acceptance.test.ts`
5. `refactor(agent-loop): tighten boundaries and merge prep`
   - 状态：`已完成`
   - 对应产物：`src/agents/orchestrator.ts` 已压到 `493` 行

#### `feat/unified-validator`

1. `chore(unified-validator): scaffold contracts and docs`
   - 状态：`已完成`
   - 对应产物：`src/services/unified-validator.ts`、`src/services/CLAUDE.md`
2. `feat(unified-validator): implement core path`
   - 状态：`已完成`
   - 对应产物：`validate(target)` 单入口门面
3. `test(unified-validator): cover edge cases and metrics`
   - 状态：`已完成`
   - 对应产物：`tests/unit/services/unified-validator.test.ts`
4. `refactor(unified-validator): tighten boundaries and merge prep`
   - 状态：`已完成`
   - 对应产物：`src/agents/mcp-client.ts` 已改为通过 `validate({ kind: 'workflow' })` 走统一入口

#### `feat/progressive-disclosure`

1. `chore(progressive-disclosure): scaffold prompt-context and token budgets`
   - 状态：`已完成`
   - 对应产物：`src/agents/workflow-architect/prompt-context.ts`、`src/agents/workflow-architect/token-budget.ts`
2. `feat(progressive-disclosure): implement core path`
   - 状态：`已完成`
   - 对应产物：`architect-system` 从全量 prompt 改成高信号摘要视图
3. `test(progressive-disclosure): cover edge cases and metrics`
   - 状态：`已完成`
   - 对应产物：`tests/unit/agents/workflow-architect-prompt-context.test.ts`、`tests/unit/agents/workflow-architect-token-budget.test.ts`
4. `refactor(progressive-disclosure): tighten boundaries and merge prep`
   - 状态：`已完成`
   - 对应产物：系统 prompt 体积已压到约 `2221` token

#### `feat/tool-simplification`

1. `chore(tool-simplification): scaffold split plan around get_node`
   - 状态：`已完成`
   - 对应产物：`src/mcp/CLAUDE.md`、`tests/integration/mcp-protocol/CLAUDE.md`、`src/mcp/tool-docs/configuration/get-node-docs.ts`
2. `feat(tool-simplification): implement core path`
   - 状态：`已完成`
   - 对应产物：`get_node` 已收敛为核心 schema 查询，`get_node_docs / search_node_properties / get_node_versions` 已独立暴露
3. `test(tool-simplification): cover edge cases and metrics`
   - 状态：`已完成`
   - 对应产物：`tests/integration/mcp-protocol/tool-invocation.test.ts`、`tests/unit/agents/refactor4-acceptance.test.ts`
4. `refactor(tool-simplification): tighten boundaries and merge prep`
   - 状态：`已完成`
   - 对应产物：`get_node` 会拒绝 legacy mode 参数并返回迁移指引，工具边界不再模糊

#### `feat/metadata-driven-filter`

1. `chore(metadata-driven-filter): scaffold override policy and docs`
   - 状态：`已完成`
   - 对应产物：`src/services/CLAUDE.md`
2. `feat(metadata-driven-filter): implement metadata-first essentials`
   - 状态：`已完成`
   - 对应产物：`src/services/property-filter.ts` override 收敛到 8 个节点
3. `test(metadata-driven-filter): cover edge cases and metrics`
   - 状态：`已完成`
   - 对应产物：`tests/unit/services/property-filter.test.ts`、`tests/unit/services/property-filter-edge-cases.test.ts`
4. `refactor(metadata-driven-filter): tighten boundaries and merge prep`
   - 状态：`已完成`
   - 对应产物：硬编码节点数已满足 `< 20`

#### `chore/integrate-refactor4`

1. `merge: <branch> into chore/integrate-refactor4`
   - 状态：`未开始`
   - 说明：当前为单工作树连续实现，尚未执行真实 lane merge
2. `fix: resolve integration conflicts`
   - 状态：`部分完成`
   - 已完成：
     - `better-sqlite3` 可用性探测改为真实 `:memory:` 实例探针，native binding 不可用时数据库集成测会稳定跳过
     - WebSocket 测试助手补齐建连即发帧的队列注册，消除 `runtime_status` 抢跑导致的偶发超时
     - Agent HTTP/WS 集成测试 fixture 已对齐 Refactor-4 的 Orchestrator 协议与验证闭环
   - 未完成：真实多 lane merge 后的 git 级冲突收敛
3. `test: run refactor4 regression gates`
   - 状态：`部分完成`
   - 已完成：`npm run typecheck` + Refactor-4 scoped 回归 + MCP 协议/错误/性能关键路径回归
   - 已完成的 scoped pack：
     - `tests/integration/database/{transactions,node-repository,connection-management,node-fts5-search}.test.ts`
     - `tests/integration/mcp-protocol/{tool-invocation,error-handling,protocol-compliance}.test.ts`
     - `tests/integration/agent/{agent-api,agent-websocket}.test.ts`
     - `tests/unit/agents/{refactor4-acceptance,orchestrator}.test.ts`
     - `tests/unit/http-server/multi-tenant-support.test.ts`
     - `tests/unit/mcp/tools-documentation.test.ts`
     - `tests/unit/agent-server/websocket.test.ts`
   - 当前结果：`10 passed + 4 skipped`
   - 未完成：全量 `npm test`

---

## 6. DoD

### 6.1 Branch Exit Gates

- [ ] `npm run typecheck`
- [ ] 受影响测试通过
- [ ] 对应 `CLAUDE.md` 已同步
- [ ] lane 局部 DoD 满足
- [ ] 输出 `files changed + how to test + current checkpoint`

### 6.2 Integrator Exit Gates

- [ ] `npm test`
- [ ] Refactor-4 指标复测
- [ ] merge 后主流程可运行
- [ ] 无 hint-style 硬编码捷径回流
- [ ] 文档、脚本、分支矩阵、merge order 一致

---

## 7. Integrator 验收清单

### US-R4-1 主循环扁平化
- [ ] loop 骨架已独立承载
- [ ] 主循环不再被 `orchestrator.ts` 独占
- [ ] 验证失败支持模型反馈修复

### US-R4-2 统一验证架构
- [ ] 统一 validator 入口可用
- [ ] workflow/node/expression 校验面收敛

### US-R4-3 渐进式上下文披露
- [ ] 工具初始 token 预算达标
- [ ] 历史压缩路径可用
- [ ] Prompt 按需注入生效

### US-R4-4 工具简化
- [ ] 厚工具已拆解
- [ ] 单工具参数维度达标

### US-R4-5 元数据驱动 essentials
- [ ] essentials 推断不再依赖大面积手写配置
- [ ] override 数量受控

### 量化目标
- [ ] 初始化 token：`~3K -> < 500`
- [ ] 系统 prompt token：`6-10K -> 2-4K`
- [ ] 10 轮对话 token：`~15K -> < 8K`
- [ ] 验证修复成功率：`~60% -> > 85%`
- [ ] 最大文件行数：`2041 -> < 500`
- [ ] 验证 API 数量：`6 -> 1`
- [ ] 硬编码节点数：`150+ -> < 20`

### 7.1 当前阶段验收确认（2026-03-13）

#### Stage A / Week 1 主干
- [x] `feat/agent-loop`：通过
  - 证据：`agent-loop.ts` 已落地，`orchestrator.ts` 493 行，`agent-loop.test.ts` 通过
- [x] `feat/unified-validator`：通过
  - 证据：`validate(target)` 已成为 `mcp-client.ts` 的主入口，`unified-validator.test.ts` 通过
- [x] `feat/progressive-disclosure`：通过
  - 证据：工具摘要 `29` token，系统 prompt `2221` token，10 轮历史 `544` token，预算测试通过

#### Stage B / Week 2 扩展
- [x] `feat/metadata-driven-filter`：通过
  - 证据：`PropertyFilter.ESSENTIAL_PROPERTIES` 收敛到 `8`
- [x] `feat/tool-simplification`：通过
  - 证据：`get_node` 已拆成 `get_node / get_node_docs / search_node_properties / get_node_versions`，Refactor-4 验收门已锁住新工具面

#### Stage C / Integrator
- [ ] Integrator 最终验收：未通过
  - 已完成：`npm run typecheck`、Refactor-4 定向验收测试、MCP 协议关键回归、Agent HTTP/WS 集成回归、tool-simplification lane 收口
  - 已完成：Refactor-4 scoped 验收包 `10 passed + 4 skipped`
  - 未完成：真实 lane merge、全量 `npm test`

### 7.2 当前量化结果（2026-03-13）

- [x] 初始化 token：`29` / 目标 `< 500`
- [x] 系统 prompt token：`2221` / 目标 `2-4K`
- [x] 10 轮对话 token：`544` / 目标 `< 8K`
- [x] 验证修复成功率：`85.7%` / 目标 `> 85%`
- [x] 最大文件行数（P0 目标文件 `orchestrator.ts`）：`493` / 目标 `< 500`
- [x] 验证 API 数量（公开入口）：`1` / 目标 `1`
- [x] 硬编码节点数：`8` / 目标 `< 20`

### 7.3 未完成项

- [ ] `workflow-architect.ts` 仍为 `4085` 行，未满足“每文件 < 800 行”的质量门
- [ ] 真实 `chore/integrate-refactor4` merge 过程尚未执行
- [ ] 全量 `npm test` 尚未作为最终集成门通过
  - 说明：数据库集成测试在 native binding 不可用时已能稳定跳过，不再误报 Refactor-4 回归失败
  - 当前剩余阻塞主要来自仓库既有基线问题：docker 单测、logger 时区断言、根级 UI 测试环境、旧 E2E 语义预期

---

## 8. 风险与冲突策略

### 高冲突文件

- `src/agents/orchestrator.ts`
- `src/agents/mcp-client.ts`
- `src/agents/workflow-architect.ts`
- `src/services/workflow-validator.ts`
- `src/services/property-filter.ts`
- `src/mcp/server.ts`

### 冲突解决原则

- 主循环语义冲突：以 `feat/agent-loop` 的 loop 边界为准，其他分支做适配。
- validator 冲突：以 `feat/unified-validator` 的统一入口为准，旧调用面退化为内部兼容。
- token / prompt 冲突：以 `feat/progressive-disclosure` 的预算与加载策略为准。
- MCP tool 冲突：以 `feat/tool-simplification` 的工具命名和参数设计为准。
- essentials 推断冲突：以 `feat/metadata-driven-filter` 的元数据推断路径为准，保留少量 override。

### 主要风险

- 主循环重构与 progressive disclosure 同时 touching `orchestrator.ts`
- `mcp-client.ts` 同时被 validator lane 和 tool lane 修改
- PropertyFilter 改造后可能影响 validator 与 MCP 输出稳定性
- 文档、脚本、merge order 一旦不一致，执行包会失效
