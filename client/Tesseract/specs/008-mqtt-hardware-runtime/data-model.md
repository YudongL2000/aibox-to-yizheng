# Data Model: MQTT 硬件运行时闭环

## HardwareRuntimeState

- **Purpose**: backend 的唯一运行时真相源，汇总 heartbeat、命令执行、预览状态与数字孪生场景。
- **Fields**:
  - `connected`: 是否在心跳时效窗口内收到有效 heartbeat
  - `lastHeartbeatAt`: 最近一次 heartbeat 的接收时间
  - `deviceId`: 当前硬件设备 ID
  - `devices`: `HeartbeatDeviceRecord[]`
  - `builtInControls`: `BuiltInPeripheralState[]`
  - `activeCommands`: `HardwareCommandExecution[]`
  - `lastCommandResults`: `HardwareCommandResult[]`
  - `digitalTwinScene`: 当前 canonical scene
  - `previewState`: `PreviewRuntimeState`
  - `revision`: 单调递增修订号

## HeartbeatDeviceRecord

- **Purpose**: heartbeat 中一条设备记录的标准化表示。
- **Fields**:
  - `componentName`: `cam | hand | wifi | mimiclaw | car | screen`
  - `deviceName`
  - `devicePath`
  - `hardwarePortLabel`: 原始接口名，如 `3-1.4`
  - `resolvedPortId`: `port_1 | port_2 | port_3 | port_4 | port_7 | null`
  - `status`: `online | offline`
  - `vidPid`
  - `hasRenderableModel`: 是否应在 3D 视图中挂载模型

## BuiltInPeripheralState

- **Purpose**: 内置麦克风/扬声器控制状态。
- **Fields**:
  - `type`: `microphone | speaker`
  - `status`: `idle | activating | active | error`
  - `lastTriggeredAt`
  - `lastResultMessage`

## HardwareCommandEnvelope

- **Purpose**: 云侧下发到硬件的命令定义。
- **Fields**:
  - `requestId`
  - `messageType`: `workflow | workflow_stop | cmd`
  - `targetDeviceId`
  - `payload`
  - `initiator`: `teaching-mode | dialogue-mode | digital-twin-control`
  - `createdAt`

## HardwareCommandExecution

- **Purpose**: 当前或最近一次命令执行过程。
- **Fields**:
  - `requestId`
  - `summary`
  - `state`: `pending | acknowledged | failed | timed_out`
  - `sentAt`
  - `acknowledgedAt`

## HardwareCommandResult

- **Purpose**: 端侧回包的标准化表示。
- **Fields**:
  - `requestId`
  - `deviceType`
  - `command`
  - `resultCode`
  - `message`
  - `receivedAt`

## PreviewRuntimeState

- **Purpose**: 数字孪生左侧预览面板统一状态。
- **Fields**:
  - `camera`: `PreviewSessionState | null`
  - `microphone`: `PreviewSessionState | null`
  - `speaker`: `PreviewSessionState | null`

## PreviewSessionState

- **Purpose**: 单个预览实例的状态。
- **Fields**:
  - `type`: `camera | microphone | speaker`
  - `status`: `idle | connecting | active | error | stopped`
  - `title`
  - `detailMessage`
  - `waveformActive`: 对音频类有效
  - `streamReference`: 对摄像头预览有效
  - `lastUpdatedAt`

## DialogueSkillMatch

- **Purpose**: 后端对当前用户输入与 skills 库匹配后的结果。
- **Fields**:
  - `matched`: 是否命中技能
  - `skillId`
  - `skillName`
  - `requiredHardware`: `componentName[]`
  - `hardwareSatisfied`: 是否所有必需硬件已在线
  - `routingDecision`: `branch_a | branch_b | branch_c | mimiclaw`
  - `guidanceMessage`

## DigitalTwinRenderableMount

- **Purpose**: 进入数字孪生场景的一条渲染挂载记录。
- **Fields**:
  - `componentName`
  - `resolvedPortId`
  - `modelKey`
  - `status`
  - `source`: `heartbeat`

## Relationships

- `HardwareRuntimeState.devices` 由 heartbeat 驱动更新。
- `HardwareRuntimeState.digitalTwinScene` 由 `devices + builtInControls + previewState` 投影生成。
- `HardwareCommandEnvelope` 与 `HardwareCommandExecution/Result` 通过 `requestId` 关联。
- `DialogueSkillMatch` 消费 `SkillLibraryEntry` 与 `HardwareRuntimeState`，并决定对话模式分支。
