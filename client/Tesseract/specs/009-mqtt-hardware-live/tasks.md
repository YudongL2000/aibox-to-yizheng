# Tasks: MQTT Hardware Live Integration

**Input**: Design documents from `/specs/009-mqtt-hardware-live/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 本 feature 明确要求验证真实运行链，因此保留关键后端、桌面端和 Flutter 侧测试任务。

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立 feature 文档壳与共享依赖

- [ ] T001 更新 [specs/AGENTS.md](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/AGENTS.md) 并补齐 `specs/009-mqtt-hardware-live/*/AGENTS.md`
- [ ] T002 在 [backend/package.json](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend/package.json) 声明 MQTT 直连依赖并校对忽略/锁文件

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 建立唯一硬件真相源与跨端 scene/log 协议

- [ ] T003 新增 backend MQTT runtime store 与解析器，落在 `backend/src/services/` 与 `backend/src/utils/` 下的新增模块
- [ ] T004 [P] 扩展 [backend/src/agents/types.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend/src/agents/types.ts) 定义 heartbeat/command/runtime/preview 的 canonical 类型
- [ ] T005 扩展 [backend/src/agent-server/agent-service.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend/src/agent-server/agent-service.ts) 与 [backend/src/agent-server/server.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend/src/agent-server/server.ts) 暴露 hardware runtime、command、scene 与 preview 入口
- [ ] T006 [P] 扩展 [backend/src/agents/digital-twin-scene.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend/src/agents/digital-twin-scene.ts) 支持真实 5 口映射、内置 mic/speaker 顶部控制和 model-less 组件
- [ ] T007 在 [aily-blockly/electron/tesseract-runtime.js](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/electron/tesseract-runtime.js)、[aily-blockly/electron/tesseract-ipc.js](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/electron/tesseract-ipc.js)、[aily-blockly/electron/preload.js](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/electron/preload.js) 增加 hardware runtime/command/preview IPC 桥
- [ ] T008 [P] 扩展 [frontend/lib/module/home/home_workspace_page.dart](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/lib/module/home/home_workspace_page.dart) 与 `viewer.js` 的 scene envelope 协议，加入 preview/control 元数据

**Checkpoint**: MQTT heartbeat、command log、canonical scene 与 preview contract 已成为三端共享基础设施

---

## Phase 3: User Story 1 - 实时硬件连接与数字孪生同步 (Priority: P1) 🎯 MVP

**Goal**: 用真实 heartbeat 驱动顶部状态、底部日志与数字孪生挂载

**Independent Test**: 启动系统后接收 heartbeat，不触发 workflow upload 或 camera preview，也能验证状态框、日志、数字孪生挂载一致更新

### Tests for User Story 1

- [ ] T009 [P] [US1] 为 backend heartbeat 解析与 runtime store 新增单元测试，落在 `backend/tests/unit/services/` 与 `backend/tests/unit/agent-server/`
- [ ] T010 [P] [US1] 为 `aily-blockly` hardware runtime stream 与日志同步新增测试，落在 `aily-blockly/src/app/tools/aily-chat/services/` 与 `aily-blockly/src/app/tools/log/`
- [ ] T011 [P] [US1] 为 Flutter 数字孪生 5 口映射与 scene 消费新增测试，落在 `frontend/test/`

### Implementation for User Story 1

- [ ] T012 [US1] 实现 backend heartbeat MQTT client、topic 订阅与 readable log record，落在新增 `backend/src/services/cloud-mqtt-client.ts`
- [ ] T013 [US1] 实现 backend runtime store 与 port/component 归一化，落在新增 `backend/src/services/hardware-runtime-store.ts`
- [ ] T014 [US1] 将 heartbeat runtime 接入 [backend/src/agent-server/agent-service.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend/src/agent-server/agent-service.ts)、[backend/src/agents/dialogue-mode/hardware-validation.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend/src/agents/dialogue-mode/hardware-validation.ts) 与 [backend/src/agents/digital-twin-scene.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend/src/agents/digital-twin-scene.ts)
- [ ] T015 [US1] 在 [aily-blockly/src/app/main-window/components/header/header.component.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/main-window/components/header/header.component.ts) 与对应 html/scss 中加入硬件连接状态框
- [ ] T016 [US1] 在 [aily-blockly/src/app/tools/log/log.component.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/log/log.component.ts) 与相关日志服务中持续显示 heartbeat 与 command log
- [ ] T017 [US1] 在 [aily-blockly/src/app/windows/iframe/iframe.component.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/windows/iframe/iframe.component.ts) 与 [aily-blockly/electron/window.js](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/electron/window.js) 中广播 canonical scene 到数字孪生窗口
- [ ] T018 [US1] 调整 [frontend/lib/module/home/home_workspace_page.dart](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/lib/module/home/home_workspace_page.dart)、[frontend/lib/module/home/controller/digital_twin_console_controller.dart](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/lib/module/home/controller/digital_twin_console_controller.dart) 与 [frontend/web/model_viewer/viewer.js](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/web/model_viewer/viewer.js) 以渲染真实 5 口和 model-less 组件策略

**Checkpoint**: Heartbeat 到来后，状态框、底部日志和数字孪生 5 口挂载在 2 秒内一致更新

---

## Phase 4: User Story 2 - 完成配置后下发与控制真实硬件 (Priority: P1)

**Goal**: 用真实 MQTT command 替代 mock 部署与内置 mic/speaker 控制

**Independent Test**: 达到“所有节点配置完毕”后可独立验证 upload/stop/mic/speaker 指令和反馈，不依赖 camera preview

### Tests for User Story 2

- [ ] T019 [P] [US2] 为 backend command dispatcher 与 request/ack 匹配新增测试，落在 `backend/tests/unit/services/` 与 `backend/tests/integration/agent/`
- [ ] T020 [P] [US2] 为 `aily-blockly` upload/stop 与 mic/speaker 控制新增测试，落在 `aily-blockly/src/app/tools/aily-chat/services/` 与相关组件 spec
- [ ] T021 [P] [US2] 为 Flutter preview pane 与控制按钮新增测试，落在 `frontend/test/`

### Implementation for User Story 2

- [ ] T022 [US2] 在新增 `backend/src/services/hardware-command-dispatcher.ts` 中实现 workflow upload/stop 与 mic/speaker command 发送
- [ ] T023 [US2] 在 [backend/src/agent-server/server.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend/src/agent-server/server.ts) 与 [backend/src/agent-server/agent-service.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend/src/agent-server/agent-service.ts) 暴露 upload/stop/control API
- [ ] T024 [US2] 在 [aily-blockly/src/app/tools/aily-chat/services/tesseract-chat.service.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/services/tesseract-chat.service.ts) 和 [aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts) 中接入 “上传到硬件/停止工作流” 动作
- [ ] T025 [US2] 在 [frontend/lib/module/home/home_workspace_page.dart](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/lib/module/home/home_workspace_page.dart) 与 [frontend/lib/module/home/widget/model_3d_viewer.dart](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/lib/module/home/widget/model_3d_viewer.dart) 中加入顶部 mic/speaker 按钮与左侧 preview pane
- [ ] T026 [US2] 在 [frontend/web/model_viewer/viewer.js](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/web/model_viewer/viewer.js) 与相应 Dart 状态文件中实现波形活动反馈

**Checkpoint**: 用户可在同一工作台里上传/停止工作流，并从数字孪生顶部控制 mic/speaker 且看到运行反馈

---

## Phase 5: User Story 3 - 对话模式真实技能分流 (Priority: P2)

**Goal**: 对话模式去掉硬编码与 mock 技能卡，基于 skills 库 + heartbeat 走分支 A/B/C

**Independent Test**: 预置技能后，可独立验证已有技能+硬件齐全/缺失，以及未知技能三条路径

### Tests for User Story 3

- [ ] T027 [P] [US3] 为 backend dialogue semantic routing + runtime hardware gating 新增测试，落在 `backend/tests/unit/agents/dialogue-mode/` 与 `backend/tests/integration/agent/`
- [ ] T028 [P] [US3] 为 `aily-blockly` dialogue viewer/adapter 去 mock 化新增测试，落在 `aily-blockly/src/app/tools/aily-chat/components/` 与 `services/`

### Implementation for User Story 3

- [ ] T029 [US3] 调整 [backend/src/agents/dialogue-mode/dialogue-mode-service.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend/src/agents/dialogue-mode/dialogue-mode-service.ts)、[backend/src/agents/dialogue-mode/dialogue-mode-router.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend/src/agents/dialogue-mode/dialogue-mode-router.ts) 与 [backend/src/agents/dialogue-mode/skill-library-repository.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend/src/agents/dialogue-mode/skill-library-repository.ts) 使用真实 runtime store 决策 A/B/C/free chat
- [ ] T030 [US3] 移除 [aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-dialogue-mode-viewer/x-aily-dialogue-mode-viewer.component.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-dialogue-mode-viewer/x-aily-dialogue-mode-viewer.component.ts) 与 [aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.ts) 中的 mock skills 选项与 mock 插拔引导
- [ ] T031 [US3] 在 [aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts) 中把分支 B 统一接到真实 heartbeat 等待逻辑，并在 ready 后显示 upload/deploy 控制

**Checkpoint**: 对话模式命中技能后只由 backend skills + runtime heartbeat 决策分支，不再出现硬编码 skill/mock 插拔 UI

---

## Phase 6: User Story 4 - 数字孪生媒体预览 (Priority: P2)

**Goal**: 通过 camera model 点击与内置 control 打开真实预览面板

**Independent Test**: 点击 camera/mic/speaker 控制后，能在左侧 pane 中看到 connecting/active/failed 的明确状态

### Tests for User Story 4

- [ ] T032 [P] [US4] 为 camera preview session 与 p2p bridge 新增测试，落在 `frontend/test/` 与 `aily-blockly` 相关服务 spec

### Implementation for User Story 4

- [ ] T033 [US4] 基于 [docs/dev/p2p_example.html](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/docs/dev/p2p_example.html) 与 [docs/dev/ZLMRTCClient.js](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/docs/dev/ZLMRTCClient.js) 新增 frontend camera preview bridge 资产与封装
- [ ] T034 [US4] 在 [frontend/lib/module/home/home_workspace_page.dart](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/lib/module/home/home_workspace_page.dart) 与相应 widget 中加入 camera preview pane、状态文案与失败恢复
- [ ] T035 [US4] 在 [aily-blockly/src/app/windows/iframe/iframe.component.ts](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/windows/iframe/iframe.component.ts) 与 Electron 桥中加入 preview lifecycle 日志与 control relay

**Checkpoint**: 用户可以直接从数字孪生点击 camera/mic/speaker 看到对应 preview pane 与状态

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T036 [P] 回填 `tasks.md` 执行状态与 `specs/009-mqtt-hardware-live/*` 文档
- [ ] T037 [P] 更新 `backend`、`aily-blockly`、`frontend` 相关目录 `AGENTS.md`
- [ ] T038 运行 quickstart 联调脚本并补充失败路径日志
- [ ] T039 清理残留 mock hotplug/skill UI 与过时说明文档

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 → Phase 2 → User Story phases → Polish
- US1 是所有后续故事的基础，因为 heartbeat runtime store 与 canonical scene 必须先成立
- US2/US3 依赖 US1
- US4 依赖 US1 与 US2 中的 preview/control 基础设施

### User Story Dependencies

- **US1 (P1)**: 无其他 story 依赖，是本 feature MVP
- **US2 (P1)**: 依赖 heartbeat/runtime/log/scene 基础设施
- **US3 (P2)**: 依赖 skills 库现有能力 + US1 runtime store
- **US4 (P2)**: 依赖 US1 canonical scene 与 US2 control command 基础设施

### Parallel Opportunities

- Phase 2 中的类型、scene、IPC 可并行
- US1 的 backend tests / desktop tests / Flutter tests 可并行
- US2 与 US3 在 US1 完成后可并行
- US4 的 frontend preview UI 与 Electron relay 可并行

## Implementation Strategy

### MVP First

1. 完成 Phase 1-2
2. 完成 US1，先让 heartbeat → 状态框/日志/数字孪生闭环跑通
3. 再叠加 US2 的 upload/stop/mic/speaker
4. 再做 US3 的 dialogue routing 去 mock 化
5. 最后补 US4 camera preview

### Incremental Delivery

1. Heartbeat visible everywhere
2. Real commands replace mock deployment
3. Dialogue trusts real skills + real hardware
4. Media preview completes the twin
