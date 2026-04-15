# mcp-protocol/
> L2 | 父级: ../CLAUDE.md

成员清单
error-handling.test.ts: MCP 工具错误、参数校验与恢复语义测试。
performance.test.ts: MCP 工具性能、并发与响应体积测试。
protocol-compliance.test.ts: MCP JSON-RPC 协议兼容性测试。
session-management.test.ts: MCP 会话隔离与并发访问测试。
test-helpers.ts: MCP 测试服务包装与客户端辅助函数。
tool-invocation.test.ts: MCP 核心工具调用路径测试，覆盖搜索、节点信息与校验接口。

架构决策
- `mcp-protocol/` 只验证协议面与工具行为，不承担业务编排断言。
- Refactor-4 起，这里需要显式覆盖 `get_node` 拆分后的新工具面，防止工具职责再次回流到 `mode` 参数。

开发规范
- 新增或删除 MCP 工具时，优先更新 `tool-invocation.test.ts` 与 `protocol-compliance.test.ts`。
- 工具拆分时要同时覆盖正向路径、错误路径与并发路径。

变更日志
- 2026-03-13: 建立 mcp-protocol 模块地图，纳入 Refactor-4 的工具拆分验收边界。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
