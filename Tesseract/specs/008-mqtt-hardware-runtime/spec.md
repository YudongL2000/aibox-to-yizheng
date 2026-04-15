# Feature Specification: MQTT Hardware Runtime

**Feature Branch**: `[008-mqtt-hardware-runtime]`  
**Created**: 2026-04-05  
**Status**: Draft  
**Input**: User description: "基于 docs/dev 下的 MQTT/P2P 示例，将现有热插拔 mock 逻辑替换成云侧下发与硬件侧回传的真实交互：按真实五个接口映射数字孪生端口；在顶部添加基于 heartbeat 的硬件连接状态框，并将 heartbeat 与云侧下发指令持续写入 aily-blockly 底部日志窗口；按 heartbeat 中组件名/接口/在线状态实时更新数字孪生组件挂载，组件枚举为 cam、hand、wifi、mimiclaw、car、screen，其中 wifi 与 mimiclaw 不显示 3D 模型；在底座顶部增加麦克风与扬声器按钮；在教学/对话模式所有节点配置完毕时提供上传工作流到硬件和停止工作流按钮，按 docs/dev/cloud_mqtt_example.py 的协议下发工作流/停止指令；点击数字孪生顶部麦克风按钮时向硬件下发打开麦克风指令，并在数字孪生左侧显示麦克风预览波形；点击扬声器按钮时向硬件下发播放示例 mp3 指令，并在数字孪生左侧显示扬声器预览波形；点击数字孪生中的摄像头模型时，按 docs/dev/p2p_example.html 的 P2P/WebRTC 逻辑连接硬件摄像头并在左侧显示预览画面；对话模式必须基于真实 skills 库与后端 Agent 语义判断走 specs/001 的分支 A-C，不再依赖 mock 技能选项；请打通 backend、aily-blockly、frontend 的唯一真相源。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 实时硬件在线与挂载同步 (Priority: P1)

作为正在调试真实硬件的用户，我打开客户端后需要立即看到设备是否在线、哪些外设插在真实接口上、数字孪生是否与端侧状态一致，这样我才能判断当前硬件准备状态并继续后续操作。

**Why this priority**: 这是整个功能的前提。如果 heartbeat 与数字孪生不同步，后续工作流下发、技能执行、预览窗都没有可信基础。

**Independent Test**: 仅实现此故事时，用户可以在客户端看到硬件在线状态框、底部日志持续滚动 heartbeat 与下行指令，并且当端侧 heartbeat 报告 `cam/hand/car/screen` 之类设备插在真实接口时，数字孪生在 2 秒内更新对应挂载状态。

**Acceptance Scenarios**:

1. **Given** 客户端已连接云侧 MQTT 且持续收到 heartbeat，**When** heartbeat 报告 `cam` 在线于 `3-1.4`，**Then** 顶部硬件状态框显示已连接，底部日志追加一条 heartbeat 记录，数字孪生在 `port_3` 的位置显示摄像头模块。
2. **Given** heartbeat 报告 `hand` 从 `online` 变为 `offline`，**When** 新状态被解析，**Then** 底部日志显示该变化，数字孪生移除机械手挂载，且客户端不保留旧残影。
3. **Given** heartbeat 报告 `wifi` 或 `mimiclaw` 在线，**When** 状态同步完成，**Then** 日志和状态框反映其在线，但数字孪生不强行显示错误的 3D 外设模型。

---

### User Story 2 - 配置完成后将工作流真实下发到硬件 (Priority: P1)

作为已经完成教学或对话配置的用户，我需要在客户端内直接把工作流上传到真实硬件、停止工作流、打开麦克风、播放扬声器示例，而不再依赖 mock 按钮或外部脚本。

**Why this priority**: 没有真实下发与控制，教学/对话模式只能停留在“纸面配置完成”，无法形成硬件闭环。

**Independent Test**: 仅实现此故事时，用户在“所有节点配置完毕”后能看到上传工作流和停止工作流按钮；点击后，底部日志立即显示云侧下行指令，随后显示端侧回包；点击数字孪生顶部的麦克风/扬声器按钮时，同样能看到指令下发与对应预览窗。

**Acceptance Scenarios**:

1. **Given** 当前工作流所有节点已配置完成且硬件在线，**When** 用户点击“上传到硬件”，**Then** 客户端向硬件发送工作流消息、底部日志记录完整的下行指令和回包、UI 显示上传成功或失败结果。
2. **Given** 硬件上已有运行中的工作流，**When** 用户点击“停止工作流”，**Then** 客户端发送停止指令、底部日志记录该命令及回包，且工作流状态更新为已停止。
3. **Given** 数字孪生窗口已打开，**When** 用户点击顶部“麦克风”按钮，**Then** 客户端发送打开麦克风指令并在左侧显示麦克风预览波形；**When** 用户点击顶部“扬声器”按钮，**Then** 客户端发送播放示例音频指令并在左侧显示扬声器波形预览。

---

### User Story 3 - 通过真实技能库和语义路由驱动对话模式 (Priority: P2)

作为希望直接通过对话驱动硬件的用户，我希望对话模式不再依赖硬编码的 mock 选项，而是基于真实 skills 库和后端 Agent 判断：已有技能则继续走真实硬件准备与执行流程；未知技能则进入教学；普通闲聊则交给 MimicLaw。

**Why this priority**: 这决定了对话模式是否可信，是否真的与当前技能库存量和真实硬件状态一致。

**Independent Test**: 仅实现此故事时，用户输入与现有 skills 库匹配的需求后，不会看到 mock skill 卡片，而是直接进入 specs/001 的 A/B 分支；输入未知技能需求会进入 C 分支；普通闲聊走 MimicLaw，并且整个过程基于真实库数据而不是硬编码数组。

**Acceptance Scenarios**:

1. **Given** skills 库中存在“石头剪刀布”技能且所需硬件已在线，**When** 用户在对话模式输入“跟我玩石头剪刀布”，**Then** 后端返回技能命中结果，客户端直接进入可执行流程，而不是显示 mock 选项卡。
2. **Given** skills 库中存在命中技能但缺少 `hand` 组件，**When** 用户发起该技能，**Then** 后端进入 specs/001 的协作引导分支，客户端依赖真实 heartbeat 反馈驱动数字孪生与部署按钮变化。
3. **Given** skills 库中不存在“帮我给花浇水”，**When** 用户提出该需求，**Then** 对话模式进入教学分支，并且不会把该请求误发成现成 skill 或硬编码卡片。

---

### User Story 4 - 在数字孪生中查看真实摄像头预览 (Priority: P3)

作为调试摄像头硬件的用户，我希望点击数字孪生中的摄像头模型时，客户端可以按真实 P2P/WebRTC 逻辑连接硬件摄像头，并在左侧显示当前预览画面，以便确认摄像头是否真的工作。

**Why this priority**: 摄像头预览是硬件运行态验证的重要环节，但不影响 P1/P2 的基本闭环，因此优先级略低。

**Independent Test**: 仅实现此故事时，用户在数字孪生里点击摄像头模型后，可以看到左侧出现摄像头预览区域，成功建立或失败断开的状态都可见，并且失败时不会阻断其它数字孪生操作。

**Acceptance Scenarios**:

1. **Given** heartbeat 显示 `cam` 在线且摄像头模型已挂载，**When** 用户点击摄像头模型，**Then** 客户端按 P2P/WebRTC 逻辑发起连接，并在左侧显示实时视频预览。
2. **Given** 摄像头连接失败或流地址无效，**When** 客户端尝试预览，**Then** 用户看到明确失败提示与诊断日志，但数字孪生主体和其它控制按钮仍可继续使用。

### Edge Cases

- 当 heartbeat 长时间未收到时，硬件状态框如何从“已连接”退回“未连接/超时”，并避免保留过期挂载状态？
- 当 heartbeat 中上报了未知组件名、未知接口名或重复设备实例时，系统如何记录日志并忽略无效映射？
- 当工作流上传按钮被点击时，如果 n8n 工作流尚未生成、参数未填完整或云侧 MQTT 未连接，系统如何阻止下发并给出明确原因？
- 当摄像头、麦克风、扬声器预览已经打开时，如果硬件离线，系统如何自动中止预览并向用户解释状态变化？
- 当 `wifi` 或 `mimiclaw` 仅作为连接类组件在线时，系统如何在日志与状态中体现其在线，又避免错误地显示为已有 3D 外设模型？

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the existing mock hot-plugging flow with a runtime driven by cloud-side MQTT commands and hardware-side MQTT responses.
- **FR-002**: System MUST treat MQTT heartbeat as the authoritative source for hardware online/offline status and mounted module topology.
- **FR-003**: System MUST map the real hardware interfaces `3-1.2`, `3-1.3`, `3-1.4`, `3-1.6`, and `3-1.7` to digital twin ports `port_1`, `port_2`, `port_3`, `port_4`, and `port_7` respectively, and MUST remove the obsolete mock-only port assumptions.
- **FR-004**: System MUST show a hardware connection status indicator to the left of the top-right “我的库” button, and the indicator MUST reflect whether recent heartbeat messages are being received.
- **FR-005**: System MUST append received heartbeat events and cloud-to-hardware command events to the aily-blockly bottom log window using a readable, continuously updating format.
- **FR-006**: System MUST parse heartbeat entries for component name, hardware state, and interface location, and MUST update the digital twin scene to match the latest valid state.
- **FR-007**: System MUST recognize the component names `cam`, `hand`, `wifi`, `mimiclaw`, `car`, and `screen`.
- **FR-008**: System MUST recognize the hardware states `online` and `offline`.
- **FR-009**: System MUST NOT render a fabricated 3D module for `wifi` or `mimiclaw`, while still surfacing their status in logs and connectivity feedback.
- **FR-010**: System MUST add microphone and speaker controls on the top surface of the digital twin base and MUST keep them available as built-in peripherals even when no detachable modules are present.
- **FR-011**: System MUST show “上传到硬件” and “停止工作流” controls once teaching mode or dialogue mode reaches the “all nodes configured” state.
- **FR-012**: System MUST send workflow upload and workflow stop commands using the same cloud-to-edge message shapes demonstrated in `docs/dev/cloud_mqtt_example.py`.
- **FR-013**: System MUST surface hardware command acknowledgements or failures back into the client logs and the relevant control states.
- **FR-014**: System MUST send the microphone activation command when the microphone button is clicked and MUST show a microphone preview pane with a waveform indicator on the left side of the digital twin window.
- **FR-015**: System MUST send the sample audio playback command when the speaker button is clicked and MUST show a speaker preview pane with a waveform indicator on the left side of the digital twin window.
- **FR-016**: System MUST let users click the camera hardware model inside the digital twin and MUST start a P2P/WebRTC preview flow using the behavior demonstrated in `docs/dev/p2p_example.html`.
- **FR-017**: System MUST show the camera preview in a left-side pane within the digital twin window and MUST keep the main twin view usable while the preview is active.
- **FR-018**: System MUST remove the current mock skill data, hardcoded dialogue-mode skill options, and mock hardware guidance displays that are no longer backed by the real skills library and backend agent.
- **FR-019**: System MUST route dialogue-mode requests through the backend agent and real skills library so that specs/001 branch A, B, C, or MimicLaw fallback is chosen from backend semantics rather than frontend hardcoding.
- **FR-020**: System MUST maintain a single authoritative runtime state shared across backend, aily-blockly, and the embedded frontend for hardware topology, hardware connectivity, command execution feedback, and preview activation state.
- **FR-021**: System MUST keep the digital twin window visible above the main client when the user explicitly opens it, while still allowing the user to return focus to the main client intentionally.
- **FR-022**: System MUST provide readable diagnostics when heartbeat parsing fails, command delivery fails, preview connection fails, or the hardware connection times out.

### Key Entities *(include if feature involves data)*

- **HardwareHeartbeatSnapshot**: A runtime snapshot derived from MQTT heartbeat messages, containing device timestamp, device list, connectivity freshness, and parsed component mount records.
- **HardwareMountRecord**: A normalized record for one detachable hardware module or built-in peripheral, including component name, resolved digital twin port, online/offline state, and hardware identity details.
- **HardwareCommandEnvelope**: A cloud-to-edge command payload representing workflow upload, workflow stop, microphone activation, audio playback, or other hardware actions, along with request correlation data and delivery status.
- **HardwareCommandResult**: The hardware-side acknowledgement or failure record associated with a sent command, including command type, result code, message text, and correlation metadata.
- **DigitalTwinRuntimeState**: The canonical state used to build the digital twin scene and left-side preview panes, including mounted modules, built-in mic/speaker controls, preview activation state, and revision metadata.
- **PreviewSession**: A user-visible preview instance for microphone, speaker, or camera, containing preview type, activation status, display payload, and error state.
- **SkillLibraryEntry**: A saved skill definition that can be semantically matched by the backend agent, including skill identity, intent summary, required hardware, workflow reference, and dialogue metadata.
- **DialogueRoutingDecision**: The backend-produced routing result that selects specs/001 branch A, B, C, or MimicLaw fallback based on the current user request, real skill matches, and hardware runtime state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When a valid heartbeat message changes hardware online/offline or mount position, the digital twin and client status surfaces reflect the new state within 2 seconds in at least 95% of observed updates.
- **SC-002**: In manual validation, users can determine whether hardware is connected and what commands were sent or acknowledged without leaving the client in 100% of tested runs.
- **SC-003**: After all workflow nodes are configured, users can complete an upload-to-hardware action or see a clear actionable failure reason within 10 seconds in at least 90% of attempts against an available device.
- **SC-004**: Users can trigger microphone, speaker, and camera previews from the digital twin and receive visible success or failure feedback without freezing or losing the main twin interaction in 100% of tested runs.
- **SC-005**: Dialogue mode no longer shows mock skill cards or hardcoded skill options, and backend-driven routing chooses the correct branch A/B/C or MimicLaw fallback for at least 90% of evaluated sample prompts.

## Assumptions

- `docs/dev/heartbeat.log`, `docs/dev/cloud_mqtt_example.py`, and `docs/dev/p2p_example.html` are the authoritative reference samples for MQTT topics, payload shapes, readable logging style, and camera preview flow for this feature.
- The same hardware device ID and MQTT topics shown in the sample files remain valid for the development environment unless explicitly overridden by configuration.
- The detachable hardware base physically supports only five exposed module interfaces in this iteration, mapped to `port_1`, `port_2`, `port_3`, `port_4`, and `port_7`.
- The microphone and speaker are built-in peripherals rather than detachable modules, so they are controlled independently from the detachable port mapping.
- If a heartbeat names a component that has no dedicated 3D model, the client may still expose its presence via status/logs without synthesizing a fake geometry.
- The existing skills library remains the persistent source of known skills, and backend semantic routing is allowed to combine that library with current hardware availability when choosing specs/001 branch A, B, C, or MimicLaw fallback.
