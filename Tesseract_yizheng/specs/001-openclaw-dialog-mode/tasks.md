# Tasks: OpenClaw 对话模式

**Input**: Design documents from `/specs/001-openclaw-dialog-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included, because `quickstart.md` explicitly defines recommended backend/frontend automation slices for the three branches.

**Organization**: Tasks are grouped by user story to enable independent implementation and validation of branch A / B / C.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`US1`, `US2`, `US3`)
- Every task includes exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Carve clean implementation seams before touching the existing fat widgets and agent service.

- [X] T001 [P] Create backend dialogue-mode module map in `backend/src/agents/dialogue-mode/AGENTS.md`
- [X] T002 [P] Create frontend dialogue-mode UI module map in `frontend/lib/module/home/widget/dialogue_mode/AGENTS.md`
- [X] T003 [P] Create frontend hardware bridge module map in `frontend/lib/server/hardware_bridge/AGENTS.md`
- [X] T004 [P] Add local bridge configuration entry points in `frontend/lib/server/hardware_bridge/hardware_bridge_config.dart`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared state, protocol, and adapter layers that every branch depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Extend dialogue-mode response/session types in `backend/src/agents/types.ts` and `backend/src/agents/session-service.ts`
- [X] T006 [P] Implement dialogue-mode branch evaluator in `backend/src/agents/dialogue-mode/dialogue_mode_evaluator.ts`
- [X] T007 [P] Implement hardware requirement validation helpers in `backend/src/agents/dialogue-mode/hardware_validation.ts`
- [X] T008 Wire shared dialogue-mode orchestration into `backend/src/agent-server/agent-service.ts`
- [X] T009 Expose shared dialogue-mode HTTP contract in `backend/src/agent-server/server.ts`
- [X] T010 [P] Parse `dialogueMode` envelope in `frontend/lib/server/api/agent_chat_api.dart`
- [X] T011 [P] Add dialogue validation/deploy API clients in `frontend/lib/server/api/agent_validate_hardware_api.dart` and `frontend/lib/server/api/agent_start_deploy_api.dart`
- [X] T012 [P] Implement normalized hardware bridge models in `frontend/lib/server/hardware_bridge/hardware_bridge_models.dart`
- [X] T013 [P] Implement MiniClaw WebSocket adapter in `frontend/lib/server/hardware_bridge/miniclaw_ws_bridge.dart`
- [X] T014 [P] Wrap existing MQTT events behind the new adapter contract in `frontend/lib/server/hardware_bridge/mqtt_hardware_bridge.dart`
- [X] T015 Implement unified hardware bridge facade in `frontend/lib/server/hardware_bridge/hardware_bridge_service.dart`
- [X] T016 Implement dialogue-mode state reducer/models in `frontend/lib/module/home/widget/dialogue_mode/dialogue_mode_state.dart` and `frontend/lib/module/home/widget/dialogue_mode/dialogue_mode_models.dart`

**Checkpoint**: Shared backend envelope, local hardware bridge, and frontend state model are ready; user stories can now be built independently.

---

## Phase 3: User Story 1 - 已就绪技能的即时开玩 (Priority: P1) 🎯 MVP

**Goal**: When a known skill is matched and all required hardware is ready, the AI should respond playfully, trigger the init physical cue, and enter interaction without any deploy click.

**Independent Test**: In dialogue mode, say `跟我玩石头剪刀布` with camera + mechanical hand ready; verify playful guidance, auto init motion, no `开始部署` button, and no teaching redirect.

### Tests for User Story 1

- [X] T017 [P] [US1] Add backend branch-A coverage in `backend/tests/unit/agent-server/dialogue-mode-instant-play.test.ts`
- [X] T018 [P] [US1] Add Flutter instant-play widget coverage in `frontend/test/dialogue_mode_instant_play_test.dart`

### Implementation for User Story 1

- [X] T019 [US1] Generate `instant_play/interacting` responses in `backend/src/agents/dialogue-mode/dialogue_mode_evaluator.ts` and `backend/src/agent-server/agent-service.ts`
- [X] T020 [US1] Render dialogue-mode toggle, skill readiness cards, and branch-A copy in `frontend/lib/module/home/widget/ai_interaction_window.dart` and `frontend/lib/module/home/widget/dialogue_mode/dialogue_mode_card.dart`
- [X] T021 [US1] Dispatch auto init physical cues from backend payloads in `frontend/lib/module/home/widget/ai_interaction_window.dart` and `frontend/lib/server/hardware_bridge/hardware_bridge_service.dart`

**Checkpoint**: User Story 1 is independently functional and can serve as the MVP demo.

---

## Phase 4: User Story 2 - 缺件时的协作引导 (Priority: P2)

**Goal**: When the skill exists but hardware is missing, the UI should guide insertion, show instant validation loading, wait for backend confirmation, then expose one `开始部署` action and wake the hardware on click.

**Independent Test**: Start with camera ready and mechanical hand missing; say `跟我玩石头剪刀布`, plug the missing device, observe loading within 1 second, receive ready confirmation, then click `开始部署` and enter interaction.

### Tests for User Story 2

- [X] T022 [P] [US2] Add backend hardware-guidance flow coverage in `backend/tests/integration/agent/dialogue-mode-hardware-guidance.test.ts`
- [X] T023 [P] [US2] Add Flutter insert/loading/deploy coverage in `frontend/test/dialogue_mode_hardware_guidance_test.dart`

### Implementation for User Story 2

- [X] T024 [US2] Implement `waiting_for_insert` / `validating_insert` / `ready_to_deploy` transitions in `backend/src/agents/dialogue-mode/hardware_validation.ts` and `backend/src/agents/dialogue-mode/dialogue_mode_evaluator.ts`
- [X] T025 [US2] Add `POST /api/agent/dialogue/validate-hardware` and `POST /api/agent/dialogue/start-deploy` in `backend/src/agent-server/server.ts` and `backend/src/agent-server/agent-service.ts`
- [X] T026 [US2] Feed local insert/remove events into validation loading in `frontend/lib/module/home/widget/ai_interaction_window.dart` and `frontend/lib/server/hardware_bridge/hardware_bridge_service.dart`
- [X] T027 [US2] Render `开始部署` CTA and validation failure recovery in `frontend/lib/module/home/widget/ai_interaction_window.dart` and `frontend/lib/module/home/widget/dialogue_mode/dialogue_mode_card.dart`
- [X] T028 [US2] Apply plug/deploy state changes to the digital twin surface in `frontend/lib/module/home/home_workspace_page.dart` and `frontend/lib/module/home/widget/ai_interaction_window.dart`
- [X] T029 [US2] Dispatch wake cues on deploy confirmation in `frontend/lib/server/hardware_bridge/hardware_bridge_service.dart` and `frontend/lib/module/home/widget/ai_interaction_window.dart`

**Checkpoint**: User Story 2 is independently functional, including insertion guidance, loading, deploy confirmation, and failure recovery.

---

## Phase 5: User Story 3 - 未知技能的教学接力 (Priority: P3)

**Goal**: When a requested skill is not in the catalog, the AI should invite teaching mode, expose one `开启教学模式` action, and carry the original goal into the teaching flow without re-entry.

**Independent Test**: In dialogue mode, say `帮我给花浇水`; verify the learning invitation, click `开启教学模式`, and confirm the teaching workspace receives `学习给花浇水` as the prefilled goal.

### Tests for User Story 3

- [X] T030 [P] [US3] Add backend teaching-handoff coverage in `backend/tests/unit/agent-server/dialogue-mode-teaching-handoff.test.ts`
- [X] T031 [P] [US3] Add Flutter teaching-handoff widget coverage in `frontend/test/dialogue_mode_teaching_handoff_test.dart`

### Implementation for User Story 3

- [X] T032 [US3] Generate `teaching_handoff/handoff_ready` payloads in `backend/src/agents/dialogue-mode/dialogue_mode_evaluator.ts` and `backend/src/agent-server/agent-service.ts`
- [X] T033 [US3] Render `开启教学模式` action and preserve original goal in `frontend/lib/module/home/widget/ai_interaction_window.dart` and `frontend/lib/module/home/widget/dialogue_mode/dialogue_mode_card.dart`
- [X] T034 [US3] Route the handoff into the teaching workspace in `frontend/lib/module/home/home_main_page.dart` and `frontend/lib/module/home/home_workspace_page.dart`

**Checkpoint**: User Story 3 is independently functional and preserves user intent across the dialogue-to-teaching transition.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish the integration cleanly, remove duplicated truth sources, and validate the full quickstart flow.

- [X] T035 [P] Remove duplicated local branch inference from `frontend/lib/module/home/widget/ai_interaction_window.dart` and `backend/src/agent-server/agent-service.ts`
- [X] T036 [P] Update affected module maps in `backend/src/agent-server/CLAUDE.md`, `frontend/lib/module/home/widget/AGENTS.md`, and `frontend/lib/server/AGENTS.md`
- [X] T037 [P] Add regression coverage for bridge normalization in `frontend/test/hardware_bridge_service_test.dart` and `backend/tests/unit/agent-server/dialogue-mode-contract.test.ts`
- [X] T038 Run the end-to-end checklist from `specs/001-openclaw-dialog-mode/quickstart.md` and record any deviations in `specs/001-openclaw-dialog-mode/tasks.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies; can start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user story work.
- **Phase 3 (US1)**: Depends on Phase 2; delivers the MVP.
- **Phase 4 (US2)**: Depends on Phase 2; can proceed after foundation even if US1 is merely demo-complete.
- **Phase 5 (US3)**: Depends on Phase 2; can proceed independently of US1/US2 once the shared envelope is stable.
- **Phase 6 (Polish)**: Depends on the user stories selected for this release.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories after foundation.
- **US2 (P2)**: Depends on the shared dialogue envelope and bridge layer from Phase 2, but not on US1 feature code.
- **US3 (P3)**: Depends on the shared dialogue envelope from Phase 2, but not on US1/US2 branch logic.

### Within Each User Story

- Tests first, then branch-specific backend logic, then frontend rendering/integration.
- Backend response generation must land before frontend consumes the new fields.
- Hardware bridge dispatch must land before deploy or init cue behaviors are considered complete.

### Parallel Opportunities

- Phase 1 tasks T001-T004 can run in parallel.
- In Phase 2, T006-T014 are parallelizable across backend/frontend split files.
- After Phase 2, US1/US2/US3 can be staffed in parallel.
- Widget tests and backend tests within each story can run in parallel.

---

## Parallel Example: User Story 2

```bash
# Backend and Flutter tests for hardware guidance can run together:
Task: "Add backend hardware-guidance flow coverage in backend/tests/integration/agent/dialogue-mode-hardware-guidance.test.ts"
Task: "Add Flutter insert/loading/deploy coverage in frontend/test/dialogue_mode_hardware_guidance_test.dart"

# Bridge adapters can also be built in parallel before facade wiring:
Task: "Implement MiniClaw WebSocket adapter in frontend/lib/server/hardware_bridge/miniclaw_ws_bridge.dart"
Task: "Wrap existing MQTT events behind the new adapter contract in frontend/lib/server/hardware_bridge/mqtt_hardware_bridge.dart"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. Validate the branch-A quickstart path.
4. Demo the “说一句就直接开玩” path before expanding to insertion guidance.

### Incremental Delivery

1. Foundation: response envelope + bridge abstraction + dialogue state reducer
2. US1: direct play for known-ready skills
3. US2: missing hardware guidance and deploy confirmation
4. US3: teaching handoff for unknown skills
5. Polish: remove duplicate inference and run the full quickstart

### Parallel Team Strategy

1. One engineer on backend envelope/state transitions
2. One engineer on frontend dialogue state/rendering
3. One engineer on local hardware bridge adapters
4. Rejoin at Phase 6 for full quickstart validation

---

## Notes

- Every task is path-specific so an implementation agent can execute it without guessing.
- The cleanest architecture is a state machine with one backend truth source; avoid scattering more booleans through `ai_interaction_window.dart`.
- `T038` should append brief validation notes directly into this file so the task list becomes an execution log during implementation.

## Execution Log

- 2026-04-01: `T006` / `T019` / `T024` / `T032` 的“evaluator”职责实际收敛到了 `backend/src/agents/dialogue-mode/dialogue-mode-service.ts` 与 `backend/src/agents/dialogue-mode/hardware-validation.ts`，没有再额外造一个 `dialogue_mode_evaluator.ts`。这样少一层转手，状态机不会分裂成两份真相源。
- 2026-04-01: `T017` / `T022` / `T030` 的 backend 覆盖没有拆成三个独立文件，而是落在 `backend/tests/unit/agent-server/agent-service.test.ts`、`backend/tests/unit/agent-server/dialogue-mode-contract.test.ts` 与 `backend/tests/integration/agent/agent-api.test.ts`。路径和计划略有不同，但三个分支与 HTTP contract 都已被锁住。
- 2026-04-01: 前端承载面在这轮后续实现中从 Flutter `frontend/` 纠偏收口到 `aily-blockly/src/app/tools/aily-chat/`。transport 仍复用 Electron + backend 契约，但 teaching/dialogue 子模式 UI、硬件桥订阅与 CTA 动作闭环改由 `AilyChatComponent` 负责，避免 renderer 再出现双前端真相源。
- 2026-04-01: `T038` 自动化验收已执行：
  - `cd backend && npm run build`
  - `cd backend && npx vitest run --coverage.enabled false tests/unit/agent-server/agent-service.test.ts tests/unit/agent-server/dialogue-mode-contract.test.ts tests/unit/agent-server/http-server.test.ts tests/integration/agent/agent-api.test.ts`
  - `cd frontend && /mnt/c/Users/sam/.codex/flutter/bin/flutter analyze --no-fatal-warnings --no-fatal-infos lib/module/home/home_main_page.dart lib/module/login/ui/splash_page.dart lib/module/home/home_workspace_page.dart lib/module/home/widget/ai_interaction_window.dart lib/module/home/widget/dialogue_mode lib/server/hardware_bridge lib/server/api/agent_chat_api.dart lib/server/api/agent_start_deploy_api.dart lib/server/api/agent_validate_hardware_api.dart test/hardware_bridge_service_test.dart`
  - `cd frontend && /mnt/c/Users/sam/.codex/flutter/bin/flutter test test/hardware_bridge_service_test.dart test/dialogue_mode_instant_play_test.dart test/dialogue_mode_hardware_guidance_test.dart test/dialogue_mode_teaching_handoff_test.dart`
- 2026-04-01: 偏差记录：本次验收走的是 backend/Flutter 自动化切片，没有在这轮执行里直接连真实 `ws://192.168.1.150:18789/` 做 Mimiclaw 实机冒烟；该外部链路目前由 `hardware_bridge_service_test.dart` 的归一化与 physical cue 分发回归覆盖。
