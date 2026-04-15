# services/
> L2 | 父级: ../../CLAUDE.md

成员清单
config-validator-basic.test.ts: 基础配置校验最小路径测试。
config-validator-cnd.test.ts: 条件节点配置校验测试。
config-validator-edge-cases.test.ts: 配置校验边界场景测试。
config-validator-node-specific.test.ts: 节点专用配置校验测试。
config-validator-security.test.ts: 配置校验安全护栏测试。
debug-validator.test.ts: 历史 validator 调试与回归测试。
enhanced-config-validator-type-structures.test.ts: 增强校验器复杂类型结构测试。
enhanced-config-validator.test.ts: 增强配置校验器核心行为测试。
example-generator.test.ts: 示例配置生成测试。
expression-format-validator.test.ts: 表达式格式校验测试。
expression-validator-edge-cases.test.ts: 表达式语义校验边界测试。
expression-validator.test.ts: 表达式语义校验核心测试。
fixed-collection-validation.test.ts: 固定集合校验测试。
loop-output-edge-cases.test.ts: 循环输出边界校验测试。
n8n-api-client.test.ts: n8n API 客户端测试。
n8n-validation-sticky-notes.test.ts: sticky note 与非执行节点校验测试。
n8n-validation.test.ts: n8n 基础校验测试。
n8n-version.test.ts: n8n 版本工具测试。
node-specific-validators.test.ts: 节点专用规则测试。
property-dependencies.test.ts: 属性依赖图测试。
property-filter-edge-cases.test.ts: 属性裁剪边界测试。
property-filter.test.ts: 属性裁剪核心测试。
task-templates.test.ts: 任务模板测试。
type-structure-service.test.ts: 类型结构服务测试。
unified-validator.test.ts: Refactor-4 统一验证门面测试，覆盖 workflow/expression 统一入口与分流。
universal-expression-validator.test.ts: 表达式通用规则测试。
validation-fixes.test.ts: 校验修复链路测试。
workflow-auto-fixer.test.ts: 工作流自动修复器测试。
workflow-diff-engine.test.ts: 工作流 diff 引擎测试。
workflow-diff-node-rename.test.ts: 节点重命名 diff 测试。
workflow-fixed-collection-validation.test.ts: 工作流固定集合校验测试。
workflow-validator-comprehensive.test.ts: 工作流校验综合测试。
workflow-validator-edge-cases.test.ts: 工作流校验边界测试。
workflow-validator-error-outputs.test.ts: 错误输出分支校验测试。
workflow-validator-expression-format.test.ts: 工作流表达式格式校验测试。
workflow-validator-loops-simple.test.ts: 简单循环工作流校验测试。
workflow-validator-loops.test.ts: 循环工作流校验测试。
workflow-validator-mocks.test.ts: 工作流校验 mock 驱动测试。
workflow-validator-performance.test.ts: 工作流校验性能测试。
workflow-validator-with-mocks.test.ts: 工作流校验 mock 集成测试。
workflow-validator.test.ts: 工作流校验核心测试。

架构决策
- `tests/unit/services/` 以 validator / filter / workflow 工具为单位做细粒度守护。
- Refactor-4 起，`unified-validator.test.ts` 负责锁住统一验证入口，避免多入口再次分叉。

开发规范
- 新增 service 测试时同步本文件。
- 如果某个 validator 被 unified facade 吸收，必须同时补 facade 测试与底层实现测试。

变更日志
- 2026-03-13: 建立 unit/services 模块地图，并新增 unified-validator.test.ts 的收口约束。
- 2026-03-13: 新增 code 节点模板回归，锁住 workflow-validator fix 元数据透传、unified-validator autoFixable 分流与 workflow-auto-fixer 的 code-node-template 修复。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
