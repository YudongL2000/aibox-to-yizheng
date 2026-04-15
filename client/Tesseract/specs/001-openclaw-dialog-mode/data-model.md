# Data Model: OpenClaw 对话模式

## 1. DialogueModeSession

一次从用户在对话模式发起请求，到开始互动、等待补件、跳转教学或失败重试的完整会话。

| Field | Type | Description |
|---|---|---|
| sessionId | string | backend Agent 会话 ID，贯穿聊天、校验、部署与教学接力 |
| interactionMode | enum(`teaching`, `dialogue`) | 当前 UI 模式 |
| userGoal | string | 用户原始请求 |
| branch | enum(`instant_play`, `hardware_guidance`, `teaching_handoff`, `validation_failed`) | 当前归属分支 |
| phase | enum(`idle`, `matching_skill`, `checking_hardware`, `waiting_for_insert`, `validating_insert`, `ready_to_deploy`, `deploying`, `interacting`, `handoff_ready`, `failed`) | 当前阶段 |
| matchedSkill | SkillMatchResult? | 已命中的技能结果，未知技能时为空 |
| hardwareSnapshot | HardwareReadinessSnapshot? | 最近一次硬件状态快照 |
| deploymentPrompt | DeploymentPrompt? | 当前是否处于待部署确认阶段 |
| teachingHandoff | TeachingHandoff? | 未知技能时的跳转载荷 |
| lastAgentUtterance | string? | 最近一次 AI 话术 |
| lastUpdatedAt | string | ISO 时间戳 |

**Validation rules**
- 同一 `sessionId` 同时只能有一个激活的 `phase`。
- `branch=instant_play` 时不得出现 `deploymentPrompt.visible=true`。
- `branch=teaching_handoff` 时 `matchedSkill` 必须为空，`teachingHandoff` 必须存在。

## 2. SkillMatchResult

backend 对用户请求的技能命中结果。

| Field | Type | Description |
|---|---|---|
| skillId | string | 技能唯一标识 |
| displayName | string | 例如“石头剪刀布” |
| matchStatus | enum(`matched`, `ambiguous`, `unmatched`) | 命中状态 |
| confidence | number | 0-1 之间的匹配置信度 |
| gameplayGuide | string | AI 对用户的简洁玩法引导 |
| requiredHardware | HardwareRequirement[] | 该技能需要的硬件集合 |
| initialPhysicalCue | PhysicalCue? | 就绪后自动触发的初始化动作 |

**Validation rules**
- `matchStatus=matched` 时 `requiredHardware` 至少包含 1 项。
- `matchStatus=unmatched` 时 `skillId` 与 `displayName` 允许为空，但 `gameplayGuide` 应为学习邀请文案。

## 3. HardwareRequirement

技能声明的单个硬件需求。

| Field | Type | Description |
|---|---|---|
| componentId | string | 逻辑组件 ID，如 `mechanical_hand`、`camera` |
| displayName | string | 给用户看的名称，如“机械手” |
| requiredCapability | string | 业务能力键，如 `rps_gesture_recognition` |
| acceptablePorts | string[] | 允许插入的接口列表 |
| requiredModelIds | string[] | 可接受的硬件型号 |
| isOptional | boolean | 是否为可选硬件，首版默认 `false` |

## 4. HardwareReadinessSnapshot

当前会话可见的硬件状态归纳。

| Field | Type | Description |
|---|---|---|
| source | enum(`miniclaw_ws`, `mqtt_proxy`, `backend_cache`) | 本次状态来源 |
| connectedComponents | ConnectedHardwareComponent[] | 当前检测到的设备 |
| missingRequirements | HardwareRequirement[] | 仍未满足的硬件需求 |
| validationStatus | enum(`idle`, `pending`, `success`, `failure`, `timeout`) | 最近一次校验状态 |
| lastEventType | enum(`inserted`, `removed`, `heartbeat`, `error`, `snapshot`) | 最近一次事件类型 |
| lastEventAt | string | ISO 时间戳 |
| failureReason | string? | 校验失败时给用户看的原因 |

**Validation rules**
- `validationStatus=success` 时 `missingRequirements` 必须为空。
- `validationStatus=failure` 时 `failureReason` 不得为空。

## 5. ConnectedHardwareComponent

被本地桥接层标准化后的单个已连接设备。

| Field | Type | Description |
|---|---|---|
| componentId | string | 逻辑组件 ID |
| deviceId | string | 设备实例 ID |
| modelId | string | 型号 ID |
| displayName | string | 用户可见名称 |
| portId | string | 当前接口，如 `port_2` |
| status | enum(`connected`, `validating`, `ready`, `error`, `removed`) | 当前状态 |

## 6. DeploymentPrompt

缺件补齐后的部署确认状态。

| Field | Type | Description |
|---|---|---|
| visible | boolean | 是否展示“开始部署”按钮 |
| status | enum(`hidden`, `visible`, `confirmed`, `revoked`) | 当前状态 |
| message | string | 按钮上方或附近的引导文案 |
| wakeCue | PhysicalCue? | 点击部署后触发的“苏醒”动作 |

**Validation rules**
- `status=visible` 时 `visible=true`。
- 任何拔出事件都会把 `status` 复位为 `revoked` 或 `hidden`。

## 7. TeachingHandoff

从对话模式转入教学模式的显式接力对象。

| Field | Type | Description |
|---|---|---|
| sourceSessionId | string | 来源会话 ID |
| originalPrompt | string | 用户原始输入，如“帮我给花浇水” |
| prefilledGoal | string | 教学模式要自动带入的目标，如“学习给花浇水” |
| entryMode | enum(`dialogue_handoff`) | 跳转来源 |
| createdAt | string | ISO 时间戳 |

## 8. PhysicalCue

需要与 AI 话术或部署动作同步触发的物理反馈。

| Field | Type | Description |
|---|---|---|
| action | enum(`hand_stretch`, `wake`, `none`) | 动作类型 |
| autoTrigger | boolean | 是否由系统自动触发 |
| targetComponentId | string? | 目标硬件组件 |
| metadata | map<string, string> | 额外参数 |

## State Transitions

```text
idle
  -> matching_skill
    -> checking_hardware
      -> interacting                  # 分支 A: 已命中且硬件齐全
      -> waiting_for_insert           # 分支 B: 缺件
      -> handoff_ready                # 分支 C: 未知技能

waiting_for_insert
  -> validating_insert
    -> ready_to_deploy
    -> waiting_for_insert
    -> failed

ready_to_deploy
  -> deploying
    -> interacting
    -> waiting_for_insert

handoff_ready
  -> teaching mode screen
```
