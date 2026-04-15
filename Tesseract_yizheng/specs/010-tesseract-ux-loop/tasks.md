# Tasks: Tesseract Client UX Loop

**Input**: Design documents from `specs/010-tesseract-ux-loop/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Tests**: No mandatory TDD tasks were requested in the specification. Validation is captured through build, analyze, and targeted regression checks in the final phase.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Lock the implementation surface and capture the current contract-driven integration points.

- [x] T001 Audit the current confirm-workflow, skill-card, config-guide, digital-twin, and window-order code paths in `backend/src/agents/dialogue-mode/`, `aily-blockly/src/app/tools/aily-chat/`, `aily-blockly/src/app/tools/skill-center/`, `aily-blockly/electron/`, and `frontend/lib/module/home/`
- [x] T002 Verify module-local validation commands and any affected ignore/config files in `backend/package.json`, `aily-blockly/package.json`, and `frontend/pubspec.yaml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared contracts needed by all stories before feature work begins.

- [x] T003 Update backend dialogue-mode skill and workflow payload shaping in `backend/src/agents/dialogue-mode/` so saved skills expose workflow binding, required hardware, and trace session metadata consistently
- [x] T004 [P] Update `aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.ts` to treat markdown summaries, diagram blocks, and config-guide cards as the canonical rendering path for workflow confirmation and configuration prompts
- [x] T005 [P] Update `aily-blockly/src/app/tools/aily-chat/services/tesseract-chat.service.ts` and related workspace sync helpers so one canonical workflow target can be published to the embedded workspace from either workflow confirmation or skill selection

**Checkpoint**: Chat response adaptation and workspace targeting semantics are ready for story implementation.

---

## Phase 3: User Story 1 - 对话构建闭环直接落到工作区 (Priority: P1) 🎯 MVP

**Goal**: Remove the extra create step, render formatted summaries and diagrams at confirmation time, and show the workflow immediately in the workspace.

**Independent Test**: Trigger a workflow build in chat, verify the summary/diagram render in chat, click `确认工作流`, and confirm the embedded workspace immediately focuses the new workflow with no extra `创建工作流` button.

### Implementation for User Story 1

- [x] T006 [P] [US1] Update workflow-confirm message generation in `backend/src/agents/dialogue-mode/` so confirmation-phase responses carry the diagram-ready summary and no longer require the legacy table output
- [x] T007 [US1] Update the workflow-ready adapter path in `aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.ts` to render markdown summary plus diagram and collapse the legacy create-workflow CTA into the confirm action
- [x] T008 [US1] Update confirm-workflow action handling in `aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts`, `aily-blockly/electron/tesseract-ipc.js`, and `aily-blockly/electron/tesseract-runtime.js` so confirmation directly creates/synchronizes the workflow target and starts config when needed
- [x] T009 [US1] Update workspace-target publication and visible state handling in `aily-blockly/src/app/tools/aily-chat/services/tesseract-chat.service.ts` and the linked project/workspace sync service files used by the chat shell

**Checkpoint**: The chat-to-workspace loop works with one confirmation click.

---

## Phase 4: User Story 2 - 对话模式按真实 Skills 与硬件状态分流 (Priority: P1)

**Goal**: Show real saved skills with live hardware readiness and branch directly to run or hot-plug/config flows.

**Independent Test**: Match a real saved skill in dialogue mode, inspect readiness badges, click the card with complete hardware and incomplete hardware, and confirm the system chooses the correct branch both times.

### Implementation for User Story 2

- [x] T010 [P] [US2] Update skill catalog projection and selection logic in `backend/src/agents/dialogue-mode/` so dialogue-mode results expose runnable skill-card metadata from saved skill records instead of mock options
- [x] T011 [US2] Update skill-card rendering and click actions in `aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts` and its dialogue-mode viewer/components under `aily-blockly/src/app/tools/aily-chat/components/`
- [x] T012 [US2] Update Studio skills library card rendering and actions in `aily-blockly/src/app/tools/skill-center/skill-center.component.ts` and related services to show name, summary, required hardware, trace action, publish action, and bound workflow availability
- [x] T013 [US2] Update live hardware readiness mapping in `frontend/lib/module/home/widget/dialogue_mode/` and `frontend/lib/module/home/widget/ai_interaction_window.dart` so the client can present runnable skills based on current heartbeats

**Checkpoint**: Real skills are discoverable and branch correctly based on hardware readiness.

---

## Phase 5: User Story 3 - 热插拔与配置步骤可在聊天中完整完成 (Priority: P1)

**Goal**: Render image-upload, single-select, multi-select, and completion prompts fully inside the chat experience.

**Independent Test**: Use a workflow requiring face-image upload and mixed config selections, complete all prompts inside chat, and confirm the flow reaches `config_complete` with a clear next action.

### Implementation for User Story 3

- [x] T014 [P] [US3] Update backend config-prompt shaping in `backend/src/agents/dialogue-mode/` and related response types so image-upload and selection prompts carry all fields needed by the UI without field-name-specific assumptions
- [x] T015 [US3] Update config-guide rendering in `aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-config-guide-viewer/` and related button/viewer components to support image upload, single-select, multi-select, and completion-state actions
- [x] T016 [US3] Reuse the face-upload workflow in `aily-blockly/src/app/tools/aily-chat/services/` by wiring the existing `/api/agent/upload-face` behavior into the chat-side image upload interaction
- [x] T017 [US3] Update Flutter interaction widgets in `frontend/lib/module/home/widget/interaction_modules/` to correctly render markdown summaries, image upload, single-select, multi-select, and completion prompts in the in-app chat surface

**Checkpoint**: Users can complete hot-plugging/configuration without leaving chat.

---

## Phase 6: User Story 4 - 桌面壳层级、命名与库卡片统一 (Priority: P2)

**Goal**: Unify branding, move the hardware status entry, keep Studio above the digital twin, and remove visual noise from redundant digital-twin refreshes.

**Independent Test**: Launch the desktop experience, confirm branding strings and hardware entry placement, open Studio and the digital twin together, and verify stable window ordering plus no steady-state flicker.

### Implementation for User Story 4

- [x] T018 [P] [US4] Update branding strings and visible labels in `aily-blockly/src/app/`, `aily-blockly/src/app/tools/aily-chat/`, and any linked Flutter home/header files under `frontend/lib/module/home/`
- [x] T019 [US4] Move the hardware connection status entry within `frontend/lib/module/home/` so it stays visible on the left-side primary surface
- [x] T020 [US4] Gate digital-twin updates on meaningful hardware changes in `frontend/lib/module/home/controller/digital_twin_console_controller.dart` and any connected hardware bridge/state files
- [x] T021 [US4] Enforce Studio-over-digital-twin ordering in `aily-blockly/electron/window.js`, `aily-blockly/src/app/services/ui.service.ts`, and any caller that opens Studio or digital twin windows

**Checkpoint**: Shell labeling, layout, and z-order behavior are consistent and stable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across stories.

- [x] T022 [P] Run backend validation in `backend/` with `npm run build`
- [x] T023 [P] Run desktop-shell validation in `aily-blockly/` with the closest available build or type-check command from `package.json`
- [x] T024 [P] Run Flutter validation in `frontend/` with `flutter analyze` — zero compile errors confirmed; pre-existing warnings only (unused fields, deprecated `withOpacity`, unreachable switch default)
- [ ] T025 Run the `specs/010-tesseract-ux-loop/quickstart.md` scenarios against the updated implementation and record any residual gaps in `specs/010-tesseract-ux-loop/tasks.md`

## Post-Acceptance Bug Fixes (found during acceptance audit)

- **fix 1** (`df5f140` + `63dd6fc`): `_buildDialogueBridgeControl()` was nested inside `_buildDialogueBridgeIndicator()` making it an invalid named function expression. Extracted to class scope.
- **fix 2** (`63dd6fc`): `_buildDialogueBridgeIndicator()` `Container` was closed prematurely with `);` before its `child:` parameter. `child: Row(...)` was dead code (Dart parsed `child:` as a label). Fixed bracketing so `child: Row(...)` is a valid Container parameter.

## Residual Items

- T025 (quickstart smoke test) requires a live running stack; must be done manually.
- Pre-existing `withOpacity` deprecation warnings and unused-element warnings are out of scope for this feature.

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 must complete before foundational edits start.
- Phase 2 blocks all user-story implementation because it defines the shared payload and workflow-target contracts.
- User Stories 1, 2, and 3 all depend on Phase 2 and can then proceed incrementally.
- User Story 4 depends on the shared contracts only where branding and workflow-target references overlap.
- Polish starts after the desired story set is complete.

### User Story Dependencies

- User Story 1 is the MVP and should land first.
- User Story 2 depends on the canonical workflow-target behavior from User Story 1.
- User Story 3 depends on the canonical response-adapter behavior from Phase 2 and may reuse workflow-target state from User Story 1.
- User Story 4 is largely independent after Phase 2, except for shared branding and chat-surface references.

### Parallel Opportunities

- T004 and T005 can proceed in parallel once backend payload expectations are known.
- T010 and T013 can proceed in parallel after the skill-record contract is stable.
- T018 and T020 can proceed in parallel because they affect different UI surfaces.
- Final validation commands T022, T023, and T024 can run independently.

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Deliver User Story 1 end to end.
3. Validate that the single-click chat-to-workspace loop works before expanding scope.

### Incremental Delivery

1. Add live-skill branching and Studio library cards.
2. Add complete hot-plug/config prompt rendering.
3. Finish shell/layout polish and digital-twin stability work.

### Notes

- Mark each completed task as `[x]` during implementation.
- Keep backend, desktop shell, and Flutter changes explicit; avoid silent cross-module coupling.
- If a task reveals a deeper protocol mismatch, update the relevant contract doc before continuing.