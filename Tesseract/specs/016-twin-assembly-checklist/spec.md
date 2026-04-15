# Feature Specification: 数字孪生组装检测台

**Feature Branch**: `016-twin-assembly-checklist`  
**Created**: 2026-04-07  
**Status**: Accepted  
**Input**: User description: "将拼装外设组件检测从对话窗口移至数字孪生前端，在数字孪生窗口右侧以 list 方式呈现本次工作流需要的组件，基于心跳自动更新组件检测状态与打勾"

## Acceptance Status

- 状态: 已验收
- 验收日期: 2026-04-07
- 验收结论: 已修复当前 Flutter 编译阻塞项；Flutter 清单面板、aily-blockly iframe 中继、对话闭环回调三段链路在代码中均已落地，关键文件静态错误为 0。

## User Scenarios & Testing

### User Story 1 - 数字孪生窗口展示组装清单 (Priority: P1)

用户点击对话窗口中的「开始组装硬件」按钮后，数字孪生窗口打开。窗口右侧显示一个组件清单面板，列出本次工作流所需的全部硬件组件（如摄像头、底盘等），每个组件初始状态为"待接入"。

**Why this priority**: 这是整个功能的核心交付——用户能在数字孪生界面中直观看到需要拼装什么、当前缺什么。

**Independent Test**: 从 aily-blockly 发送一条包含组件列表的 postMessage 到 Flutter 数字孪生窗口，验证右侧面板出现对应数量的清单项，每项显示组件名称和"待接入"状态。

**Acceptance Scenarios**:

1. **Given** 数字孪生窗口已就绪，**When** 收到包含 3 个组件需求的 postMessage，**Then** 右侧面板显示 3 行清单项，每项包含组件图标、名称和未勾选状态。
2. **Given** 组件清单已显示，**When** 需求列表为空，**Then** 面板显示"无需硬件组装"提示，不显示空列表。
3. **Given** 数字孪生窗口尚未收到组件需求，**When** 窗口首次加载，**Then** 右侧面板不显示，保持纯数字孪生画布。

---

### User Story 2 - 心跳驱动组件检测状态实时更新 (Priority: P1)

当用户物理连接硬件组件后，MQTT 心跳通过 aily-blockly 桥接层更新硬件状态，状态变更通过 postMessage 同步到数字孪生窗口，清单中对应组件自动勾选并显示"已接入"。

**Why this priority**: 实时反馈是本功能的核心价值——用户无需回到对话窗口即可确认拼装进度。

**Independent Test**: 在 Flutter 数字孪生窗口已显示清单状态下，通过 postMessage 发送一条硬件状态更新（如摄像头已连接），验证摄像头清单项自动切换为勾选态。

**Acceptance Scenarios**:

1. **Given** 清单中"摄像头"显示为未勾选，**When** 收到硬件桥状态更新包含 `componentId: 'camera'`，**Then** 摄像头项自动变为勾选态并显示"已接入"。
2. **Given** 全部 3 个组件已勾选，**When** 其中一个组件断开连接，**Then** 该组件项恢复为未勾选态并显示"待接入"。
3. **Given** 清单中有 alias 映射的组件（如 `cam1` 对应 `camera`），**When** 收到 `componentId: 'cam1'` 的状态更新，**Then** 摄像头项正确匹配并勾选。

---

### User Story 3 - 全部组件就绪后自动通知闭环 (Priority: P2)

当清单中所有组件都被检测为已接入时，数字孪生窗口自动向 aily-blockly 父窗口发送完成通知，aily-blockly 收到后关闭数字孪生窗口并在对话中推进后续流程。

**Why this priority**: 这是闭环的最后一步，依赖 P1 的清单和检测功能先完成。

**Independent Test**: 在 Flutter 数字孪生窗口中模拟所有组件勾选完成，验证窗口向父级发送完成消息，并验证 aily-blockly 收到后关闭窗口。

**Acceptance Scenarios**:

1. **Given** 清单有 2 个组件且均已勾选，**When** 最后一个组件状态变为已接入，**Then** 窗口自动延迟 1 秒后向父级发送完成通知，包含 sessionId 和 nodeName。
2. **Given** 完成消息已发送，**When** aily-blockly 收到消息，**Then** 数字孪生窗口关闭，对话窗口推进后续流程。
3. **Given** 组件全部就绪后又断开一个，**When** 断开发生在完成消息发送前的延迟窗口内，**Then** 取消发送完成消息。

---

### Edge Cases

- 数字孪生窗口在组装过程中被用户手动关闭：对话窗口不阻塞，用户可重新点击「开始组装硬件」重新打开。
- 心跳推送频率过高：状态更新应节流处理，避免 UI 频繁重绘。
- 组件 ID 不匹配任何需求项：忽略未知组件，不影响已有清单的显示。

## Requirements

### Functional Requirements

- **FR-001**: 数字孪生窗口必须能接收来自父窗口的组件需求列表（通过 postMessage），并在右侧渲染组装清单面板。
- **FR-002**: 每个清单项必须展示组件名称与当前状态（待接入 / 已接入）。
- **FR-003**: 数字孪生窗口必须能接收来自父窗口的硬件桥状态更新（通过 postMessage），并实时更新清单项的勾选状态。
- **FR-004**: 组件匹配必须支持 alias 映射（如 `cam1` → `camera`，`car1` → `chassis`），与 aily-blockly 侧的 alias 逻辑保持一致。
- **FR-005**: 当所有必需组件检测为已接入时，数字孪生窗口必须自动向父窗口发送完成通知。
- **FR-006**: aily-blockly 侧必须将组件需求列表和硬件桥状态变更通过 postMessage 转发到数字孪生 iframe。
- **FR-007**: aily-blockly 侧必须监听数字孪生 iframe 发回的完成通知，并触发确认闭环。

### Key Entities

- **AssemblyRequirement**: 单个需要拼装的组件描述，包含 componentId、displayName、是否已检测到。
- **AssemblyState**: 组装清单的聚合状态，包含需求列表、已检测组件列表、是否全部就绪。

## Success Criteria

### Measurable Outcomes

- **SC-001**: 用户从点击「开始组装硬件」到看到数字孪生窗口中的组件清单，耗时不超过 3 秒。
- **SC-002**: 硬件组件物理接入后，数字孪生清单中对应项的状态更新延迟不超过 2 个心跳周期。
- **SC-003**: 全部组件就绪后，对话流程自动推进到下一步，无需用户手动操作。
- **SC-004**: 组装过程中数字孪生 3D 画布保持正常渲染，清单面板不遮挡核心模型视图。

## Assumptions

- 数字孪生窗口以 Flutter Web 嵌入 Electron iframe 的形式加载，postMessage 桥接层已可用。
- 硬件桥状态已在 aily-blockly 侧通过 `DialogueHardwareBridgeService.state$` 可观测。
- 心跳频率约为 5 秒一次，足以保证实时性。
- `aily-blockly` 已能通过 `uiService.openWindow` 打开数字孪生窗口（014 已实现）。
- 组件 alias 映射逻辑已在 aily-blockly 侧实现（015 已实现）。

## Acceptance Result

1. 已确认 Flutter 侧存在独立的组装清单面板与别名匹配逻辑，满足右侧 list 展示与基于硬件状态自动打勾的核心要求。
2. 已确认 aily-blockly `iframe.component.ts` 负责向 Flutter 转发 `tesseract-assembly-requirements` 与 `tesseract-assembly-hardware-state`，并接收 `tesseract-assembly-complete` 反向通知。
3. 已确认 `aily-chat.component.ts` 在收到数字孪生完成事件后执行关窗与后续确认闭环，组装检测职责已从对话窗口迁出。
4. 已修复 Flutter 编译错误：`const EdgeInsets.fromLTRB(...)` 中使用运行时条件导致的 “Not a constant expression”。
5. 已执行编辑器静态错误检查，以下关键文件均为 0 errors：`home_workspace_page.dart`、`assembly_checklist_panel.dart`、`iframe.component.ts`、`aily-chat.component.ts`。
