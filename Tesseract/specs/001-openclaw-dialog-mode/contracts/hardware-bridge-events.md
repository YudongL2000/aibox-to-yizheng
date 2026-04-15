# Contract: Local Hardware Bridge Events

## Goal

把本地硬件插拔事件先标准化成统一模型，再交给对话模式状态机与 backend 校验链消费。这样 MiniClaw WebSocket 与 MQTT 只在桥接层有分支，业务层保持单一路径。

## Supported sources

- `miniclaw_ws`: 本地 MiniClaw / Mimiclaw WebSocket，例如 `ws://192.168.1.150:18789/`
- `mqtt_proxy`: 现有 `device/usb/event` MQTT over WebSocket 代理

## Normalized event

```json
{
  "source": "miniclaw_ws",
  "eventType": "device_inserted",
  "timestamp": "2026-04-01T10:30:00.000Z",
  "component": {
    "componentId": "mechanical_hand",
    "deviceId": "hand-001",
    "modelId": "claw-v1",
    "displayName": "机械手",
    "portId": "port_2",
    "status": "connected"
  },
  "raw": {
    "type": "response",
    "content": "hardware attached"
  }
}
```

## Event fields

| Field | Type | Description |
|---|---|---|
| source | enum(`miniclaw_ws`, `mqtt_proxy`) | 事件来源 |
| eventType | enum(`device_inserted`, `device_removed`, `device_ready`, `device_error`, `heartbeat`, `snapshot`) | 标准事件类型 |
| timestamp | string | ISO 时间戳 |
| component | object/null | 标准化后的组件信息 |
| raw | object | 原始消息，便于调试与回放 |

## Mapping rules

### MiniClaw WebSocket

- 建立连接后，任何能明确表达“设备已插入/已识别/已拔出/错误”的消息都必须映射成标准事件。
- 对无法识别的消息，只保留在 `raw` 中，不直接驱动业务状态。
- 一旦收到 `device_inserted`，前端立即进入 `validating_insert` loading 态，并把标准事件送给 backend 校验。

### MQTT `device/usb/event`

- 保持沿用现有 `DeviceEventPayload` 解析。
- 只要能提取 `componentId/deviceId/portId/status`，就映射为标准事件。
- 如果 payload 是全量快照，则输出 `eventType=snapshot`。

## Consumer rules

- UI loading 可以由桥接层即时触发。
- “已准备好”“缺了什么”“可以开始部署”只能由 backend 校验后的 `dialogueMode` envelope 决定。
- 如果在 `ready_to_deploy` 或 `interacting` 阶段收到 `device_removed`，前端必须撤销部署态并请求 backend 重算。
