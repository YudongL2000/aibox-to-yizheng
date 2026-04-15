# Data Model: 数字孪生唯一真相源同步

## DigitalTwinSceneEnvelope

- **Purpose**: 描述一次数字孪生同步的业务真相源，不只包含 scene，也包含它属于哪个会话、哪个阶段。
- **Fields**:
  - `sessionId`
  - `workflowId?`
  - `sourcePhase`: `configuring | dialogue | idle`
  - `scene`
- **Rules**:
  - `scene` 为空时必须明确表示回退到底座默认状态
  - 若同时存在短响应场景与 `config-state` 场景，最终以后者为准

## ConfigNodeMountState

- **Purpose**: 描述一个配置节点已经绑定到哪个接口、哪台设备。
- **Fields**:
  - `nodeName`
  - `category`
  - `status`
  - `portId?`
  - `topology?`
  - `deviceId?`
- **Rules**:
  - `status = configured` 时，至少应能推导出有效接口或默认接口
  - 仅用来支持 scene 投影，不直接参与前端渲染

## PhysicalMountedModel

- **Purpose**: 表示数字孪生里的一个真实挂载模型。
- **Fields**:
  - `modelId`
  - `deviceId`
  - `interfaceId`
  - `category`
  - `sourceNodeName`
- **Rules**:
  - 同一 physical mount key 在同一 scene revision 中只能出现一次
  - 当有多个候选节点时，优先选择带显式接口/设备信息的那一个

## DigitalTwinWindowState

- **Purpose**: 表示数字孪生子窗口的桌面层级状态。
- **Fields**:
  - `windowId`
  - `isOpen`
  - `isFocused`
  - `keepAboveMain`
  - `windowRole`
  - `activeSessionId?`
  - `activeWorkflowId?`
- **Rules**:
  - `windowRole = digital-twin` 时必须启用 keep-above-main 行为
  - 同一时刻只允许一个激活中的数字孪生窗口实例

## EmbeddedSceneConsumerState

- **Purpose**: 描述 embedded Flutter 数字孪生页当前对 scene 的消费状态。
- **Fields**:
  - `isReady`
  - `lastInboundScene?`
  - `lastAppliedScene?`
  - `usedFallbackBase`
  - `lastReplayAt?`
- **Rules**:
  - 页面未 ready 时不能假设已消费首帧 scene
  - 本地资产加载完成后只能重放 `lastInboundScene`，不能无条件覆盖回默认底座
  - `usedFallbackBase = true` 时必须能解释为什么 fallback，而不是静默保留旧残影

## DigitalTwinSceneCheckpoint

- **Purpose**: 用于调试和验收的一次同步检查点。
- **Fields**:
  - `requestSource`: `confirm-node | config-state | replay`
  - `hasResponseScene`
  - `hasConfigStateScene`
  - `broadcastedSceneSummary?`
  - `consumedSceneSummary?`
  - `lastError?`
- **Rules**:
  - 任一失败场景都应该能从 checkpoint 看出断在哪一跳
  - `frontend consume` 与 `frontend replay` 需要被区分记录，不能混成“scene 已收到”

## State Transitions

- `configured(node) -> config-state updated -> canonical scene projected -> Electron setScene -> window broadcast -> embedded ready -> scene replayed -> scene consumed`
- `embedded page cold start -> first scene missed -> ready handshake -> current scene replayed -> viewer consumed`
- `transient response scene arrives -> canonical config-state scene arrives -> canonical scene wins`
- `scene unavailable -> explicit fallback to base scene -> next canonical scene replaces fallback`
