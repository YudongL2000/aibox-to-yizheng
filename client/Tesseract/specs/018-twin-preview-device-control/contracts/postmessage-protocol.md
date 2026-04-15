# PostMessage Protocol: iframe ↔ Flutter 设备预览

## Parent → Child (iframe.component → Flutter)

### tesseract-digital-twin-preview-state
注入设备预览会话状态，驱动左侧面板和顶栏按钮。

```json
{
  "type": "tesseract-digital-twin-preview-state",
  "session": {
    "sessionId": "camera-preview",
    "kind": "camera",
    "label": "Camera P2P",
    "active": true,
    "streamUrl": "https://stream-platform.eye4cloud.com/...",
    "amplitude": 0.0,
    "runtimeState": { "device_status": "connected" }
  },
  "control": {
    "id": "builtin-mic",
    "kind": "microphone",
    "active": false,
    "enabled": true,
    "level": 0.35
  },
  "revision": 1
}
```

**触发**: 每次 MQTT 心跳到达且设备状态变化时。
**幂等性**: Flutter 端按 sessionId upsert，重复发送同状态不会引起 UI 闪烁。

## Child → Parent (Flutter → iframe.component)

### tesseract-digital-twin-control
用户点击顶栏控制按钮后发送控制指令。

```json
{
  "type": "tesseract-digital-twin-control",
  "action": "toggle-microphone",
  "active": true,
  "sessionId": "mic-preview"
}
```

**iframe.component 处理**: 根据 action 类型调用对应 Electron IPC → backend HTTP → MQTT publish。
