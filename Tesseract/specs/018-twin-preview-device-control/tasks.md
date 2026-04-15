# Tasks: 018-twin-preview-device-control

**Input**: Design documents from `/specs/018-twin-preview-device-control/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1=摄像头P2P预览, US2=麦克风/扬声器控制, US3=预览状态注入, US4=工作流下发, US5=按钮反馈

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 确认已有后端端点可用，建立 IPC 通道补全

- [x] T001 验证后端 MQTT 设备控制端点可用 ✅ 端点已存在于 server.ts + agent-service.ts + mqtt-hardware-runtime.ts
- [x] T002 [P] IPC 方法已存在于 preload.js (hardwareMicrophoneOpen/Close, hardwareSpeakerPlay)
- [x] T003 [P] IPC handler 已存在于 tesseract-ipc.js (lines 44-55)
- [x] T004 [P] HTTP 调用已存在于 tesseract-runtime.js (openMicrophone/closeMicrophone/playSpeaker lines 500-525)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: iframe.component 中建立心跳→预览状态转换管道

**⚠️ CRITICAL**: 此阶段完成后 US1-US3 可并行

- [x] T005 `startPreviewStateRelay()` 实现完成：combineLatest 订阅 + postMessage 注入
- [x] T006 `mapDevicesToPreviewSessions()` 实现完成：mic/speaker/camera 三类设备映射
- [x] T007 viewer-ready handler 已调用 `startPreviewStateRelay()`（两处：数字孪生 ready + 默认 ready）

**Checkpoint**: Flutter 面板收到预览状态注入，不再显示"等待 preview/runtime state 注入"

---

## Phase 3: User Story 3 - 预览状态注入 (Priority: P1) 🎯 MVP

**Goal**: 数字孪生窗口左侧面板根据 MQTT 心跳自动填充设备会话卡片

**Independent Test**: 打开数字孪生窗口，MQTT 心跳中有 camera/audio 设备时，面板自动出现对应卡片

### Implementation for US3

- [x] T008 [US3] camera 映射完成：`sessionId: 'camera-preview', kind: 'camera', streamUrl: device.devicePath`
- [x] T009 [P] [US3] mic 映射完成：`sessionId: 'mic-preview', kind: 'microphone', active: isActive`
- [x] T010 [P] [US3] speaker 映射完成：`sessionId: 'speaker-preview', kind: 'speaker', active: isActive`
- [x] T011 [US3] postMessage 发送完成：session + control 对象联合构造，设备不在线时 enabled=false
- [x] T012 [US3] `resetFrameLoadingState()` 已调用 `stopPreviewStateRelay()`

**Checkpoint**: 面板显示三张设备卡片，状态根据心跳实时更新

---

## Phase 4: User Story 1 - 摄像头 P2P 预览 (Priority: P1)

**Goal**: Camera P2P 卡片自动连接 WebRTC 流并展示实时画面

**Independent Test**: 心跳中 camera 设备有 streamUrl 时，Camera P2P 卡片从 "等待 streamUrl" 变为显示视频

### Implementation for US1

- [x] T013 [US1] camera streamUrl 从 `device.devicePath` 提取，格式通过心跳动态传入
- [x] T014 [US1] Flutter `DigitalTwinCameraPreviewFrame` 已确认在 streamUrl 非空时自动 `_postConfigure()`
- [x] T015 [US1] Flutter 回传的 `tesseract-digital-twin-preview-session` 已在 forwardDigitalTwinPreviewState 中处理

**Checkpoint**: 摄像头在线时左侧面板显示实时视频

---

## Phase 5: User Story 2 - 麦克风/扬声器控制 (Priority: P1)

**Goal**: 用户通过顶栏按钮控制端侧音频设备

**Independent Test**: 点击麦克风按钮后端侧收到 MQTT 命令，波形卡片变为 LIVE

### Implementation for US2

- [x] T016 [US2] `handleDeviceControlFromTwin()` 实现完成：解析 control/action 字段
- [x] T017 [US2] microphone 分支完成：hardwareMicrophoneOpen/Close + promise 结果日志
- [x] T018 [P] [US2] speaker 分支完成：hardwareSpeakerPlay + hardwareCommand stop
- [x] T019 [US2] 命令结果通过心跳 relay 自动反映，无需手动发送（combineLatest 持续订阅）
- [x] T020 [US2] 消息处理分支已添加：top-control + control 类型都路由到 handleDeviceControlFromTwin

**Checkpoint**: 麦克风/扬声器可通过顶栏按钮远程控制

---

## Phase 6: User Story 4 - 工作流下发 (Priority: P2)

**Goal**: 复用已有的 MQTT 工作流下发通道

**Independent Test**: 触发 `tesseract-upload-to-hardware` action，验证 MQTT 消息送达

### Implementation for US4

- [x] T021 [US4] 组装清单面板已改为直接暴露“下发工作流/停止工作流”按钮，动作通过 postMessage → iframe → Electron IPC 执行
- [x] T022 [US4] iframe 已实现 `tesseract-assembly-workflow-action` 处理：upload/stop 直接调用 IPC，并把 assembly complete 静默同步回聊天会话

**Checkpoint**: 组装完成→无需返回对话窗口即可直接执行工作流下发/停止

---

## Phase 7: User Story 5 - 按钮交互反馈 (Priority: P2)

**Goal**: 控制按钮根据设备在线状态切换可用性，操作有加载反馈

**Independent Test**: 设备离线时按钮灰色不可用，点击后出现短暂加载态

### Implementation for US5

- [x] T023 [US5] 防抖完成：`DEVICE_CONTROL_DEBOUNCE_MS = 300`，基于 `deviceControlLastAction` Map
- [ ] T024 [US5] loading 状态反馈：命令发送前后 push control.loading 到 Flutter（暂不实现，心跳 relay 已覆盖）
- [x] T025 [US5] 设备不在心跳中时，control `enabled: false` 已在 mapDevicesToPreviewSessions 底部实现

**Checkpoint**: 按钮有完整的交互反馈循环

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: 清理、文档、诊断

- [x] T026 诊断日志已添加：`[IframeComponent][Preview]` + `[IframeComponent][DeviceControl]` 前缀
- [ ] T027 更新 aily-blockly/src/app/windows/iframe/AGENTS.md 文档
- [ ] T028 更新 specs/AGENTS.md，添加 018 特性条目

---

## Dependencies

```
Phase 1 (T001-T004) → Phase 2 (T005-T007)
                          ↓
              ┌───────────┼───────────┐
              ↓           ↓           ↓
         Phase 3      Phase 4      Phase 5
         (US3)        (US1)        (US2)
              ↓           ↓           ↓
              └───────────┼───────────┘
                          ↓
                    Phase 6 (US4)
                          ↓
                    Phase 7 (US5)
                          ↓
                    Phase 8 (Polish)
```

## Parallel Execution Opportunities

- T002, T003, T004 可完全并行（不同文件）
- T008, T009, T010 可完全并行（同函数内不同设备类型映射）
- T013 与 T016 可并行（US1 和 US2 独立）
- T017, T018 可并行（不同 action 分支）

## Implementation Strategy

**MVP**: Phase 1 + Phase 2 + Phase 3（预览状态注入）——解决"等待 preview/runtime state 注入"的核心痛点  
**Increment 1**: Phase 4（摄像头 P2P）——最具视觉冲击力的功能  
**Increment 2**: Phase 5（音频控制）——完成设备操控闭环  
**Full Feature**: Phase 6-8（工作流复用 + 交互打磨）
