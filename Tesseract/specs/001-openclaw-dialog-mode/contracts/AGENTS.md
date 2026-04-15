# contracts/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/001-openclaw-dialog-mode/AGENTS.md

成员清单
dialog-mode-agent-contract.md: 对话模式与 backend Agent 之间的请求/响应契约，定义 session、branch、phase、动作按钮与教学接力载荷。
hardware-bridge-events.md: 本地硬件桥接层的标准事件模型，统一 MiniClaw WebSocket 与 MQTT 设备插拔事件。

法则
- `contracts/` 只描述跨边界的稳定消息形状，不掺杂组件内部实现细节。
- 所有前端行为结论都必须能在这里找到对应字段来源，避免 UI 私自脑补业务状态。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
