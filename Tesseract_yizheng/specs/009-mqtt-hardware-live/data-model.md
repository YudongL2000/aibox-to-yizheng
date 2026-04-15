# Data Model: MQTT Hardware Live Integration

## HardwareRuntimeSnapshot

- Purpose: 表示某一时刻 hardware box 的规范化运行态。
- Fields:
  - `deviceId: string`
  - `receivedAt: string`
  - `heartbeatAt: number | null`
  - `connectionState: "connected" | "stale" | "offline"`
  - `components: HardwareComponentState[]`
  - `builtinControls: BuiltinControlState[]`
  - `lastCommandRecords: HardwareCommandRecord[]`
- Relationships:
  - 由 0..n 个 `HardwareComponentState` 组成
  - 派生一份 `DigitalTwinSceneEnvelope`

## HardwareComponentState

- Purpose: 表示一个真实组件在 runtime store 中的标准化状态。
- Fields:
  - `componentType: "cam" | "hand" | "wifi" | "mimiclaw" | "car" | "screen"`
  - `instanceId: string | null`
  - `status: "online" | "offline"`
  - `physicalPort: "3-1.2" | "3-1.3" | "3-1.4" | "3-1.6" | "3-1.7" | null`
  - `mappedPort: "port_1" | "port_2" | "port_3" | "port_4" | "port_7" | null`
  - `devicePath: string | null`
  - `vidPid: string | null`
  - `modelVisible: boolean`
- Validation:
  - `mappedPort` 必须由 `physicalPort` 显式映射，不允许推断到不存在的口
  - `wifi/mimiclaw` 的 `modelVisible` 固定为 `false`

## HardwareCommandRecord

- Purpose: 表示一次发往硬件或由硬件回传的命令事件。
- Fields:
  - `requestId: string`
  - `direction: "cloud2edge" | "edge2cloud"`
  - `kind: "workflow_upload" | "workflow_stop" | "microphone_start" | "microphone_stop" | "speaker_play" | "speaker_stop" | "camera_start" | "camera_stop" | "gesture" | "status"`
  - `payload: object`
  - `status: "sent" | "ack" | "timeout" | "failed"`
  - `message: string`
  - `occurredAt: string`

## SkillHardwareRequirement

- Purpose: 表示技能运行所依赖的真实组件集合。
- Fields:
  - `skillId: string`
  - `requiredComponents: Array<"cam" | "hand" | "wifi" | "mimiclaw" | "car" | "screen">`
  - `ready: boolean`
  - `missingComponents: string[]`

## DialogueRoutingDecision

- Purpose: 表示 backend 对对话模式请求的语义决策。
- Fields:
  - `branch: "instant_interaction" | "hardware_guidance" | "teaching_handoff" | "free_chat"`
  - `matchedSkillId: string | null`
  - `matchedSkillName: string | null`
  - `requiredComponents: string[]`
  - `missingComponents: string[]`
  - `canDeploy: boolean`
  - `uploadReady: boolean`

## PreviewSession

- Purpose: 表示数字孪生左侧诊断面板的一次预览会话。
- Fields:
  - `previewType: "microphone" | "speaker" | "camera"`
  - `status: "idle" | "connecting" | "active" | "stopped" | "failed"`
  - `startedAt: string | null`
  - `lastActivityAt: string | null`
  - `errorMessage: string | null`
  - `waveformSeed: number | null`
  - `cameraUrl: string | null`

## DigitalTwinSceneEnvelope

- Purpose: 表示 backend canonical scene 与 preview/control 元数据的统一包。
- Fields:
  - `revision: number`
  - `scene: DigitalTwinSceneConfig`
  - `runtimeSnapshot: HardwareRuntimeSnapshot`
  - `previewSessions: PreviewSession[]`
  - `topControls: Array<"microphone" | "speaker">`
  - `generatedAt: string`

## State Transitions

- Heartbeat:
  - `offline -> connected`
  - `connected -> stale -> offline`
- Component:
  - `offline -> online`
  - `online -> offline`
- Command:
  - `sent -> ack`
  - `sent -> timeout`
  - `sent -> failed`
- Preview:
  - `idle -> connecting -> active`
  - `connecting -> failed`
  - `active -> stopped`
