# Tasks: 数字孪生唯一真相源同步

**Input**: Design documents from `/specs/006-digital-twin-truth-sync/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 保留 backend 场景投影回归、AgentService 回归、`aily-blockly` TypeScript 编译、Angular 构建与 `frontend` `flutter analyze`。

## Phase 1: Setup

- [x] T001 对齐 `specs/006-digital-twin-truth-sync/` 文档集合并补齐 AGENTS 映射
- [x] T002 审计 `confirm-node -> config-state -> digitalTwinScene -> Electron broadcast` 同步链并确认最小改动文件集合

## Phase 2: Foundational

- [x] T003 在 `backend/src/agents/digital-twin-scene.ts` 收口配置态数字孪生投影，确保同一物理 category 只投影一次
- [x] T004 在 `aily-blockly/src/app/tools/aily-chat/services/tesseract-chat.service.ts` 建立 config-state read-after-write 场景优先级，避免瞬时响应 scene 误导 UI
- [x] T005 在 `aily-blockly/electron/window.js` 与 `src/app/components/float-sider/float-sider.component.ts` 收口数字孪生窗口单实例与 keep-above-main 行为

## Phase 3: User Story 1 - mock 插口后数字孪生立即对齐 (Priority: P1) 🎯 MVP

**Goal**: speaker/camera/hand 等组件在接口确认后，数字孪生立即显示到正确端口。  
**Independent Test**: 为 speaker 选择 `接口2 · 侧面B` 并确认后，数字孪生无需刷新即可挂到 `port_2`。

- [x] T006 [P] [US1] 新增 backend 场景投影回归测试 in `backend/tests/unit/agents/digital-twin-scene.test.ts`
- [x] T007 [P] [US1] 扩展服务层 config-state canonical scene 回归测试 in `aily-blockly/src/app/tools/aily-chat/services/tesseract-chat.service.spec.ts`
- [x] T008 [US1] 让 `confirm-node` 后数字孪生同步优先读取 backend `config-state` canonical scene in `aily-blockly/src/app/tools/aily-chat/services/tesseract-chat.service.ts`

## Phase 4: User Story 2 - 数字孪生、对话与 backend 服从同一真相源 (Priority: P1)

**Goal**: 数字孪生最终只服从 backend 已持久化的配置态 scene，不再被短响应或前端猜测带偏。  
**Independent Test**: 连续 mock 插入多个组件后，backend scene 与数字孪生渲染出的挂载结果一致，且重复逻辑节点不会投影出重复模型。

- [x] T009 [US2] 在 `backend/src/agents/digital-twin-scene.ts` 引入 physical mount 去重与显式接口优先策略
- [x] T010 [P] [US2] 复用 `backend/tests/unit/agent-server/agent-service.test.ts` 验证 AgentService 继续输出可消费场景
- [x] T011 [US2] 在 `backend/src/agents/CLAUDE.md` 与 `backend/src/agent-server/AGENTS.md` 固化 canonical scene 法则

## Phase 5: User Story 3 - 数字孪生窗口始终处于客户端顶部 (Priority: P2)

**Goal**: 数字孪生窗口作为主窗口业务子窗口复用，并始终位于主客户端之上。  
**Independent Test**: 打开数字孪生窗口后点击主客户端，数字孪生仍保持在主客户端之上；重复打开入口只复用同一窗口。

- [x] T012 [US3] 扩展 `WindowOpts` 并在数字孪生入口声明 `keepAboveMain/windowRole` in `aily-blockly/src/app/services/ui.service.ts`, `aily-blockly/src/app/components/float-sider/float-sider.component.ts`
- [x] T013 [US3] 调整 `aily-blockly/electron/window.js`，让数字孪生窗口以带父窗口的业务子窗口创建、复用和 lift
- [x] T014 [US3] 更新相关 AGENTS 映射 in `aily-blockly/electron/AGENTS.md`, `aily-blockly/src/app/components/float-sider/AGENTS.md`, `aily-blockly/src/app/services/AGENTS.md`

## Final Phase: Polish & Validation

- [x] T015 运行 `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend && npx vitest run --coverage.enabled false tests/unit/agents/digital-twin-scene.test.ts tests/unit/agent-server/agent-service.test.ts`
- [x] T016 运行 `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npx tsc -p tsconfig.app.json --noEmit`
- [x] T017 运行 `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npx tsc -p tsconfig.spec.json --noEmit`
- [x] T018 运行 `node --check /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/electron/window.js`

## Phase 6: User Story 4 - embedded frontend 真正消费 canonical scene (Priority: P1)

**Goal**: 冷启动或重开数字孪生窗口时，embedded Flutter 页面不会吞掉 scene，也不会把已挂载状态覆盖回底座。  
**Independent Test**: 打开数字孪生窗口后立刻为 speaker 选择 `接口2 · 侧面B` 并确认，嵌入页无需刷新即可挂到 `port_2`。

- [x] T019 [P] [US4] 在 `aily-blockly/src/app/windows/iframe/iframe.component.ts` 为数字孪生 scene 广播补齐 child-ready payload 归一化、latest scene replay 与跨运行时安全消息格式
- [x] T020 [P] [US4] 在 `frontend/lib/module/home/home_workspace_page.dart` 建立 JS->Dart 消息深度归一化、ready-handshake 与 latest inbound scene replay
- [x] T021 [P] [US4] 在 `frontend/lib/module/home/home_workspace_page.dart` 保证嵌套 `scene` 也能跨运行时被解析，而不是在 JS object / Dart Map 边界静默丢失
- [x] T022 [US4] 在 `frontend/lib/module/home/AGENTS.md` 与 `aily-blockly/src/app/windows/iframe/AGENTS.md` 固化 embedded consume/replay 法则

## Phase 7: User Story 5 - fallback 与诊断断点可信 (Priority: P2)

**Goal**: scene 缺失、冷启动重放或消费失败时，系统显式 fallback 到底座并留下可读诊断，而不是静默保留旧残影。  
**Independent Test**: 关闭数字孪生窗口后重新打开，再确认组件端口；日志里能区分 ready、replay、consume 与 fallback。

- [x] T023 [US5] 在 `frontend/lib/module/home/home_workspace_page.dart` 显式记录 fallback/replay 断点，避免本地资产加载覆盖 canonical scene
- [x] T024 [US5] 在 `aily-blockly/src/app/windows/iframe/iframe.component.ts` 为 ready/replay/scene push 增加最小诊断日志

## Final Phase: Validation Refresh

- [x] T025 运行 `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npx tsc -p tsconfig.app.json --noEmit`
- [x] T026 运行 `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npx tsc -p tsconfig.spec.json --noEmit`
- [x] T027 运行 `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npx ng build --configuration development`
- [x] T028 运行 `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend && flutter analyze lib/module/home/home_workspace_page.dart lib/module/home/controller/digital_twin_console_controller.dart lib/module/login/ui/splash_page.dart`

## Dependencies

- Phase 1 -> Phase 2 -> US1 -> US2 -> US3 -> Validation
- US2 依赖 US1 已建立 canonical scene 读取链
- US3 可在 US1/US2 核心真相源稳定后独立落地

## Parallel Examples

- T006 与 T007 可并行
- T010 与文档同步任务可并行
- Validation 中的 backend 测试与 Electron `node --check` 可并行
- T019 与 T020/T021 可并行；T023/T024 可在功能落地后并行补齐

## Implementation Strategy

- 先消灭“物理硬件被多个逻辑节点重复投影”的根因
- 再让 renderer 服从 backend `config-state` 读后校验结果
- 最后把数字孪生窗口收成受控子窗口，消除层级碰运气
- 新一轮补刀聚焦 embedded frontend：先修复跨运行时消息归一化，再补 ready/replay/fallback 断点，最后做 Flutter + Angular 联合验证
