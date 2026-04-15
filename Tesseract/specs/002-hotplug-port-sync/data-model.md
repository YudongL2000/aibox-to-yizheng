# Data Model: Mock 插拔端口同步

## 1. Hotplug Event

表示一次插拔或全量快照变化。

### Fields

- `source`: 事件来源，如 `miniclaw_ws` / `mqtt_proxy`
- `eventType`: `device_inserted` / `device_removed` / `snapshot` / `error`
- `timestamp`: ISO 时间戳
- `component`: 单组件事件时的主组件
- `connectedComponents`: 快照事件时的完整组件集合
- `raw`: 原始 payload，供调试与回放

## 2. Connected Component

表示当前一件已经被系统识别的组件。

### Fields

- `componentId`: 组件类别身份
- `deviceId`: 具体设备实例身份
- `modelId`: 数字孪生使用的模型身份
- `displayName`: 人类可读名称
- `portId`: 当前挂载的接口身份
- `status`: `connected` / `ready` / `error` / `removed`

## 3. Hardware Snapshot

表示当前可信的整机连接状态。

### Fields

- `source`
- `connectedComponents`
- `missingRequirements`
- `validationStatus`
- `lastEventType`
- `lastEventAt`
- `failureReason`

## 4. Digital Twin Scene

表示前端可直接渲染的数字孪生场景。

### Fields

- `base_model_id`
- `interfaces[]`
- `models[]`

### Invariants

- 底座模型始终存在
- 非底座模型必须通过 `interface_id` 指向合法端口
- 当 `connectedComponents` 为空时，scene 退化为仅底座
