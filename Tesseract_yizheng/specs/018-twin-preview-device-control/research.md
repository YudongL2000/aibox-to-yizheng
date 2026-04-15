# Research: 018-twin-preview-device-control

## Decision 1: 心跳中 streamUrl 的来源

**Decision**: 从 MQTT 心跳 `status_response` 的 `devices[]` 中 camera 设备的 `device_path` 字段或 `stream_url` 扩展字段提取 streamUrl。若心跳不包含 streamUrl，则从 `HardwareRuntimeService` 的 config 或环境变量中读取默认值。

**Rationale**: 
- `cloud_mqtt_example.py` 中 `status_response` 的 device 结构已包含 `device_path` 字段
- `p2p_example.html` 中使用的 streamUrl 格式为 `https://stream-platform.eye4cloud.com/index/api/webrtc?app=...&stream=...`
- 后端 `mqtt-hardware-runtime.ts` 已解析心跳 `devices[]`，可扩展提取 streamUrl

**Alternatives considered**:
- 硬编码 streamUrl → 不够灵活，不同设备 URL 不同
- 单独 API 查询 → 增加额外 HTTP 调用，延迟更高

## Decision 2: 预览状态注入的触发时机

**Decision**: 在 `startAssemblyBridgeRelay()` 的 combineLatest 订阅中同时注入预览状态。心跳到达时同步更新 assembly checklist 和 preview sessions。

**Rationale**:
- 已有 `combineLatest([HardwareRuntimeService.status$, DialogueHardwareBridgeService.state$])` 订阅
- 两种数据源合并后既可驱动 assembly checklist 也可驱动 preview panel
- 避免建立第二个平行的心跳订阅

**Alternatives considered**:
- 独立订阅 → 代码重复，状态不一致风险
- 仅用 MQTT 数据 → 忽略 MiniClaw WebSocket 设备

## Decision 3: 控制命令的中继路径

**Decision**: Flutter 顶栏按钮 → postMessage `tesseract-digital-twin-control` → iframe.component 接收 → Electron IPC → backend HTTP API → MQTT publish。复用已有的 backend 端点 (`/api/agent/hardware/microphone/open`, `/api/agent/hardware/speaker/play`)。

**Rationale**:
- 后端端点已实现且经过验证
- Electron IPC 通道 (`tesseract-hardware-upload`) 已注册
- 需要新增 mic/speaker 专用 IPC handler（类似 hardwareUpload/hardwareStop 模式）

**Alternatives considered**:
- Flutter 直接 MQTT publish → Flutter Web 无 MQTT 客户端, 所有 MQTT 通信走 Electron 主进程
- iframe.component 直接 HTTP 调用 → 跳过 Electron IPC，但在打包版中 CORS 问题

## Decision 4: 工作流下发的复用策略

**Decision**: 组装清单全部就绪后，直接在数字孪生组装面板暴露“下发工作流/停止工作流”按钮；Flutter 通过 postMessage 把动作发给 iframe 宿主，宿主直接复用 Electron IPC `tesseract-hardware-upload` / `tesseract-hardware-stop`，同时把组装完成静默同步回聊天会话，避免 UI 上再回到对话窗口操作。

**Rationale**:
- `hardwareUpload()` / `hardwareStop()` → Electron IPC → backend `POST /api/agent/hardware/workflow/upload|stop` → MQTT `workflow|workflow_stop` message，已经严格对齐 `cloud_mqtt_example.py`
- 保留一次静默的 assembly complete 同步，只为让聊天会话脱离 hot_plugging 状态，不再把工作流操作强绑定到对话窗口 CTA

**Alternatives considered**:
- 继续要求用户回到对话窗口点击按钮 → 组装完成和端侧操作割裂，违背数字孪生即诊断台的定位
