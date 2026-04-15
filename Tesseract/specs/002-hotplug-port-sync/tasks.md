# Tasks: Mock 插拔端口同步与数字孪生实时挂载

**Input**: Design documents from `/specs/002-hotplug-port-sync/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

## Phase 1: Setup

- [X] T001 更新 `specs/AGENTS.md`，纳入 `002-hotplug-port-sync/`
- [X] T002 创建 `specs/002-hotplug-port-sync/AGENTS.md`、`contracts/AGENTS.md`、`checklists/AGENTS.md`

## Phase 2: Foundation

- [X] T003 扩展 `backend/src/agents/types.ts` 的 hotplug 事件协议，支持 `connectedComponents`
- [X] T004 重写 `backend/src/agents/dialogue-mode/hardware-validation.ts`，让 snapshot 事件按整份快照更新 `connectedComponents`
- [X] T005 校正 `backend/src/agents/digital-twin-scene.ts`，保证空快照时只投影底座，合法端口时稳定输出 `interface_id`

## Phase 3: User Story 1 - 正确端口挂载

- [X] T006 扩展 `aily-blockly/src/app/tools/aily-chat/services/tesseract-dialogue.models.ts` 与 `dialogue-hardware-bridge.service.ts`，让本地桥标准事件携带 `connectedComponents`
- [X] T007 调整 `aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts` 与 `tesseract-chat.service.ts`，把全量快照透传给 backend，并把 backend scene 推送到数字孪生子窗口
- [X] T008 调整 `frontend/lib/server/hardware_bridge/hardware_bridge_models.dart`，让 standalone validate-hardware 客户端也发送 `connectedComponents`

## Phase 4: User Story 2 - 拔出与回退

- [X] T009 为 backend 补充拔出、非法端口和 snapshot 回退测试
- [X] T010 为 `aily-blockly` / `frontend` 补充快照事件与默认底座的回归测试

## Phase 5: Polish

- [X] T011 更新受影响目录的 `AGENTS.md` / `CLAUDE.md`
- [X] T012 跑完 `quickstart.md` 中的自动化验收并回填本文件执行记录

## Execution Log

- 2026-04-01: `backend/src/agents/types.ts`、`hardware-validation.ts` 与 `digital-twin-scene.ts` 已改为 snapshot-first 协议；`connectedComponents` 成为 hotplug 一等字段，缺失 `portId` 的组件不会再被数字孪生假装挂到默认端口。
- 2026-04-01: `aily-blockly` 的 `DialogueHardwareBridgeService` 已能从 `device_info`/`connectedComponents` 归一化出全量组件与端口，`AilyChatComponent` 也开始消费 `snapshot` 事件触发校验，不再只认 `device_inserted/device_removed/device_error`。
- 2026-04-01: `frontend/lib/server/hardware_bridge/hardware_bridge_models.dart` 的 `toValidationJson()` 已补发全量 `connectedComponents`，避免 standalone validate-hardware 客户端再次把 snapshot 压扁。
- 2026-04-01: 自动化验收已执行并通过：
  - `cd backend && npm run build`
  - `cd backend && npx vitest run --coverage.enabled false tests/unit/agent-server/agent-service.test.ts tests/unit/agent-server/dialogue-mode-contract.test.ts`
  - `cd aily-blockly && npx tsc -p tsconfig.app.json --noEmit`
  - `cd aily-blockly && npx tsc -p tsconfig.spec.json --noEmit`
  - `cd frontend && /mnt/c/Users/sam/.codex/flutter/bin/flutter test test/hardware_bridge_service_test.dart`
- 2026-04-01: 额外 runtime smoke 尝试使用 `npx tsx -e ...` 直接跑 `DialogueHardwareBridgeService.normalizeEvent()`，但当前 WSL/root 环境对 `tsx` 的 IPC pipe 不支持，报 `listen ENOTSUP ... .pipe`；这属于工具链环境问题，不是业务代码回归。
