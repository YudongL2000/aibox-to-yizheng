# Feature Specification: 数字孪生唯一真相源同步

**Feature Branch**: `006-digital-twin-truth-sync`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "将数字孪生、对话界面与 backend Agent 打通为唯一真相源；修复 mock 拼装 speaker 等组件虽然回传 portId 但数字孪生不实时更新的问题；并让数字孪生窗口打开时位于客户端顶部而不是被客户端遮住。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - mock 插口后数字孪生立即对齐 (Priority: P1)

作为正在教学模式中 mock 拼装硬件的用户，我希望当我在右侧对话卡里确认摄像头、speaker、机械手等组件的接口后，左侧数字孪生会立刻把组件挂到对应接口，而不是聊天里显示“已插入”但数字孪生还停在旧状态。

**Why this priority**: 这是教学模式与数字孪生是否真的打通的最小闭环。只要这一跳不成立，用户就无法相信右侧配置与左侧画面指向的是同一个机器人。

**Independent Test**: 在配置卡片中为 speaker 选择 `接口2 · 侧面B` 并点击确认后，无需刷新、重开数字孪生或手动切换视图，数字孪生应立即显示 speaker 挂载到 `port_2`。

**Acceptance Scenarios**:

1. **Given** 用户当前处于教学模式配置阶段，**When** 为某个硬件节点确认具体接口并提交，**Then** 数字孪生应在同一会话内实时显示该组件挂载到对应接口。
2. **Given** 同一物理硬件在 workflow 中对应多个逻辑节点，**When** 用户完成接口确认，**Then** 数字孪生只显示一个真实硬件挂载实例，而不是重复模型。
3. **Given** backend 已经确认节点配置成功，**When** 数字孪生仍未更新，**Then** 系统必须自动继续完成一次读后校验，直到画面与 backend 状态对齐或给出明确失败信息。

---

### User Story 2 - 数字孪生、对话与 backend 服从同一真相源 (Priority: P1)

作为调试教学/对话模式的用户，我希望数字孪生画面、右侧对话卡片和 backend Agent 对“当前装了哪些组件、装在哪个口”只有一份真相源，而不是每一层都各猜一遍。

**Why this priority**: 这决定了系统是否会持续陷入“日志说成功、UI 说失败、场景半更新”的裂脑。没有单一真相源，就没有稳定可调试性。

**Independent Test**: 连续 mock 插入 camera、speaker、hand 三个组件后，backend 日志、对话卡片与数字孪生显示出的接口位置必须一致，且晚到的旧消息不能覆盖新状态。

**Acceptance Scenarios**:

1. **Given** `confirm-node` 已返回成功，**When** 系统刷新当前场景，**Then** 最终渲染结果必须以后端已持久化的数字孪生状态为准。
2. **Given** 聊天响应中的场景与后台持久化场景不一致，**When** 客户端完成同步，**Then** 必须以后端持久化场景为准。
3. **Given** 短响应场景先到而持久化场景后到，**When** 客户端完成同步，**Then** 不得让短响应场景长期覆盖后台已持久化的结果。

---

### User Story 3 - 数字孪生窗口始终处于客户端顶部 (Priority: P2)

作为同时操作主客户端和数字孪生窗口的用户，我希望数字孪生窗口打开后始终浮于客户端主窗口之上，而不是我一点击主客户端，数字孪生就被盖住。

**Why this priority**: 这直接影响调试效率。数字孪生是当前 feature 的主观测面板，如果它总被主窗口压住，用户就必须不停切窗，体验等同于没集成。

**Independent Test**: 打开数字孪生窗口后，点击主客户端的聊天区、按钮区或工作区，数字孪生窗口仍保持在主窗口之上且可见。

**Acceptance Scenarios**:

1. **Given** 数字孪生窗口已打开，**When** 用户重新点击主客户端，**Then** 数字孪生窗口仍保持在主客户端之上。
2. **Given** 用户再次点击“数字孪生”入口，**When** 子窗口已存在，**Then** 系统应复用同一窗口并将其带到最前，而不是再开一份新窗口。

### Edge Cases

- 当 `confirm-node` 的短响应里携带旧场景，但 `config-state` 已经持久化出新场景时，客户端如何避免采用旧场景？
- 当同一 category 下存在多个逻辑节点共享一个物理硬件时，系统如何避免把一个 speaker/hand 投影出多个模型？
- 当数字孪生窗口已打开且主窗口重新获得焦点时，如何保证子窗口仍在主窗口之上而不是被压回去？
- 当 backend 无法返回可用场景时，系统如何回退到底座默认状态而不是保留旧会话残影？

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 在用户确认 mock 硬件接口后，实时将该组件挂载到数字孪生中的对应接口位置。
- **FR-002**: 系统 MUST 以后端已持久化的数字孪生场景作为教学模式配置阶段的唯一真相源。
- **FR-003**: 系统 MUST 防止同一物理硬件因多个逻辑节点被重复投影为多个数字孪生模型。
- **FR-004**: 当短响应场景与后台持久化场景不一致时，系统 MUST 最终以后端持久化场景为准。
- **FR-005**: 系统 MUST 在无法获取场景时回退到底座默认场景，而不是保留旧残影。
- **FR-006**: 数字孪生窗口 MUST 作为客户端内的单实例业务子窗口复用。
- **FR-007**: 数字孪生窗口 MUST 在打开后保持位于客户端主窗口之上，用户点击主窗口不得将其遮挡。
- **FR-008**: 系统 MUST 为数字孪生同步链提供可读日志，至少能定位 `confirm-node -> config-state -> scene broadcast -> frontend consume` 的每一跳。

### Key Entities *(include if feature involves data)*

- **DigitalTwinSceneEnvelope**: 带有会话身份、阶段和场景内容的统一数字孪生同步载体。
- **ConfigNodeMountState**: 描述单个配置节点已经被绑定到哪个接口、对应哪个物理设备的挂载状态。
- **DigitalTwinWindowState**: 描述数字孪生窗口当前是否打开、是否已置顶、绑定哪个会话/工作流的窗口状态。
- **DigitalTwinSyncCheckpoint**: 用于调试的一次同步检查点，记录该次同步从哪一跳来、是否成功推进到下一跳。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% 的 mock 插口确认场景在 2 秒内让数字孪生显示出正确的接口挂载结果。
- **SC-002**: 在验收样本中，0 个“同一物理硬件”场景会在数字孪生里渲染出重复模型。
- **SC-003**: 在验收样本中，100% 的“主窗口重新聚焦”场景都不会把数字孪生窗口盖住。
- **SC-004**: 调试日志必须能在一次失败案例中明确指出断在 backend 持久化、Electron 广播还是 frontend 消费哪一跳。

## Assumptions

- 当前桌面客户端一次只维护一个活动数字孪生窗口。
- backend `config-state` 已经能够代表当前教学模式配置态的已持久化硬件状态。
- 数字孪生页面继续消费既有 `digitalTwinScene` 结构，不在本轮引入新的渲染协议。
- 本轮范围只覆盖 mock 配置态与数字孪生窗口层级，不扩展新的硬件模型或新的渲染器框架。
