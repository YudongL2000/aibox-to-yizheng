# agent-server/ - Agent 服务层
> L2 | 父级: ../CLAUDE.md

目录结构
agent-server/
├── agent-factory.ts - Agent 依赖组装工厂
├── agent-service.ts - 业务服务编排（配置主链、dialogue-mode 真相源桥接、会话 trace 与配置/对话态 digital twin scene 附着）
├── index.ts - CLI 启动入口
├── runtime-status.ts - LLM completion 运行状态探测、探测超时阈值与缓存中心
├── server.ts - HTTP API 路由与上传服务，同时暴露 config-state / dialogue-mode 的 digital twin scene 快照、hardware status / command 与 dialogue 路由
└── websocket.ts - WebSocket 通道，负责 runtime_status、hardware_status、hardware_command 与 agent_trace 流式推送

架构决策
- HTTP/WS 共享 AgentService，确保会话与配置流程一致。
- 上传目录统一使用 data/uploads，日志使用 data/logs。
- LLM 运行状态由 runtime-status.ts 单独维护，HTTP 负责查询，WebSocket 负责主动推送，前端只消费这一份诊断真相源。
- 运行时健康探测必须命中真实 `chat/completions` 链路，而不是只测 `/models` 可达；否则“探针健康”与“真实请求超时”会长期打架。
- 健康探测超时与生成超时分离配置，避免为了放宽一次探测把整条生成链路都拖慢。
- AgentService 统一暴露会话 trace，WebSocket 直接流式转发，避免前端调试流和后端日志各自维护过程状态。
- `workflow_ready` 返回时，完整工作流 JSON 必须由 AgentService 单独写入日志，避免只剩 messagePreview 无法回放真实生成结果。
- 配置阶段和 dialogue-mode 阶段的 scene 必须由 AgentService/HTTP 路由统一附带，renderer 只能消费这份 backend scene，不能再本地拼装硬件挂载状态。
- `interactionMode=dialogue` 的聊天请求必须走 dialogue-mode 真相源，HTTP/WS 只负责透传，不得再用旧的 workflow/config 路由假扮对话逻辑。
- `validate-hardware` 与 `start-deploy` 是 dialogue-mode 的显式路由，返回的 `dialogueMode` envelope + `digitalTwinScene` 是唯一业务输出，前端不应再从普通 guidance 响应里反推插拔状态。
- `hardware/status` 的 payload 不是裸状态摘要，而是 canonical runtime envelope：必须把 heartbeat、5 口界面、builtin top controls 与 scene 一起暴露给前端。
- agent-factory.ts 必须把共享 LLMClient 注入 dialogue-mode 语义路由器；否则对话模式会退化回正则分流，重新把大量任务误送给 MimicLaw。
- MQTT hardware runtime 现在是硬件真相源：AgentService 负责把 runtime snapshot 投影给 dialogue-mode 与 digital twin scene，server / websocket 只暴露 status、workflow upload/stop 与 hardware command 协议。

开发规范
- 新增/删除/移动文件必须同步本文件。

变更日志
- 2026-01-28: 增加硬件配置接口与 WebSocket 事件，补齐配置流程入口。
- 2026-03-06: 新增 runtime-status.ts，并暴露运行时诊断接口，区分链路在线与 LLM 可用性。
- 2026-03-06: websocket.ts 增加 runtime_status 帧与显式刷新消息，移除前端定时轮询依赖。
- 2026-03-06: runtime-status.ts 接入 AGENT_LLM_HEALTH_TIMEOUT_MS，让探测阈值可独立调节。
- 2026-03-06: websocket.ts 新增 agent_trace 流式帧，agent-service.ts 暴露 trace 订阅能力，打通后端调试日志到前端过程面板。
- 2026-03-07: runtime-status.ts 改为真实 completion 探测，agent-factory.ts 同步暴露 discovery/reflection timeout，避免“健康探针正常但业务请求总超时”的假象。
- 2026-03-13: agent-service.ts 在 `workflow_ready` 时追加完整工作流 JSON 日志，便于从 data/logs 直接复盘生成结果。
- 2026-03-14: agent-factory.ts 开始把 agent-config 中的 scene safety net flags 注入 WorkflowArchitect，允许通过环境变量切换场景后处理护栏。
- 2026-04-01: agent-service.ts 与 server.ts 开始把 configuring 阶段的 digitalTwinScene 一并暴露给客户端，确保 mock 插拔和配置进度共享同一份场景真相源。
- 2026-04-01: agent-service.ts 与 server.ts 新增 dialogue-mode 聊天、硬件校验与 start-deploy 路由，并把对话模式的技能/硬件/教学接力与 scene 一起收敛为 backend 真相源。
- 2026-04-01: confirm-node 的 HTTP/WS 路由开始透传 `portId`，配置阶段不再只靠 `topology` 猜接口；mock 热插拔选口后可直接刷新数字孪生挂载位。
- 2026-04-01: agent-factory.ts 开始给 dialogue-mode 注入独立语义路由器，OpenClaw 对话输入先经 backend LLM 判定是否属于 MimicLaw 闲聊还是技能分支 A/B/C。
- 2026-04-05: server.ts 与 websocket.ts 新增 hardware status / workflow upload-stop / hardware command 协议，AgentService 开始消费 mqtt-hardware-runtime.ts 作为硬件运行时真相源。
- 2026-04-05: hardware/status 开始直接携带 canonical digitalTwinScene，mic / speaker 作为 builtin top controls，不再被当成外部挂载模型。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
