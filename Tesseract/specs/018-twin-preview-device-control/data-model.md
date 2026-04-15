# Data Model: 018-twin-preview-device-control

## Entities

### MqttHeartbeatDevice (已有, backend 侧)
来自 `status_response.devices[]`，后端 `mqtt-hardware-runtime.ts` 已解析。

| Field | Type | Description |
|-------|------|-------------|
| device_type | string | "camera" / "audio" / "speaker" / "hand" |
| device_status | string | "connected" / "disconnected" / "activing" |
| device_name | string | 设备显示名称 |
| device_path | string | 设备路径或 streamUrl |
| device_port | string? | 串口端口号 |
| vid_pid | string? | USB VID/PID |

### PreviewSessionPayload (新增, iframe→Flutter postMessage)
iframe.component 构造并发送给 Flutter 的预览状态消息。

| Field | Type | Description |
|-------|------|-------------|
| type | "tesseract-digital-twin-preview-state" | 消息类型标识 |
| session.sessionId | string | "mic-preview" / "speaker-preview" / "camera-preview" |
| session.kind | "microphone" / "speaker" / "camera" | 设备类别 |
| session.label | string | "内置麦克风" / "内置扬声器" / "Camera P2P" |
| session.active | boolean | 当前是否活跃 |
| session.streamUrl | string? | 仅 camera: WebRTC 流地址 |
| session.amplitude | number | 波形振幅 0.0-1.0 |
| session.runtimeState | object | 自定义元数据 |
| control.id | string | "builtin-mic" / "builtin-speaker" |
| control.kind | "microphone" / "speaker" | 控制类别 |
| control.active | boolean | 按钮激活态 |
| control.enabled | boolean | 按钮可用性 |
| control.level | number | 音量级别 0.0-1.0 |

### DeviceControlAction (新增, Flutter→iframe postMessage)
Flutter 顶栏按钮点击后发送给 iframe 的控制指令。

| Field | Type | Description |
|-------|------|-------------|
| type | "tesseract-digital-twin-control" | 消息类型标识 |
| action | "toggle-microphone" / "toggle-speaker" | 控制动作 |
| active | boolean | 期望的目标状态 |
| sessionId | string? | 关联的预览会话 ID |

## State Transitions

### PreviewSession Lifecycle
```
[none] ──心跳到达──→ [idle] ──用户激活──→ [active/live]
                        ↑                      │
                        └───用户关闭/心跳丢失───┘

camera 特例:
[idle] ──有 streamUrl──→ [connecting] ──WebRTC 成功──→ [live]
                                        │
                                        └──WebRTC 失败──→ [error] ──重试──→ [connecting]
```

### TopControl Button States
```
[disabled] ──心跳报告设备在线──→ [enabled/inactive]
                                    │
                              用户点击 → [loading] ──MQTT 回包──→ [enabled/active]
                                                        │
                                                        └──超时/失败──→ [enabled/inactive + error toast]
```
