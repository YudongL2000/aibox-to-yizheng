# mcp/
> L2 | 父级: ../CLAUDE.md

成员清单
multi-tenant-tool-listing.test.ts.disabled: 多租户工具暴露测试草稿，当前禁用。
tools-documentation.test.ts: MCP 工具文档渲染、搜索与分类测试。

架构决策
- `tests/unit/mcp/` 只验证工具文档与工具清单等纯函数逻辑。
- Refactor-4 起，节点工具拆分的文档正确性在这里锁住，不把这类断言塞进协议集成测试。

开发规范
- 工具文档名称、分类或 related tools 变更时，同步更新这里的断言。

变更日志
- 2026-03-13: 建立 mcp 单元测试模块地图，承接 Refactor-4 工具面拆分的文档护栏。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
