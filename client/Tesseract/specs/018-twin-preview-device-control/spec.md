# Feature Specification: 数字孪生设备预览与控制

**Feature Branch**: `018-twin-preview-device-control`  
**Created**: 2026-04-07  
**Status**: Draft  
**Input**: User description: "下发工作流（MQTT cloud2edge 通道）、麦克风/扬声器 MQTT 控制、摄像头 P2P WebRTC 预览——将数字孪生窗口左侧 PREVIEW SESSIONS 面板与顶栏设备按钮从静态 UI 驱动为实时可操控状态"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 摄像头 P2P 实时预览 (Priority: P1)

用户在 Electron 客户端打开数字孪生窗口后，左侧 PREVIEW SESSIONS 面板的 "Camera P2P" 卡片自动连接端侧摄像头的 WebRTC 流并展示实时画面。

**Why this priority**: 摄像头实时预览是用户验证硬件是否正常工作的第一视觉反馈，是整个设备预览面板最核心的价值。

**Independent Test**: 打开数字孪生窗口，若端侧摄像头在线且有 streamUrl，Camera P2P 卡片应在 5 秒内从 "等待 streamUrl" 转为显示实时视频画面。

**Acceptance Scenarios**:

1. **Given** 端侧设备已连接且摄像头在线，**When** 用户打开数字孪生窗口，**Then** Camera P2P 卡片自动获取 streamUrl 并展示实时 WebRTC 视频流
2. **Given** 端侧摄像头离线或未接入，**When** 用户打开数字孪生窗口，**Then** Camera P2P 卡片显示 "等待 streamUrl" 占位状态
3. **Given** 摄像头已在播放中，**When** WebRTC 连接断开，**Then** 卡片回退为 "连接断开" 状态提示，并在下次心跳恢复时自动重连

---

### User Story 2 - 麦克风/扬声器 MQTT 控制 (Priority: P1)

用户通过数字孪生窗口顶栏的麦克风/扬声器按钮，实时控制端侧设备的音频采集与播放，左侧面板同步展示设备活跃状态与采样波形。

**Why this priority**: 与摄像头并列为硬件控制的基础能力，用户需要在数字孪生界面直接操控端侧音频设备。

**Independent Test**: 点击顶栏麦克风按钮后，端侧收到 MQTT `cmd` 消息 (`device_type: audio, cmd: start`)，左侧波形卡片从 IDLE 变为 LIVE 并展示动态波形。

**Acceptance Scenarios**:

1. **Given** 端侧麦克风可用且 IDLE，**When** 用户点击顶栏麦克风开启按钮，**Then** 系统通过 MQTT 发送 `audio start` 命令、端侧回包成功后麦克风卡片状态变为 LIVE
2. **Given** 麦克风已开启且 LIVE，**When** 用户再次点击麦克风按钮，**Then** 系统发送 `audio stop`、麦克风卡片回退为 IDLE
3. **Given** 端侧扬声器可用，**When** 用户点击扬声器按钮，**Then** 系统通过 MQTT 发送 `speaker play` 命令、扬声器卡片状态变为 LIVE
4. **Given** MQTT 连接不可用，**When** 用户点击任意音频控制按钮，**Then** 按钮显示不可用状态并提示网络未连接

---

### User Story 3 - PREVIEW SESSIONS 面板实时状态注入 (Priority: P1)

打开数字孪生窗口后，左侧 PREVIEW SESSIONS 面板不再显示"等待 preview/runtime state 注入"，而是根据 MQTT 心跳自动填充设备会话卡片（麦克风、扬声器、摄像头）的实时状态。

**Why this priority**: 这是前两个用户故事的前提——没有状态注入，所有设备卡片都是空壳。

**Independent Test**: 启动数字孪生窗口，若 MQTT 心跳报告了 `devices=[cam1, hand1]`，左侧面板应自动出现对应的设备预览卡片及其最新状态。

**Acceptance Scenarios**:

1. **Given** MQTT 心跳包含摄像头/麦克风/扬声器设备信息，**When** 数字孪生窗口加载完成，**Then** 左侧面板自动填充对应设备卡片并显示最新状态
2. **Given** 心跳设备列表变化（新增/移除设备），**When** 下次心跳到达，**Then** 面板动态增删对应卡片
3. **Given** 心跳包含 camera streamUrl 信息，**When** 面板接收到该心跳，**Then** Camera P2P 卡片自动获取 streamUrl 并尝试连接

---

### User Story 4 - 下发工作流到端侧硬件 (Priority: P2)

用户在组装完成或对话流程中点击"下发工作流"按钮时，系统通过 MQTT `cloud2edge` 通道将工作流 JSON 发送到端侧设备执行。

**Why this priority**: 工作流下发是从"设计态"到"执行态"的关键一步，但需要前三个故事提供的设备状态可见性作为前提。

**Independent Test**: 调用已有的 `tesseract-upload-to-hardware` action，验证 MQTT 消息发送到 `qsf/{deviceId}/cloud2edge` 主题、端侧回包成功。

**Acceptance Scenarios**:

1. **Given** 后端已生成工作流 JSON 并保存在 session 中，**When** 用户触发"上传到硬件"按钮，**Then** 工作流通过 MQTT 下发到端侧且收到成功回包
2. **Given** 端侧 MQTT 不可达，**When** 用户触发下发，**Then** 系统返回超时或连接失败的人类可读提示
3. **Given** 组装完成自动触发流程，**When** 系统检测到 `workflow_ready` 阶段，**Then** 自动调用已有的 `tesseract-upload-to-hardware` action 完成下发

---

### User Story 5 - 顶栏设备控制按钮交互反馈 (Priority: P2)

顶栏的麦克风和扬声器按钮根据设备实际在线/离线状态动态切换可用性，点击后有加载中→成功/失败的视觉反馈。

**Why this priority**: 提升用户操作的确定性体验，避免"按了没反应"的困惑。

**Independent Test**: 点击麦克风按钮后出现短暂加载指示，MQTT 回包后按钮变为激活态（绿色指示灯）。

**Acceptance Scenarios**:

1. **Given** 设备在线，**When** 用户点击控制按钮，**Then** 按钮进入加载态，MQTT 回包到达后切换为对应激活/关闭态
2. **Given** 设备离线，**When** 心跳中不包含该设备，**Then** 按钮呈灰色不可用态

---

### Edge Cases

- 数字孪生窗口在 MQTT 心跳间隔期间打开——使用上次缓存的快照初始化面板
- WebRTC 连接在首次 ICE 就失败——显示网络不通提示而非无限等待
- 快速连续点击音频控制按钮——防抖处理，忽略短间隔内的重复请求
- 端侧设备同时返回多个 streamUrl（多摄像头）——当前版本仅取第一个
- MQTT 心跳中 camera 的 streamUrl 格式变化——从 `device_path` 或扩展字段中提取

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 从 MQTT 心跳中提取设备状态（camera/audio/speaker）并转换为 preview session 数据注入 Flutter 数字孪生面板
- **FR-002**: 系统 MUST 从 MQTT 心跳中提取摄像头的 WebRTC streamUrl 并通过 postMessage 传递给 Camera P2P 预览 iframe
- **FR-003**: 系统 MUST 在用户点击麦克风按钮时通过 MQTT `cloud2edge` 通道发送 `{msg_type: "cmd", msg_content: [{device_type: "audio", cmd: "start|stop"}]}` 指令
- **FR-004**: 系统 MUST 在用户点击扬声器按钮时通过 MQTT `cloud2edge` 通道发送 `{msg_type: "cmd", msg_content: [{device_type: "speaker", cmd: "play|stop"}]}` 指令
- **FR-005**: 系统 MUST 复用已有的 `tesseract-upload-to-hardware` action 将工作流 JSON 通过 MQTT 下发到端侧
- **FR-006**: 系统 MUST 在顶栏控制按钮上反映设备的实时在线/离线/活跃状态
- **FR-007**: 系统 MUST 在 WebRTC 连接失败时向用户展示可理解的状态文案而非空白
- **FR-008**: 系统 MUST 对连续点击控制按钮做防抖处理（300ms 内不重复发送命令）

### Key Entities

- **PreviewSession**: 设备预览会话，包含 sessionId、kind（microphone/speaker/camera）、streamUrl、active 状态、amplitude 波形值
- **TopControl**: 顶栏控制按钮，包含 id、kind、enabled、active、level
- **MqttHeartbeat**: 端侧心跳消息，包含 devices[] 数组，每个 device 有 device_type、device_status、device_name、device_path
- **MqttCommand**: 云端下发命令，包含 msg_type、msg_content[]、request_id

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 数字孪生窗口打开后 3 秒内左侧面板从占位状态更新为实际设备卡片
- **SC-002**: 摄像头 P2P 预览从获取 streamUrl 到显示首帧画面 ≤ 5 秒（局域网条件下）
- **SC-003**: 麦克风/扬声器控制按钮从点击到状态反馈 ≤ 2 秒
- **SC-004**: 工作流下发成功率 ≥ 95%（端侧在线条件下）
- **SC-005**: 设备离线时所有控制按钮 100% 呈现不可用状态

## Assumptions

- 端侧 MQTT 心跳已稳定运行，间隔约 5 秒，格式遵循 `cloud_mqtt_example.py` 定义的 `status_response` 结构
- WebRTC 流通过 ZLMRTCClient 库连接，streamUrl 格式为 `https://stream-platform.eye4cloud.com/index/api/webrtc?...`
- 后端 `mqtt-hardware-runtime.ts` 已实现 `openMicrophone()`、`closeMicrophone()`、`playSpeaker()` 方法
- 后端 `POST /api/agent/hardware/workflow/upload` 端点已可用
- Flutter 端 `DigitalTwinPreviewPane`、`DigitalTwinWaveformCard`、`DigitalTwinCameraPreviewFrame` 组件已实现 UI 渲染逻辑，需要的是数据注入而非重写 UI
- Electron 主进程 IPC 通道 `tesseract-hardware-upload` 已注册
- 当前版本仅支持单摄像头预览
