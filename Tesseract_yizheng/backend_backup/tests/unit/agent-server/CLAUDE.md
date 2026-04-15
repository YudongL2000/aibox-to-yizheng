# tests/unit/agent-server/
> L2 | 父级: ../../CLAUDE.md

成员清单
agent-service.test.ts: AgentService 单元测试，验证会话路由、dialogue-mode 分支、确认、重置与完整工作流日志输出。
dialogue-mode-contract.test.ts: 对话模式 contract 测试，锁住 dialogue-mode 响应必须附带 backend-first digital twin scene。
http-server.test.ts: HTTP server 单元测试，覆盖路由与协议层行为，包含 dialogue-mode 显式路由。
runtime-status.test.ts: 运行时诊断监控器测试，覆盖 LLM 状态缓存、禁用与静态注入。
websocket.test.ts: WebSocket server 单元测试，覆盖消息编排与错误响应。

法则: 成员完整·一行一文件·父级链接·技术词前置

变更日志
- 2026-03-13: agent-service.test.ts 新增 `workflow_ready` 完整 JSON 日志断言，防止日志再次退回只打摘要。
- 2026-04-01: agent-service.test.ts 与 http-server.test.ts 开始覆盖 dialogue-mode 真相源、validate-hardware 与 start-deploy 路由。
- 2026-04-01: 新增 dialogue-mode-contract.test.ts，锁住 dialogue-mode 响应自带 digitalTwinScene 的后端契约。
- 2026-04-05: http-server.test.ts 与 websocket.test.ts 开始覆盖 hardware status、workflow upload/stop 与 hardware command 路由，锁住 MQTT runtime 门面。
- 2026-04-05: 新增对 canonical digitalTwinScene 的断言，确保 hardware status 直接携带 5 口接口与 builtin top controls。
- 2026-04-05: dialogue-mode-contract.test.ts 开始验证 dialogue-mode 场景优先使用 MQTT runtime snapshot，而不是 session 内旧热插拔快照。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
