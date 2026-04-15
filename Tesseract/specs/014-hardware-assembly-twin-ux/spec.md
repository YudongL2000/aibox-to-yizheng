# Feature Specification: 硬件组装数字孪生 UX 重设计

**Feature Branch**: `014-hardware-assembly-twin-ux`  
**Created**: 2026-04-07  
**Status**: Draft  
**Input**: User description: "将对话模式中 hot_plugging 节点从内联聊天卡片移入数字孪生窗口，以「开始组装硬件」按钮隔开软件配置与硬件组装两阶段，心跳全部就绪后自动回到聊天完成闭环。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 软硬件配置两阶段清晰分离 (Priority: P1)

作为正在通过对话模式配置工作流的用户，我希望所有软件参数（TTS 声音、屏幕表情、人脸图片等）在聊天窗口内连续完成后，硬件连接步骤以独立的「开始组装硬件」按钮触发，而不是继续在聊天里弹出一张张硬件卡片。

**Why this priority**: 将软件配置与硬件组装混合在同一个静态聊天流中会让用户不清楚应该先操作软件还是先插拔硬件，两阶段分离是整个 UX 重设计的核心前提。

**Independent Test**: 发起一次包含 2 项软件配置节点 + 1 项 hot_plugging 节点的工作流配置，观察聊天中软件配置卡片正常显示并可提交，hot_plugging 响应不再显示「标记节点已处理」按钮，而是显示「开始组装硬件」按钮。

**Acceptance Scenarios**:

1. **Given** 工作流含有 config_input/select_single/image_upload 节点，**When** backend 依次返回这些节点，**Then** 聊天中渲染对应 aily-config-guide 卡片，用户可正常提交每個节点。
2. **Given** 所有软件配置节点提交完毕，**When** backend 返回 hot_plugging 类型响应，**Then** 聊天中渲染该节点的 aily-config-guide 上下文卡片，同时在其下方显示「开始组装硬件」主按钮，不再显示「标记节点已处理」按钮。
3. **Given** 聊天中出现多个 hot_plugging 节点，**When** 每个节点依次需要确认，**Then** 每个节点响应均独立显示「开始组装硬件」按钮，携带该节点的 componentId 与 nodeName。

---

### User Story 2 - 数字孪生组装检测台开启与自动完成 (Priority: P1)

作为需要插拔真实硬件的用户，我希望点击「开始组装硬件」后打开数字孪生窗口作为组装向导，当我把所有所需硬件接上并经心跳确认后，系统自动关闭组装窗口并回到聊天继续后续流程。

**Why this priority**: 让硬件组装在专用的全屏视觉化空间完成，是避免「心跳在静态聊天卡片里自动推进失败」根因的关键，同时提供更直观的组装引导。

**Independent Test**: 在硬件未连接时点击「开始组装硬件」，确认数字孪生窗口以 windowRole=digital-twin-assembly 打开，组件清单通过 postMessage 传入；连接指定硬件后，确认心跳到达、数字孪生窗口自动关闭，聊天中出现「所有硬件组件已就位」状态消息。

**Acceptance Scenarios**:

1. **Given** 用户点击「开始组装硬件」按钮，**When** 按钮 action=tesseract-start-hardware-assembly 被触发，**Then** `UiService.openWindow` 以 `windowRole: 'digital-twin-assembly'` 打开数字孪生 iframe，并附带 components 清单。
2. **Given** 数字孪生组装窗口已打开，**When** `DialogueHardwareBridgeService.state$` 检测到所有必需 componentId 均出现在 connected components 中，**Then** 自动调用 `electronAPI.window.closeByRole('digital-twin-assembly')` 关闭窗口。
3. **Given** 所有硬件检测完毕，**When** 系统自动触发节点确认，**Then** backend 返回下一步响应（config_complete 或下一个 hot_plugging 节点），聊天中渲染对应内容。
4. **Given** 组装监听激活中，**When** 用户手动关闭应用或切换会话，**Then** assemblyMonitorSubscription 被正确 unsubscribe，不产生内存泄漏。

---

### User Story 3 - 硬件确认后无缝衔接工作流完成动作 (Priority: P2)

作为完成了全部配置的用户，我希望硬件检测完成后单次调用 confirmNode 并正确渲染 backend 返回的后续状态（可能是下一个 hot_plugging，也可能是 config_complete），体验上与手动点击「标记节点已处理」后的流程完全一致，包括「下发工作流」「打开工作流」按钮和 Skills 存库提示。

**Why this priority**: 新的组装路径只是入口不同，后续闭环必须复用现有 confirmNode → applyDialogueResponseSideEffects → replaceLastAilyMessage 逻辑，确保不破坏已验证的完整流程。

**Independent Test**: 完成硬件组装自动确认后，聊天中必须出现与手动「标记节点已处理」相同的后续内容（config_complete 时显示「下发工作流」等操作按钮），且 Skills 存库提示在条件满足时正常显示。

**Acceptance Scenarios**:

1. **Given** 组装完成自动调用 confirmNode，**When** backend 返回 config_complete，**Then** 聊天中显示「下发工作流」「打开工作流」等动作按钮，与手动确认路径渲染一致。
2. **Given** 组装完成自动调用 confirmNode，**When** backend 返回另一个 hot_plugging 节点，**Then** 聊天中再次显示该节点的「开始组装硬件」按钮，用户可再次进入组装流程。
3. **Given** confirmNode 调用失败，**When** catch 捕获异常，**Then** 聊天中显示 aily-state error 块，assemblyPhase 重置为 idle，不挂起 isWaiting 状态。

---

### Edge Cases

- 如果 hot_plugging 响应中没有 currentNode.name，extractHotplugRequirements 应回落到 category map 或 fallback 名称，不返回空数组。
- 如果 `electronAPI.window.closeByRole` 不存在（Web 环境），关闭操作静默跳过，不抛出错误。
- 如果用户在组装监听期间点击了另一个「开始组装硬件」按钮（重入），先 unsubscribe 旧订阅再开始新的。
- assemblyMonitorSubscription 必须在 ngOnDestroy 中清理。

## Requirements *(mandatory)*

### Functional Requirements

1. **RF-01**: `hot_plugging` 响应从 adapter 输出「开始组装硬件」`aily-button`，payload 包含 `sessionId`、`components`（从 `extractHotplugRequirements` 提取）、`nodeName`。
2. **RF-02**: `AilyChatComponent` 新增 `dialogueAssemblyPhase`、`dialoguePendingComponents`、`assemblyMonitorSubscription` 状态字段。
3. **RF-03**: `runTesseractAction` 中 `tesseract-start-hardware-assembly` 动作提前返回，调用 `startHardwareAssembly(data)`，不经过 isWaiting/[thinking...] 流程。
4. **RF-04**: `startHardwareAssembly` 打开数字孪生窗口（windowRole=digital-twin-assembly），订阅 bridgeService.state$，检测 components 完成后调用 `confirmHotplugNodeAndContinue`。
5. **RF-05**: `confirmHotplugNodeAndContinue` 复用 `tesseractChatService.confirmNode` + `applyDialogueResponseSideEffects` + `replaceLastAilyMessage` 闭环，完成后重置 assemblyPhase。
6. **RF-06**: `ngOnDestroy` 清理 `assemblyMonitorSubscription`。

### Non-Functional Requirements

- 改动不影响 `select_single`、`select_multi`、`image_upload`、`config_input`、`guidance` 等其他配置类型的渲染行为。
- `buildConfigButtons` 保持不变，但在 `hot_plugging` 路径中不再被调用。
- 代码量增量尽量小，不引入新服务或新 Angular 模块依赖。
