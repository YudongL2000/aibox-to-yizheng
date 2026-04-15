# mcp/
> L2 | 父级: ../CLAUDE.md

成员清单
handlers-n8n-manager.ts: n8n API 管理工具处理器，负责工作流创建、更新、执行与诊断。
handlers-workflow-diff.ts: 工作流 diff 级补丁应用与比较逻辑。
index.ts: MCP 模块导出入口。
server.ts: MCP 服务主实现，负责工具注册、参数校验与请求分发。
stdio-wrapper.ts: MCP stdio 启动包装器。
tool-docs/: 工具文档仓库，按发现/配置/校验/管理分类提供可读说明。
tools-documentation.ts: MCP 工具文档聚合器，输出 overview/search/full docs。
tools-n8n-friendly.ts: 面向 n8n AI Agent 的工具描述瘦身层。
tools-n8n-manager.ts: n8n 管理工具定义集合。
tools.ts: 核心 MCP 工具定义集合，Refactor-4 下收敛为单职责工具面。
workflow-examples.ts: 工作流示例库。

架构决策
- `server.ts` 负责协议分发与返回格式，`tools.ts` 负责声明式工具面，两者保持一一对应。
- Refactor-4 起，节点配置相关能力按 `get_node / get_node_docs / search_node_properties / get_node_versions` 拆分，避免 `get_node` 继续背多种 mode。

开发规范
- 新增 MCP 工具时，必须同时更新 `tools.ts`、`server.ts`、`tool-docs/` 与集成测试。
- 工具命名优先单职责语义，不再通过一个工具里的 `mode` 参数伪装多工具。

变更日志
- 2026-03-13: 建立 mcp 模块地图，并记录 Refactor-4 的节点工具拆分方向。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
