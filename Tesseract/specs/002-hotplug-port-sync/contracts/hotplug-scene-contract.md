# Contract: Hotplug Snapshot -> Digital Twin Scene

## Goal

让 mock 插拔事件在进入 backend 后，能够稳定保留 `connectedComponents + portId`，并被投影成前端可直接消费的 `digitalTwinScene`。

## Normalized event

```json
{
  "source": "miniclaw_ws",
  "eventType": "snapshot",
  "timestamp": "2026-04-01T10:30:00.000Z",
  "component": {
    "componentId": "mechanical_hand",
    "deviceId": "hand-001",
    "modelId": "claw-v1",
    "displayName": "机械手",
    "portId": "port_2",
    "status": "connected"
  },
  "connectedComponents": [
    {
      "componentId": "mechanical_hand",
      "deviceId": "hand-001",
      "modelId": "claw-v1",
      "displayName": "机械手",
      "portId": "port_2",
      "status": "connected"
    },
    {
      "componentId": "camera",
      "deviceId": "cam-001",
      "modelId": "cam-001",
      "displayName": "摄像头",
      "portId": "port_7",
      "status": "connected"
    }
  ]
}
```

## Rules

- `snapshot` 事件必须优先使用 `connectedComponents`
- `device_inserted` / `device_removed` 可以只带单个 `component`
- 所有组件都必须带 `portId`
- backend 只允许在归一化阶段做一次 `portId` 兼容，不允许后续层级继续猜
- `digitalTwinScene.models[]` 中每个非底座模型都必须带 `interface_id`

## Consumer contract

- backend 用规范化后的硬件快照生成 `digitalTwinScene`
- `aily-blockly` 只转发 backend scene 给数字孪生窗口
- 数字孪生页面只消费 `digitalTwinScene`，不重新推断端口挂载
