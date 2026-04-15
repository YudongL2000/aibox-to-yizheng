# Feature Specification: 硬件组装清单三联修

**Feature Branch**: `017-hardware-assembly-list-fix`  
**Created**: 2026-04-07  
**Status**: Accepted

## User Scenarios & Testing

### User Story 1 – 摄像头实时出现在组装清单 (Priority: P1)

MQTT 心跳以字符串 `"devices":"cam1"` 或逗号分隔串 `"cam1,car1"` 发来，组装清单面板立即显示已接入。

**Why this priority**: 核心可见性 Bug，设备已连接但 UI 显示"待接入"，严重影响用户信任。

**Independent Test**: 向 bridge 注入 `{"type":"heartbeat","devices":"cam1"}`，`state$` 应含 camera 组件为 connected。

**Acceptance Scenarios**:
1. **Given** `devices:"cam1"`（字符串），**When** readConnectedComponents，**Then** camera 出现在列表
2. **Given** `devices:"cam1,car1"`，**When** 处理，**Then** camera + chassis 两个组件
3. **Given** `devices:["cam1"]`（数组），**When** 处理，**Then** 原有数组路径仍正常

---

### User Story 2 – 清单展示所有硬件组件 (Priority: P1)

含 CAM + SPEAKER 的工作流，组装清单同时显示摄像头和扬声器。

**Why this priority**: 功能性 Bug：清单不完整迫使用户多次重新组装。

**Independent Test**: hot_plugging 响应 `metadata.allHardwareComponents` 包含工作流全部硬件组件。

**Acceptance Scenarios**:
1. **Given** 工作流含 CAM + SPEAKER，**When** buildCurrentNodeResponse，**Then** `allHardwareComponents` = [{camera},{speaker}]
2. **Given** adapter 读取该响应，**When** extractHotplugRequirements，**Then** 返回两个组件

---

### User Story 3 – 软件配置在前，硬件组装在后 (Priority: P2)

TTS、FACE-NET 等软件节点先完成，之后统一进入硬件组装阶段。

**Acceptance Scenarios**:
1. **Given** 工作流节点顺序 CAM → TTS，**When** extractConfigurableNodes，**Then** 顺序变为 TTS → CAM

---

### User Story 4 – 一次组装完成后自动确认全部硬件节点 (Priority: P2)

Flutter 组装完成后，系统自动 confirm 所有剩余硬件节点，无需逐一点击。

**Acceptance Scenarios**:
1. **Given** allPendingHardwareNodeNames = ['cam_node','speaker_node']，**When** confirmHotplugNodeAndContinue，**Then** confirmNode 被调用两次
2. **Given** 某节点 confirm 失败，**Then** 静默跳过继续

---

### Edge Cases
- `devices` 为空字符串 → 不产生任何组件
- `allPendingHardwareNodeNames` 为空 → 不触发自动确认
- 工作流仅含软件节点 → `allHardwareComponents=[]`，不影响原有流程

## Requirements

### Functional Requirements

- **FR-001**: `readConnectedComponents` MUST 支持 `devices` 字符串与逗号分隔格式
- **FR-002**: `buildCurrentNodeResponse` 的 hot_plugging metadata MUST 包含 `allHardwareComponents` + `allPendingHardwareNodeNames`
- **FR-003**: `extractHotplugRequirements` MUST 优先读取 `metadata.allHardwareComponents`
- **FR-004**: `extractConfigurableNodes` MUST 输出软件节点在前、硬件节点在后
- **FR-005**: `confirmHotplugNodeAndContinue` MUST 自动依次确认 `allPendingHardwareNodeNames` 中的所有节点
- **FR-006**: Flutter MUST 存储并回传 `allPendingHardwareNodeNames`
- **FR-007**: `startAssemblyBridgeRelay` MUST 在 postMessage 中透传 `allPendingHardwareNodeNames`

## Success Criteria

- **SC-001**: 连接摄像头后组装清单≤2秒内更新状态
- **SC-002**: 含多硬件工作流的清单显示所有组件，零遗漏
- **SC-003**: 软件配置节点始终出现在硬件节点之前
- **SC-004**: 完成硬件组装后无需额外操作即推进到 config_complete

## Acceptance Result

- 2026-04-07 验收完成：修复 `config-agent.ts` 的 TypeScript 类型错误后，backend 与 aily-blockly 关键改动文件静态检查均为 0 错误。
- FR-001 至 FR-007 已在实现中逐项落地：devices 字符串解析、全硬件清单透传、软件优先排序、批量确认链路、Flutter 回传均已接通。
- 同日追加运行态修复：`DialogueHardwareBridgeService` 现同时支持 JSON `devices`、plain-text `devices=cam1,hand1`、以及 JSON `message` 包裹日志文本三种 heartbeat 形态，避免现场日志格式导致清单长期停留在 `0/N`。
- 残余风险：当前轮次未在本环境执行真机端到端回放，运行态仍建议用真实 heartbeat 再做一次冒烟确认。
