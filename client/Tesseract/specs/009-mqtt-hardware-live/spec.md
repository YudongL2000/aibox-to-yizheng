# Feature Specification: MQTT Hardware Live Integration

**Feature Branch**: `009-mqtt-hardware-live`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "【请你直接跑完 speckit 的闭环（从 specify-implement），记得采用 sub-agent 模式】接下来请你基于这个目录 @docs\dev 中的几个文件，将现有实现的热插拔 mock 逻辑给替换成基于 mqtt 协议，云侧下发与硬件侧回传的真实交互来落地优化目前项目对应显示与反馈的逻辑： 1. 我们真实的硬件如数字孪生所示，能够直接插入模块化的外设组件，一共有五个接口：3-1.2；3-1.3；3-1.4；3-1.6；3-1.7（请你基于这个真实情况将现有的数字孪生接口数量进行调整，对应关系为前四个为 port_1~4；3-1.7 为 port_7） 2. 请你基于heartbeat.log， 在右上角“我的库”按钮左侧放置一个检测是否连接到硬件的状态框，以是否接收到 mqtt-heartbeat 作为判断依据，然后将接收到的 mqtt-heartbeat 直接在 aily-blockly 的底部日志窗口中持续更新，也需要将云侧下发到硬件的指令也同步显示在日志窗口中 3. 请你基于heartbeat.log的日志样式来去同步数字孪生的硬件拔插状态（当 heartbeat 出现了特定组件名字、特定接口以及特定状态时，能够准确解析并准确更新在数字孪生窗口中）组件名字枚举值为“cam，hand，wifi，mimiclaw，car，screen”（wifi，mimiclaw 这两个组件没有自己的硬件模型，不要硬显示现有的其他模型文件）；硬件状态枚举值为“online，offline”；并请你实现在底座顶部实现两个按钮，分别是麦克风与扬声器（因为这两个外设组件是内置的） 4. 请你基于cloud_mqtt_example.py，实现在教学/对话模式到了“所有节点配置完毕”步骤的时候，给出一个上传工作流到硬件的按钮，基于这个 py 文件中对于“下发工作流”的定义，实现将用户填好参数的工作流上传到硬件的逻辑，同时也在这个按钮右侧实现“停止工作流”的逻辑；并实现当用户点击数字孪生中顶部的“麦克风”按钮时，实现基于这份 py 中定义的“打开麦克风”的指令自动下发硬件打开麦克风的指令，并在数字孪生窗口左侧显示一个麦克风预览窗口，显示一个波形图来收音用户的声音，方便用户确认是否正常运行；同理当用户点击“扬声器”按钮时，请你基于 py 中定义的“播放 mp3”指令自动下发硬件播放示例音频的指令，并在数字孪生窗口左侧显示一个扬声器预览窗口，显示一个波形图来表示扬声器目前的声音，方便用户确认是否正常运行 5. 请你基于 p2p_example.html的逻辑，实现当用户点击数字孪生中的摄像头硬件模型时，自动基于 p2p 的逻辑实现连接硬件侧的摄像头，并在数字孪生窗口左侧显示一个摄像头预览窗口，显示摄像头目前的拍摄画面，方便用户确认是否正常运行"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Hardware Presence And Digital Twin Sync (Priority: P1)

As a desktop user working with a real OpenClaw device, I need the client to reflect actual hardware presence from the cloud device channel instead of mock hotplug actions, so that the digital twin and client status always represent what is physically connected.

**Why this priority**: Without a live hardware truth source, every downstream teaching, dialogue, and deployment step is untrustworthy.

**Independent Test**: Can be fully tested by starting the desktop client, receiving real device heartbeats, and verifying that hardware presence, connectivity state, logs, and the digital twin update without any mock button interaction.

**Acceptance Scenarios**:

1. **Given** the client is running and heartbeats are being received from a hardware box, **When** a heartbeat reports a supported component as online at a supported interface, **Then** the hardware connection status indicator switches to connected, the bottom log area appends the heartbeat in readable form, and the digital twin updates the matching component at the mapped port.
2. **Given** the client is running and a later heartbeat reports that the same component is offline, **When** that heartbeat is processed, **Then** the bottom log area appends the change and the digital twin removes or deactivates the matching component without leaving a stale model behind.
3. **Given** the digital twin window is opened, **When** the user continues interacting with the main client, **Then** the digital twin window stays visually above the main client instead of being hidden behind it.

---

### User Story 2 - Real Hardware Guided Teaching And Deployment (Priority: P1)

As a user completing teaching mode, I need real hardware presence to satisfy the configuration steps and then upload or stop a workflow on the physical device, so that I can move from authored workflow to real device execution without mock steps.

**Why this priority**: This is the first complete path from teaching output to hardware execution. It turns the system from a demo into a usable integration loop.

**Independent Test**: Can be fully tested by entering teaching mode, progressing through required hardware configuration using real heartbeat updates, and then using the workflow upload and stop controls after all required nodes are complete.

**Acceptance Scenarios**:

1. **Given** teaching mode is waiting for a required hardware component, **When** a real heartbeat reports that the required component is online on a valid interface, **Then** the configuration flow advances using that real hardware information instead of requiring a mock insert button.
2. **Given** all teaching mode nodes are fully configured, **When** the system reaches the completion step, **Then** the UI shows both an upload-to-hardware action and a stop-workflow action.
3. **Given** a user clicks upload-to-hardware after all required inputs are complete, **When** the command is sent to the device, **Then** the bottom log area shows the outbound command and the user receives a clear success or failure response.
4. **Given** a workflow is currently running on hardware, **When** the user clicks stop-workflow, **Then** the stop command is sent and the bottom log area shows the outbound command and any resulting device response.

---

### User Story 3 - Dialogue Mode Skill Match With Real Hardware Branching (Priority: P2)

As a user in dialogue mode, I need the system to match my request against the real skills library and then branch into the existing A/B/C dialogue logic using live hardware state, so that matched skills no longer depend on mock cards or hardcoded options.

**Why this priority**: Dialogue mode needs to trust the same skill library and the same hardware truth source as teaching mode, otherwise the experience splits into contradictory states.

**Independent Test**: Can be fully tested by saving a skill into the real skills library, asking for that capability in dialogue mode, and verifying that the system either starts immediately, requests missing hardware, or hands off to teaching based on real state.

**Acceptance Scenarios**:

1. **Given** a user request semantically matches a saved skill and the required hardware is already online, **When** the request is processed, **Then** dialogue mode enters the instant-interaction branch and triggers the skill’s immediate start behavior.
2. **Given** a user request semantically matches a saved skill but one or more required hardware modules are offline, **When** the request is processed, **Then** dialogue mode enters the hardware-guidance branch and continues waiting on real heartbeat updates instead of mock insert choices.
3. **Given** a user request does not match any saved skill, **When** the request is processed, **Then** dialogue mode enters the teaching-handoff branch and offers the user a path to teach the new skill.

---

### User Story 4 - Media Control And Preview From Digital Twin (Priority: P2)

As a user observing the digital twin, I need microphone, speaker, and camera controls to send real device commands and open live previews, so that I can verify those hardware capabilities directly from the twin surface.

**Why this priority**: Live previews make the digital twin operational, not just representational, and they are the clearest proof that the cloud-device loop is working.

**Independent Test**: Can be fully tested by clicking the built-in microphone and speaker controls and a camera hardware model, then observing outbound commands and visible previews.

**Acceptance Scenarios**:

1. **Given** the digital twin window is open, **When** the user clicks the built-in microphone control, **Then** the open-microphone command is sent, the log area records it, and a microphone preview panel appears with a live-looking waveform so the user can verify capture activity.
2. **Given** the digital twin window is open, **When** the user clicks the built-in speaker control, **Then** the play-audio command is sent, the log area records it, and a speaker preview panel appears with a live-looking waveform so the user can verify playback activity.
3. **Given** a camera module is currently present in the digital twin, **When** the user clicks that camera model, **Then** a camera preview panel opens and attempts to connect to the device stream using the existing peer-to-peer flow, showing the current captured image when available.

### Edge Cases

- What happens when heartbeat messages stop arriving for a previously connected device for longer than the expected liveness window?
- How does the system behave when a heartbeat reports a supported component on an unsupported interface string that cannot be mapped to a digital twin port?
- How does the system behave when multiple supported components are reported simultaneously in a single heartbeat and one or more of them have no visible hardware model?
- What happens when the user clicks microphone, speaker, camera, upload, or stop controls while the hardware box is offline?
- What happens when a workflow upload command succeeds at the cloud side but the device never returns a matching response?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the existing mock hotplug progression with live hardware presence driven by the cloud-device control channel and device heartbeat responses.
- **FR-002**: System MUST reduce the digital twin’s external modular interfaces to the real hardware mapping set: `3-1.2`, `3-1.3`, `3-1.4`, `3-1.6`, and `3-1.7`, exposed to the rest of the system as `port_1`, `port_2`, `port_3`, `port_4`, and `port_7`.
- **FR-003**: System MUST treat heartbeat reception as the source of truth for whether the client is currently connected to real hardware.
- **FR-004**: System MUST render a hardware connectivity status indicator to the left of the top-right “我的库” entry and update that indicator based on the latest heartbeat liveness.
- **FR-005**: System MUST append readable heartbeat updates and outbound hardware commands into the client’s bottom log area continuously while the client is running.
- **FR-006**: System MUST parse heartbeat component records using the supported component names `cam`, `hand`, `wifi`, `mimiclaw`, `car`, and `screen`, and supported status values `online` and `offline`.
- **FR-007**: System MUST update the digital twin scene from heartbeat state so that supported visible components appear and disappear at the correct mapped port in near real time.
- **FR-008**: System MUST NOT render substitute hardware models for `wifi` or `mimiclaw`, even when those components are reported as online.
- **FR-009**: System MUST render built-in microphone and speaker controls on the top surface of the base so they are always available without occupying an external modular port.
- **FR-010**: System MUST continue to use the real skills library as the only dialogue-mode skill source and MUST remove hardcoded or mock dialogue skill choices from the user-facing flow.
- **FR-011**: System MUST route dialogue requests through backend semantic skill matching before deciding whether the request belongs to existing-skill interaction, hardware guidance, fallback free chat, or teaching handoff.
- **FR-012**: System MUST allow dialogue mode to continue through the existing branch A/B/C logic using live hardware state when a request matches an existing skill.
- **FR-013**: System MUST allow teaching mode hardware configuration steps to advance from live heartbeat state instead of requiring manual mock port selection.
- **FR-014**: System MUST expose an upload-to-hardware action and a stop-workflow action when teaching or dialogue flow reaches the state where all required nodes are configured.
- **FR-015**: System MUST send workflow upload and workflow stop commands using the same cloud-device message shape as the existing reference flow.
- **FR-016**: System MUST show the outbound upload or stop command in the bottom log area and MUST surface the matching device response or timeout outcome to the user.
- **FR-017**: System MUST send an open-microphone command when the built-in microphone control is activated.
- **FR-018**: System MUST show a microphone preview panel on the left side of the digital twin window while microphone activity is active, including a waveform visualization that gives the user confidence the input path is alive.
- **FR-019**: System MUST send a play-audio command when the built-in speaker control is activated.
- **FR-020**: System MUST show a speaker preview panel on the left side of the digital twin window while speaker playback activity is active, including a waveform visualization that gives the user confidence the output path is alive.
- **FR-021**: System MUST allow the user to click a camera model in the digital twin and open a camera preview panel on the left side of the digital twin window.
- **FR-022**: System MUST attempt camera preview using the existing peer-to-peer video connection flow and MUST show a visible connection, loading, success, or failure state to the user.
- **FR-023**: System MUST keep the digital twin window visually above the main client while that window is open, so that interactions with the main client do not cover it.
- **FR-024**: System MUST preserve a readable empty or degraded state for previews and controls when the hardware is offline or a media connection fails.

### Key Entities *(include if feature involves data)*

- **Hardware Heartbeat Snapshot**: The latest device-reported state for all connected modules, including component name, status, port, and any device metadata required for display or command routing.
- **Hardware Connectivity State**: The derived client-facing state that decides whether the hardware is considered connected, stale, or offline based on heartbeat freshness.
- **Hardware Command Record**: A readable command log item representing an outbound control action or workflow upload/stop request and any matched device response.
- **Skill Match Decision**: The backend’s semantic decision about whether a user request maps to an existing skill, requires missing hardware, should fall back to free chat, or should hand off to teaching.
- **Digital Twin Surface State**: The canonical, user-visible combination of modular port occupancy, built-in controls, and live preview panes shown in the digital twin window.
- **Media Preview Session**: The active preview state for microphone, speaker, or camera, including lifecycle status and any live waveform or video surface needed for user feedback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In at least 95% of observed hardware heartbeat changes, the hardware connection badge, bottom log area, and digital twin surface reflect the new state within 2 seconds of heartbeat receipt.
- **SC-002**: In at least 95% of matched-skill dialogue requests, the system routes into the correct existing-skill, missing-hardware, free-chat, or teaching branch without relying on hardcoded front-end options.
- **SC-003**: Users can complete the path from “all required nodes configured” to “workflow upload command sent” in 1 click, and can stop a running workflow in 1 click from the same surface.
- **SC-004**: Users can verify microphone, speaker, and camera control outcomes from the digital twin window without opening external debugging tools in at least 90% of manual test runs.
- **SC-005**: The digital twin window remains visible above the main desktop client for the full duration of focused testing unless the user explicitly closes or minimizes it.

## Assumptions

- The existing cloud-device control channel remains reachable from the desktop environment and continues to emit heartbeat and command-response payloads in the style shown under `docs/dev/`.
- Supported external modules for this feature are limited to `cam`, `hand`, `wifi`, `mimiclaw`, `car`, and `screen`, with only `cam`, `hand`, `car`, and `screen` requiring visible modular hardware representation.
- Microphone and speaker are treated as built-in device capabilities rather than removable external modules and therefore appear as fixed controls on the base.
- The same local skills library already used by teaching mode remains the only trusted source for existing-skill lookup in dialogue mode.
- A failed hardware preview or command response should degrade gracefully in UI and logs rather than blocking the rest of the workspace.
