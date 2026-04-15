# hardware_bridge/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/lib/server/AGENTS.md

成员清单
AGENTS.md: 硬件桥目录地图，约束 MiniClaw 与 MQTT 的统一接入边界。
hardware_bridge_config.dart: 硬件桥环境与默认路由配置。
hardware_bridge_models.dart: 硬件桥事件、组件、状态与 source 接口模型。
hardware_bridge_service.dart: 硬件桥统一 facade，负责源优先级、事件转发、状态归并与 dialogue physical cue 分发。
miniclaw_ws_bridge.dart: MiniClaw WebSocket 条件导出门面，按平台切到 web/stub 实现。
miniclaw_ws_bridge_stub.dart: MiniClaw WebSocket 的 VM/测试空实现。
miniclaw_ws_bridge_web.dart: MiniClaw/Mimiclaw 的浏览器 WebSocket 适配器。
mqtt_hardware_bridge.dart: MQTT 硬件桥条件导出门面，按平台切到 web/stub 实现。
mqtt_hardware_bridge_stub.dart: MQTT 硬件桥的 VM/测试空实现。
mqtt_hardware_bridge_web.dart: 现有 MQTT 设备事件桥适配器。

法则
- 这里只做桥接与归一化，不做业务判断。
- MiniClaw WebSocket 与 MQTT 必须先归一到同一种事件模型，再交给对话模式协议层。
- 任何可运行在测试 VM 的代码都不得直接依赖 `dart:html`。
- 物理动作分发也只属于 transport 层；“什么时候该挥手/苏醒”必须由 backend `dialogueMode.physicalCue` 决定。
- `toValidationJson()` 必须把全量 `connectedComponents + portId` 发给 backend，不能把 snapshot 压扁成单组件事件。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
