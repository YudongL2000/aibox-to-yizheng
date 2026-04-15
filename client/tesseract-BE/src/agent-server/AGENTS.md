# agent-server/
> L2 | 父级: ../CLAUDE.md

成员清单
agent-factory.ts: backend Agent 运行时装配入口，负责把 LLM、session、dialogue router 与 skills 库注入同一服务栈。
agent-service.ts: HTTP/WS 共享业务编排器，统一 chat、config、dialogue-mode、digital twin scene、MQTT hardware runtime 与 skill save candidate 真相源。
index.ts: agent-server 进程入口，负责启动 HTTP 服务与运行时生命周期。
runtime-status.ts: 运行时健康探针与状态快照，折叠 LLM/n8n 等依赖诊断结果。
server.ts: Express HTTP API 入口，暴露 chat/confirm/workflow/dialogue/skills/hardware/status 路由。
websocket.ts: WebSocket 入口，桥接 session trace、dialogue-mode 事件、hardware status/command 与实时客户端。

法则
- `AgentService` 是 workflow/config/dialogue/skills 的统一门面；HTTP 与 WS 不得各自复制业务编排。
- `server.ts` 只暴露协议，不保存业务状态；skills 库与 scene 计算必须继续回到 service 层。
- 新增路由若改变客户端真相源，必须同步更新测试与上层文档，避免 transport 漂移。
- 配置阶段 digital twin 的唯一真相源是 backend `config-state` 投影结果；`confirm-node` 的短响应只可作为过渡反馈，不能凌驾于 read-after-write scene 之上。
- MQTT hardware runtime 的唯一真相源是 `mqtt-hardware-runtime.ts`；HTTP/WS 只能读写这份 store，不得在 server 或 websocket 层重建心跳解析与 command 编码。
- `getHardwareRuntimeStatus()` 需要直接携带 runtime snapshot 对应的 `digitalTwinScene`，让 heartbeat 可原样驱动数字孪生，而不是让调用方再二次拼 scene。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
