# services/
> L2 | 父级: ../CLAUDE.md

成员清单
config-validator.ts: 基础节点配置校验器，处理通用参数与安全约束。
enhanced-config-validator.ts: 增强配置校验器，补强复杂类型结构与 AI 友好校验。
example-generator.ts: 节点示例配置生成器。
expression-format-validator.ts: 表达式格式校验器，处理 `=` 前缀和 resource locator 格式。
expression-validator.ts: 表达式语义校验器，检查变量引用、节点引用与常见错误。
n8n-api-client.ts: n8n REST API 客户端。
n8n-validation.ts: n8n 兼容性与基础工作流校验入口。
n8n-version.ts: n8n 版本检测与比较工具。
node-specific-validators.ts: 节点专用校验规则集合。
property-dependencies.ts: 属性依赖图与动态显示规则。
property-filter.ts: 节点属性 essentials 裁剪器。
task-templates.ts: 任务模板与推荐配置集合。
type-structure-service.ts: 复杂配置类型结构验证器。
unified-validator.ts: Refactor-4 统一验证门面，提供 `validate(target)` 单入口与校验结果分流。
universal-expression-validator.ts: 表达式通用规则校验器，覆盖括号、前缀与通用模式。
workflow-auto-fixer.ts: 工作流自动修复器，产出 diff 级修复建议。
workflow-diff-engine.ts: 工作流 diff 应用引擎。
workflow-validator.ts: 完整工作流结构、连接、表达式与模式校验器。

架构决策
- `services/` 负责“规则与校验”本身，不负责会话编排。
- Refactor-4 起，外部入口应优先走 `unified-validator.ts`，具体 validator 退回内部实现层。
- `workflow-validator.ts` 必须保留底层 validator 返回的 `fix/details/code` 元数据，避免 unified-validator 与 autofix 链路丢失可修复语义。
- `workflow-auto-fixer.ts` 对 `n8n-nodes-base.code` 的自动修复必须复用共享模板，禁止再次手写空 code 节点例外分支。

开发规范
- 新增 validator 时，先判断它是否应该并入 `unified-validator.ts` 的统一契约，再决定是否暴露。
- 涉及表达式校验的改动，要同步评估 `expression-validator.ts`、`universal-expression-validator.ts` 与 `expression-format-validator.ts` 的职责边界。

变更日志
- 2026-03-13: 建立 services 模块地图，并新增 unified-validator.ts 作为 Refactor-4 统一验证入口。
- 2026-03-13: workflow-validator.ts 开始保留 fix 元数据；workflow-auto-fixer.ts 新增 code-node-template 自动修复，闭合 code 节点空模板校验失败。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
