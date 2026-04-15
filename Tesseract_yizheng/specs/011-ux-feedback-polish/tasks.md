# Tasks: UX Feedback Polish

**Input**: Design documents from `/specs/011-ux-feedback-polish/`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅

**Tests**: No TDD — fixes are targeted and verifiable by manual acceptance scenarios.

**Organization**: Tasks grouped by user story (5 stories from spec.md), in priority order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new project structure needed — all changes are in-place edits to existing files.

- [ ] T001 Audit `backend/src/agents/orchestrator.ts` to pinpoint exact lines where `state.missingFields` is read AND written across loop iterations (prerequisite for T002)
- [ ] T002 Audit `aily-blockly/src/app/tools/aily-chat/services/chat-history.service.ts` to understand current `SessionData` shape and persistence mechanism (prerequisite for T008)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Two foundational reads that unblock US1 + US2 implementation.

**⚠️ CRITICAL**: T001 must complete before T003; T002 must complete before T008.

**Checkpoint**: Both audits complete → US1 and US2 implementation can begin in parallel.

---

## Phase 3: User Story 2 — 后端澄清引擎修复 (Priority: P1) 🎯

**Goal**: ReflectionEngine correctly exits clarification loop when LLM returns `direct_accept`.

**Independent Test**: Submit a complete hardware workflow description in teaching mode; confirm system enters `summary_ready` phase in ONE round-trip, no repeated clarification questions.

- [x] T003 [US2] In `backend/src/agents/orchestrator.ts`: after reflection call returns `direct_accept`, explicitly set `state.missingFields = []` and `state.canProceed = true` before the next loop gate check (use line audit from T001 to find exact insertion point)
- [x] T004 [US2] In `backend/src/agents/orchestrator.ts`: guard the clarification dispatch block with `reflection.decision !== 'direct_accept'` to prevent clarification messages being sent on direct_accept turns
- [x] T005 [P] [US2] Verify `backend/src/agents/reflection-engine.ts` lines 196-205: confirm `missing_info` is `[]` when `decision === 'direct_accept'` — add inline comment if correct, fix if not
- [x] T006 [US2] Build backend: run `cd backend && npm run build` and confirm no TypeScript errors
- [ ] T007 [US2] Manual acceptance test: start agent server (`npm run agent:dev`), submit "我想控制一个舵机在检测到人脸时旋转90度" — verify single-pass to summary_ready in backend log, 0 clarification turns

---

## Phase 4: User Story 1 — 会话隔离 + 技能卡片置顶 (Priority: P1)

**Goal**: Teaching and dialogue modes have independent chat histories; dialogue mode shows skills at top on entry.

**Independent Test**: Complete a teaching-mode workflow build, switch to dialogue mode → chat history is EMPTY (0 teaching messages); skills library cards appear above the chat input area.

- [x] T008 [US1] In `aily-blockly/src/app/tools/aily-chat/services/chat-history.service.ts`: extend `SessionData` storage to maintain two separate buckets — `teaching` and `dialogue` — each with their own `chatList` and `conversationMessages` arrays; add `switchMode(mode: TesseractDialogueMode): void` method that saves current bucket and loads (or initializes) the target bucket
- [x] T009 [US1] In `aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts`: call `chatHistoryService.switchMode(mode)` inside `setTesseractInteractionMode()` after mode change; ensure `chatList` and `conversationMessages` refs are updated from the new bucket
- [x] T010 [P] [US1] In `aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts`: add `dialogueSkills: SkillRecord[]` property; on mode switch to `'dialogue'`, load skills from `SkillCenterService` (or local JSON); on mode switch away from dialogue, clear the property
- [x] T011 [US1] In `aily-blockly/src/app/tools/aily-chat/aily-chat.component.html`: add a `@if (tesseractInteractionMode === 'dialogue')` section ABOVE the message list that renders `dialogueSkills` as a horizontal scrollable card strip; each card shows skill name, description, and hardware-ready indicator; clicking calls `triggerSkill(skill)`
- [x] T012 [P] [US1] In `aily-blockly/src/app/tools/aily-chat/aily-chat.component.scss`: add `.dialogue-skills-strip` styles — horizontal flex, scrollable, card min-width 160px, purple border accent matching existing `--panel-accent: #b15cff` variable
- [ ] T013 [US1] Manual acceptance test: open aily-blockly in Electron, run a teaching-mode session, switch to dialogue mode → confirm (a) empty chat history, (b) skills strip visible at top with at least one skill card (if any exist in library)

---

## Phase 5: User Story 3 — 流程图渲染修复 + 需求总结阶段提前出图 (Priority: P1)

**Goal**: Mermaid diagrams render without `No diagram type detected` error; a preliminary flowchart appears at `summary_ready` stage.

**Independent Test**: Submit a workflow request; at needs-summary stage see a (possibly simplified) flowchart rendered without error; after workflow generation see the final diagram.

- [x] T014 [US3] Locate the mermaid rendering component that calls `mermaid.render(id, content)` in `aily-blockly/src/app/tools/aily-chat/components/` — confirm it passes `parsedData.code` (the plain mermaid string) not `JSON.stringify(parsedData)` to mermaid; if it passes the raw JSON string, fix to extract `.code` before render call
- [x] T015 [US3] In `aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.ts`: add `blueprintToMermaid(blueprint: WorkflowBlueprint): string` function that generates a linear `flowchart LR` diagram from `blueprint.components[]` — one node per component in sequence order
- [x] T016 [US3] In `aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.ts`: in the `summary_ready` case block, add a `block('aily-mermaid', { code: blueprintToMermaid(response.blueprint) })` call so a preliminary diagram appears alongside the summary message
- [ ] T017 [P] [US3] Verify `x-dialog.component.ts` `normalizeAilyMermaid()` handles the `blueprintToMermaid` output correctly (plain string wrapped into `{"code": "..."}` for renderer) — no change needed if existing normalization handles it
- [ ] T018 [US3] Manual acceptance: submit workflow request, confirm (a) at summary_ready stage a flowchart appears with component nodes, (b) no `No diagram type detected` error, (c) after workflow_ready a fuller/final diagram appears

---

## Phase 6: User Story 4 — 热插拔去除 Mock UI (Priority: P2)

**Goal**: Hot-plug step shows real MQTT-driven hardware presence status, no mock simulation text.

**Independent Test**: Enter hot-plug step in aily-blockly; confirm NO "模拟把当前硬件插入" text visible; connect real hardware → step auto-advances.

- [x] T019 [US4] In `aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-config-guide-viewer/x-aily-config-guide-viewer.component.ts` (or matching `.html`): delete the `@if (isPortGuide)` block that renders `<p class="desc desc--muted">请在下方按钮区域选择一个接口，模拟把当前硬件插入对应位置。</p>` and any associated mock option buttons
- [x] T020 [US4] In the same component: inject the hardware bridge observable (MQTT heartbeat stream, already used elsewhere in the codebase); subscribe to `HardwarePresenceEvent` and expose `detectedComponents: HardwareComponent[]` to the template
- [x] T021 [P] [US4] In `x-aily-config-guide-viewer.component.html`: replace the deleted mock block with a real status list showing `@for (comp of requiredComponents) { <div [class.ready]="isComponentDetected(comp)">... }` — green check when component appears in heartbeat, grey circle when not yet detected
- [x] T022 [US4] Add timeout logic: if all required components not detected within 30 seconds, emit a `hotplugTimeout` event that the parent component handles to show retry/skip guidance
- [ ] T023 [US4] Manual acceptance: open hot-plug step in aily-blockly, confirm no mock text; connect hardware device → component status updates within 5 seconds

---

## Phase 7: User Story 5 — 桌面端视觉与品牌统一 (Priority: P2)

**Goal**: All user-visible text uses "Tesseract"/"Tess"; hardware status in correct position; window sizes correct; cards purple.

**Independent Test**: Visual walkthrough: (a) window titles = "Tesseract", (b) 我的本地库 modal ~75% size, (c) hardware status top-left, (d) all cards purple-themed.

- [x] T024 [P] [US5] In `aily-blockly/src/app/editors/blockly-editor/blockly-editor.component.ts`: replace `'aily blockly'` and `'aily blockly - {name}'` window title strings with `'Tesseract'` and `'Tesseract - {name}'`
- [x] T025 [P] [US5] In `aily-blockly/src/app/editors/code-editor/code-editor.component.ts`: replace `'aily blockly'` window title strings with `'Tesseract'`
- [x] T026 [P] [US5] In `aily-blockly/src/app/pages/playground/playground.component.ts`: replace `'aily blockly - Playground'` with `'Tesseract - Playground'`
- [x] T027 [P] [US5] In `aily-blockly/src/app/services/project.service.ts`: replace default project `name: 'aily blockly'` with `name: 'Tesseract Project'`
- [x] T028 [P] [US5] Search `aily-blockly/src/` for the AI chat role display name `'aily'`; replace with `'Tess'` (likely in `aily-chat.component.ts` or a constants file)
- [x] T029 [US5] In `aily-blockly/src/app/main-window/components/header/header.component.ts` (line ~382) AND `aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts` (line ~1347): change `nzWidth: 'min(1720px, calc(100vw - 112px))'` → `'min(1290px, calc(100vw - 112px))'`
- [x] T030 [P] [US5] In `aily-blockly/src/app/tools/skill-center/skill-center.component.scss` (line ~17): change `min-height: min(860px, calc(100vh - 96px))` → `min-height: min(645px, calc(100vh - 96px))`
- [x] T031 [P] [US5] Audit hardware status widget position: search `aily-blockly/src/` for the hardware connection status component (likely in `header.component.ts/html` or a sidebar component); if it is NOT already at top-left of main nav, move it to the left nav bar top position with appropriate CSS
- [x] T031A [P] [US5] In `aily-blockly/src/app/windows/iframe/iframe.component.{ts,html,scss}`: add digital-twin-specific skeleton loading before first scene heartbeat and keep overlay windows above the digital twin view
- [x] T032 [P] [US5] Audit chat render card background color: search `aily-blockly/src/app/tools/aily-chat/` SCSS files for any `#f5f0`, `#faf7`, `cream`, `beige`, `#fff`, `#fffde` or similar warm/light background colors; replace with the existing `rgba(20, 20, 28, 0.98)` dark-purple base or `rgba(138, 80, 255, 0.18)` purple-accent background matching the skill-card style
- [ ] T033 [US5] Visual acceptance: launch Electron app, confirm (a) window titles say "Tesseract", (b) AI role shows "Tess" in chat, (c) 我的本地库 modal is visually smaller, (d) hardware status visible in nav top area

---

## Phase 8: Polish & Cross-Cutting

- [x] T034 Run `cd backend && npm run build` — confirm 0 TypeScript errors after all backend changes
- [x] T035 Run `cd aily-blockly && npm run build` (or `ng build`) — confirm 0 TypeScript/Angular errors after all frontend changes
- [x] T036 Git commit backend changes: `fix(agent): trust direct_accept and remove mock hotplug copy` (`9a38e85`)
- [x] T037 Git commit aily-blockly changes: `feat(aily-chat): polish dialogue feedback flow` (`41b43589`)
- [x] T038 Update `specs/011-ux-feedback-polish/tasks.md` with implementation status and commit hashes (root spec/docs commit is the commit carrying this record)

---

## Dependencies

```
T001 → T003 → T004 → T006 → T007
T002 → T008 → T009 → T010 → T011 → T013
T014 → T015 → T016 → T018
T019 → T020 → T021 → T022 → T023
T024..T033 (all parallelizable within phase 7)
T034 → T036
T035 → T037
T036, T037 → T038
```

## Parallel Execution

**US2 + US1 can run in parallel** (different repo modules: backend vs aily-blockly frontend).  
**US3** depends on US2 backend being stable (same codebase) — run after T006.  
**US4 + US5** are fully parallel to each other and to US1 (different component files).  
**Within US5**: T024–T032 are all parallelizable (different files).

## Implementation Strategy

**MVP**: Complete US2 (backend bug fix) first — it's a backend-only fix that unblocks all teaching mode flows and is easiest to verify in isolation.  
**Increment 2**: US1 (session isolation) + US3 (diagram fix) together — both come alive in the same Electron session test.  
**Increment 3**: US4 (hotplug) + US5 (visual) — polish layer, safe to batch.
