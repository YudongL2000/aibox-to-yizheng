# tests/integration/
> L2 | 父级: ../../CLAUDE.md

成员清单
agents/: Ground truth 与 Agent 结构评测测试，验证 scene 基准对比器与多场景评分逻辑。
agent/: Agent HTTP/WebSocket 集成测试，覆盖服务接口、配置流转与 dialogue-mode 路由。
ai-validation/: AI 校验链路集成测试，验证代理与工具在真实节点约束下的表现。
database/: 数据库与事务集成测试，校验 repository/adapter 协作。
docker/: Docker 启动与入口脚本集成测试。
mcp-protocol/: MCP 协议兼容性与工具调用集成测试。
n8n-api/: 面向真实 n8n API 的集成测试与辅助工具。
orchestrator-e2e.test.ts: Refactor-3 端到端验收测试，覆盖石头剪刀布、人脸欢迎与自由描述场景。
setup/: 集成测试初始化与 MSW 服务。

法则: 成员完整·一行一文件·父级链接·技术词前置

变更日志
- 2026-03-13: orchestrator-e2e.test.ts 的 LLM mock 对齐当前 discovery/reflection 协议，并新增 WHEEL 命名断言，避免旧预期把新链路误报为回归。
- 2026-03-14: agents/safety-net-matrix.test.ts 新增 Refactor-5 SafetyNet 对照矩阵，开始按 gesture/emo/game 场景逐个验证关键 safety net 的必要性。
- 2026-04-01: agent/api 集成测试开始覆盖 `interactionMode=dialogue`、`validate-hardware` 与 `start-deploy` 路由。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
