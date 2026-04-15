# config/ - backend 配置解析层
> L2 | 父级: ../../AGENTS.md

成员清单
n8n-api.ts: backend 的 n8n API 凭据真相源，负责合并 `.env` 与 `aily-blockly/.tesseract-runtime/n8n/api-access.json`。

法则
- embedded n8n 共享凭据优先来自 `aily-blockly/.tesseract-runtime/n8n/api-access.json`；backend 不得自己发明第二份 agent API key。
- 比较 `.env` 的 `N8N_API_URL` 与共享凭据 `baseUrl` 时，`localhost`、`127.0.0.1` 与 loopback IPv6 必须视为同一嵌入实例；否则会错误回退到陈旧 key 并把 `401 unauthorized` 透传到 workflow create。

变更日志
- 2026-04-12: 新建目录地图，记录 embedded n8n 共享凭据优先级与 localhost/127.0.0.1 归一化约束。
- 2026-04-12: n8n-api.ts 为 embedded 共享凭据合并补上空值安全收窄，避免 ts-node 启动期被 `embeddedApiAccess is possibly null` 卡死。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
