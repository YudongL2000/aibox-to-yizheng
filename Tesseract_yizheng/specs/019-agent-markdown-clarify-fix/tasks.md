# Tasks: Agent Markdown Output & Clarification Fix

**Input**: Design documents from `/specs/019-agent-markdown-clarify-fix/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: No new files or dependencies needed. Verify existing test infrastructure.

- [x] T001 Verify existing tests pass: `cd backend && npm test` before making changes

---

## Phase 2: User Story 3 — Discovery Timeout Fix (P2)

**Goal**: Raise `llmDiscoveryTimeoutMs` default from 6000ms to 15000ms so semantic discovery LLM calls complete under normal latency.

**Independent Test**: Start agent, check logs for `llmDiscoveryTimeoutMs: 15000`. Send query, verify "语义发现增强" completes without abort.

- [x] T002 [US3] Change default timeout ceiling in `backend/src/agents/agent-config.ts` — replace `Math.min(llmTimeoutMs, 6000)` with `Math.min(llmTimeoutMs, 15000)` on the `llmDiscoveryTimeoutMs` line
- [x] T003 [US3] No existing tests assert 6000ms — verified by search, nothing to update

**Checkpoint**: `npm run build && npm test` passes.

---

## Phase 3: User Story 1 — Markdown Response Formatting (P1)

**Goal**: Rewrite response builder message methods to emit markdown instead of plain text.

**Independent Test**: Send any teaching-mode query, verify response contains markdown markers (`**`, `-`, `>`, `\n\n`).

- [x] T004 [P] [US1] Rewrite `describeCapabilities()` in `backend/src/agents/orchestrator/response-builder.ts` — return markdown bullet list `- **{component}** — {entries}` instead of flat `、`-separated string
- [x] T005 [P] [US1] Rewrite `buildGuidanceMessage()` — bold section headers, numbered list, blockquote prompt
- [x] T006 [P] [US1] Rewrite `buildPendingGuidanceMessage()` — same markdown pattern
- [x] T007 [US1] Rewrote `buildSummaryMessage()` + `buildRejectResponse()` + `buildRejectedStateResponse()` to markdown
- [x] T008 [US1] Created `tests/unit/agents/response-builder.test.ts` with 7 tests verifying markdown output patterns

**Checkpoint**: `npm run build && npm test` passes. Manual check: response messages contain markdown.

---

## Phase 4: User Story 2 — Clarification Options Fix (P1)

**Goal**: Ensure `buildQuestionOptions()` synthesizes fallback options from `missing_info` so the interaction field is always populated.

**Independent Test**: Send "我想做一个和我共情的机器人", verify response has `interaction.options` with at least 2 entries. Logs must not contain "澄清交互回退为问题模式".

- [x] T009 [US2] Added fallback in `buildQuestionOptions()` — synthesize from blocking missing_info when no question options
- [x] T010 [US2] Unit test: questions without options produces synthetic options from missing_info
- [x] T011 [US2] Unit test: suggested_user_actions takes precedence over missing_info fallback

**Checkpoint**: `npm run build && npm test` passes. Fallback trace "澄清交互回退" should not appear in normal clarification flows.

---

## Phase 5: Polish & Integration

- [x] T012 Full test suite: build passes, 7/7 new tests pass, pre-existing failures unrelated
- [x] T013 L3 header verified accurate; no AGENTS.md update needed
- [ ] T014 Manual end-to-end verification per quickstart.md steps 1-4 (requires running agent server)
