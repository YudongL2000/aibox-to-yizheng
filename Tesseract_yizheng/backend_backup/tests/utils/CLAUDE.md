# utils/
> L2 | 父级: ../../CLAUDE.md

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

成员清单
README.md: 历史测试工具说明，保留背景信息与使用示例。
assertions.ts: 封装常用断言逻辑，降低测试样板代码。
database-utils.ts: 提供数据库测试辅助函数。
data-generators.ts: 生成随机化测试数据与样本对象。
test-helpers.ts: 提供跨层复用的通用测试助手，含异步等待、HTTP JSON、支持多帧缓存的 WebSocket 等工具。
builders/workflow.builder.ts: 构建工作流测试数据的 builder。

架构决策
网络层测试助手统一收口到 test-helpers.ts，避免 e2e 与 integration 目录复制 postJson/getJson/canListen/waitForMessage。
WebSocket 测试助手必须缓存多帧消息，适配 runtime_status 与 agent_trace 并存的流式协议，不能再假设“一次请求只有一帧响应”。

变更日志
2026-03-06: 新增网络测试助手导出，并为 tests/utils 建立 L2 地图。
2026-03-06: test-helpers.ts 的 WebSocket 等待器升级为多帧队列，适配 agent_trace 流式调试协议。
