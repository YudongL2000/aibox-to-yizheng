# Tasks: 020-workflow-gen-resilience

**Input**: Design documents from `/specs/020-workflow-gen-resilience/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type extensions and session state scaffolding

- [x] T001 [P] [US1] Extend `AgentResponse` type — add optional `suggestions: string[]` field in `backend/src/types.ts` (or wherever AgentResponse is defined)
- [x] T002 [P] [US1] Add `confirmFailureCount` to session state in `backend/src/agents/session-service.ts` — add getter/setter/incrementer

**Checkpoint**: Type system updated, session tracking ready

---

## Phase 2: User Story 1 - Backend Graceful Composition Failure (Priority: P1) 🎯 MVP

**Goal**: confirm pipeline never returns HTTP 500 — all failures become structured AgentResponse

**Independent Test**: Kill LLM endpoint, click confirm → backend returns HTTP 200 + AgentResponse with Chinese message

### Implementation for User Story 1

- [x] T003 [US1] Add `buildCompositionFailureResponse()` to `backend/src/agents/orchestrator/response-builder.ts` — accepts error, attemptCount, suggestions array; returns `AgentResponse` type `guidance` with Chinese failure message and suggestions
- [x] T004 [US1] Wrap `orchestrator.confirm()` pipeline in try-catch in `backend/src/agents/orchestrator.ts` — catch block calls `buildCompositionFailureResponse()`, increments `confirmFailureCount`, returns structured response
- [x] T005 [US1] Fix `agent-service.ts confirm()` — change catch block from re-throw to return structured `AgentResponse` wrapped in `{ sessionId, response }` shape
- [x] T006 [US1] Fix `server.ts /api/agent/confirm` handler — on catch, build a fallback `AgentResponse` type `error` and return HTTP 200, reserve 500 only for serialization crash
- [x] T007 [US1] Add escalating suggestions logic — when `confirmFailureCount >= 3`, include "请尝试简化需求" in suggestions
- [x] T008 [P] [US1] Unit test: `backend/tests/unit/agents/response-builder.test.ts` (merged into existing test file) — test confirm with mocked LLM timeout → verify returns `AgentResponse` not throw; test 3rd failure includes degradation suggestion
- [x] T009 [P] [US1] Unit test: extend `backend/tests/unit/agents/response-builder.test.ts` — test `buildCompositionFailureResponse()` output format

**Checkpoint**: Backend never throws from confirm pipeline, always returns structured response

---

## Phase 3: User Story 2 - Frontend Error Recovery Card (Priority: P2)

**Goal**: Frontend renders confirm failures as actionable error cards with retry/refine buttons

**Independent Test**: Inject `composition_failed` response → verify error card renders with buttons

### Implementation for User Story 2

- [x] T010 [US2] Update `aily-blockly/src/app/tools/aily-chat/services/tesseract-chat.service.ts` — in confirm flow, handle response by `type` field; on IPC-level AbortError, synthesize client-side error AgentResponse
- [ ] T011 [US2] ~~Update viewer component~~ — SKIPPED: existing adapter already renders `guidance` type as config-guide block and `error` type as error state block. Guard in aily-chat.component.ts (T011→moved to deploy guard) handles the UX flow. — detect confirm-failure guidance responses (has `suggestions` field), render error card with "重试构建" and "优化需求描述" buttons
- [ ] T012 [US2] ~~Add~~ — SKIPPED: backend guidance response already includes `showConfirmBuildButton: true` for retry "优化需求描述" button handler — dispatch event to return session to chat mode, set input placeholder to hint
- [ ] T013 [P] [US2] DEFERRED: Update adapter spec: `aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.spec.ts` — test composition_failed response is adapted correctly
- [ ] T014 [P] [US2] DEFERRED: Update viewer spec: `aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-config-guide-viewer/x-aily-config-guide-viewer.component.spec.ts` — test error card renders with buttons

**Checkpoint**: Users see actionable error cards instead of raw AbortError strings

---

## Phase 4: User Story 3 - Timeout Alignment (Priority: P3)

**Goal**: Electron HTTP timeout covers full confirm pipeline duration

**Independent Test**: With `AGENT_LLM_TIMEOUT_MS=300000`, confirm timeout ≥ 390s

### Implementation for User Story 3

- [x] T015 [US3] Update `aily-blockly/electron/tesseract-runtime.js` `resolveHttpTimeoutMs()` — change formula from `llmTimeout + 15000` to `llmTimeout * 1.2 + 30000`; add `resolveConfirmTimeoutMs()` method that uses this wider formula
- [x] T016 [US3] Update `confirmWorkflow()` in `tesseract-runtime.js` — use `resolveConfirmTimeoutMs()` instead of generic `this.httpTimeoutMs`

**Checkpoint**: Electron client waits long enough for backend to complete confirm pipeline

---

## Phase 5: Polish & Validation

- [x] T017 Build backend: `cd backend && npm run build`
- [x] T018 Run backend tests: `cd backend && npm test`
- [x] T019 Build verification: type-check both backend and frontend changes

---

## Dependencies

```
T001, T002 (parallel) → T003 → T004, T005, T006 (sequential) → T007 → T008, T009 (parallel)
T010 → T011 → T012 → T013, T014 (parallel)
T015 → T016
T017 → T018 → T019
```

## Parallel Opportunities

- T001 + T002 (different files, no dependency)
- T008 + T009 (different test files)
- T013 + T014 (different test files)
- US2 and US3 can be worked in parallel after US1 is complete

## Implementation Strategy

**MVP**: US1 (T001-T009) — backend never crashes on confirm. This alone eliminates the `AbortError` dead-end.
**Incremental**: US2 (T010-T014) adds frontend polish. US3 (T015-T016) reduces timeout frequency.
