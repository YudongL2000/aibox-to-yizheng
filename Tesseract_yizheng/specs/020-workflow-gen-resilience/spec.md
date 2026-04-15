# Feature Specification: Workflow Generation Resilience & Graceful Degradation

**Feature Branch**: `020-workflow-gen-resilience`  
**Created**: 2026-04-08  
**Status**: Draft  
**Input**: User description: "fix backend-Agent workflow generation failure and add graceful degradation on repeated failures"

## User Scenarios & Testing

### User Story 1 - Confirm Failure Returns Actionable Guidance Instead of Raw Error (Priority: P1)

When the workflow generation pipeline fails for any reason — LLM timeout, validation failure, JSON parse error, network fault — the user receives a structured, human-readable response with an explanation of what went wrong and what they can do about it, rather than a raw 500 error or `AbortError` string.

**Why this priority**: Today, any failure in the confirm pipeline propagates as an unhandled exception through `orchestrator.confirm()` → `agent-service.ts` → `server.ts`, where it becomes a bare `{ error: "..." }` JSON body with HTTP 500. The frontend receives this as a rejected promise and displays a raw error string with no recovery path. This is the single biggest UX failure — 100% of timeout/composition failures result in a dead-end experience.

**Independent Test**: Kill the LLM proxy (or set an unreachable LLM endpoint) and click "确认构建". Verify the chat window shows a structured error card with a meaningful Chinese-language message and at least one actionable button — not a raw error string or blank failure.

**Acceptance Scenarios**:

1. **Given** the WorkflowArchitect LLM call times out (AbortError), **When** the backend processes the confirm request, **Then** it returns HTTP 200 with a valid `AgentResponse` of `type: 'guidance'`, a user-friendly message explaining the generation timed out, and a `missingInfo` hint suggesting the user simplify or decompose their requirements.
2. **Given** the WorkflowArchitect returns unparseable JSON from the LLM, **When** the fallback to ComponentComposer also fails validation, **Then** the backend returns HTTP 200 with a valid `AgentResponse` of `type: 'guidance'` containing the specific validation issues and a suggestion to refine requirements — not a 500 error.
3. **Given** an unexpected error occurs anywhere in the confirm pipeline (e.g. network fault, null reference), **When** the HTTP handler catches it, **Then** it returns HTTP 200 with an `AgentResponse` of `type: 'error'` containing a safe, non-technical Chinese message — never exposing stack traces or internal error strings to the client.
4. **Given** the backend returns any `AgentResponse` (including error/guidance types), **When** the Electron IPC bridge receives it, **Then** it forwards the full response object to the Angular frontend without re-throwing — because HTTP status is 200, not 500.

---

### User Story 2 - Frontend Shows Error Recovery Card with Retry and Refine Options (Priority: P2)

When the confirm flow fails, the chat window displays a structured error card with context-appropriate actions: retry (if transient), refine requirements (if the problem is complexity), or start over (if state is corrupted). The user is never stuck in a loop of identical failures with no way out.

**Why this priority**: Even after the backend returns structured error responses (US1), the frontend must render them as actionable UI — not just dump the message text. Without a recovery UX, users click "确认构建" repeatedly, hitting the same timeout wall.

**Independent Test**: Trigger a confirm timeout (e.g. with a long-running or unreachable LLM). Verify the chat window shows an error card with at least "重试" and "优化需求" buttons. Click "优化需求" and verify the chat returns to requirement-gathering mode.

**Acceptance Scenarios**:

1. **Given** the confirm response has `type: 'guidance'` due to a timeout failure, **When** the chat renders this response, **Then** it displays a visually distinct error card (not a normal chat bubble) with the guidance message and at least two action buttons: "重试构建" and "优化需求描述".
2. **Given** the confirm response has `type: 'error'` indicating a system-level failure, **When** the chat renders this response, **Then** it shows a system error card with a "重试" button and a "重新开始" button that resets the session to intake mode.
3. **Given** the user clicks "优化需求描述" on an error card, **When** the session returns to guidance mode, **Then** the agent sends a follow-up message with specific suggestions derived from the failure context (e.g. "您的需求涉及 8 个节点，建议先实现核心流程再逐步添加功能").
4. **Given** the user clicks "重试构建", **When** the confirm request is re-sent, **Then** the UI shows a loading state and the backend processes a fresh confirm attempt.

---

### User Story 3 - Electron HTTP Timeout Properly Covers Full Confirm Pipeline (Priority: P3)

The Electron HTTP client timeout for the confirm endpoint accounts for the full confirm pipeline duration — including LLM generation, fallback composition, and validation loop — so that the client never aborts a still-in-progress backend request.

**Why this priority**: The current timeout formula `max(30000, AGENT_LLM_TIMEOUT_MS + 15000)` = 315s when `AGENT_LLM_TIMEOUT_MS` = 300s. But the actual pipeline can take 320s+ (LLM call alone observed at 320590ms). The 15-second buffer is consumed by the LLM call overshoot, leaving zero margin for fallback composition + validation. This causes the client to abort just as the backend is about to return a valid (even if degraded) response.

**Independent Test**: Set `AGENT_LLM_TIMEOUT_MS=300000`. Trigger a confirm. Verify that even if the LLM call takes 320s and falls through to ComponentComposer fallback, the Electron HTTP client does NOT abort before the backend responds.

**Acceptance Scenarios**:

1. **Given** `AGENT_LLM_TIMEOUT_MS` is set to 300000ms, **When** the Electron runtime calculates the confirm HTTP timeout, **Then** it uses at least `AGENT_LLM_TIMEOUT_MS * 1.2 + 30000` (= 390s) to cover LLM overshoot + fallback composition + validation loop.
2. **Given** the WorkflowArchitect LLM call times out at 300s but the abort takes 20s additional to settle, **When** the orchestrator catches the timeout and falls through to ComponentComposer, **Then** the Electron HTTP client is still waiting and receives whatever response the backend ultimately produces.
3. **Given** the backend returns a response at 350s elapsed (after LLM timeout + fallback), **When** the Electron client receives it, **Then** it processes the response normally and forwards it to the frontend via IPC.

---

### Edge Cases

- **Double-click confirm**: User clicks "确认构建" twice rapidly. The second request should be deduplicated or queued — not spawn parallel LLM calls. Backend should reject concurrent confirm requests for the same session with a `type: 'guidance'` response saying "构建已在进行中".
- **Session expired mid-confirm**: If the session is garbage-collected or reset while a confirm is in-flight, the response should be `type: 'error'` with a "会话已过期，请重新开始" message, not a null-reference crash.
- **LLM returns empty response**: WorkflowArchitect receives an empty string or `null` from the LLM. This should be caught at the same level as parse errors and trigger ComponentComposer fallback, not propagate as an unhandled TypeError.
- **ComponentComposer generates zero nodes**: The fallback produces an empty workflow. Validation catches it, but the response should explain "无法自动生成工作流节点" — not a generic validation error dump.
- **All retry attempts exhausted**: Both WorkflowArchitect (3 iterations) and AgentLoop validation (3 iterations) fail. The response must clearly state that automatic generation failed and offer the "优化需求描述" path — not silently return the last broken attempt.

## Requirements

### Functional Requirements

- **FR-001**: The `orchestrator.confirm()` method MUST wrap `composeWorkflowForConfirm()` in a try-catch that converts any thrown error into a structured `AgentResponse` of type `guidance` or `error`, never allowing exceptions to propagate to the HTTP handler.
- **FR-002**: The `tryComposeWithWorkflowArchitect()` method MUST catch all errors from `workflowArchitect.generateWorkflow()` (including AbortError/timeout) and return `null` to trigger ComponentComposer fallback — matching the existing behavior contract where `null` means "architect failed, try fallback".
- **FR-003**: The HTTP confirm handler in `server.ts` MUST return HTTP 200 with a valid `AgentResponse` shape for ALL outcomes, including failures. HTTP 500 MUST only occur for truly unexpected infrastructure failures (e.g. response serialization crash).
- **FR-004**: Every `AgentResponse` returned from the confirm pipeline MUST include a `message` field with user-facing text in Chinese, never raw error messages, stack traces, or English technical jargon.
- **FR-005**: The Electron confirm HTTP timeout MUST be calculated with sufficient margin to cover: LLM timeout + 20% overshoot buffer + 30s for fallback composition and validation.
- **FR-006**: The frontend chat component MUST render confirm-failure responses (`type: 'guidance'` or `type: 'error'` from the confirm context) as a distinct error card with actionable buttons, not a plain text chat bubble.
- **FR-007**: The backend MUST reject concurrent confirm requests for the same `sessionId` with a `type: 'guidance'` response indicating a build is already in progress.
- **FR-008**: When the user selects "优化需求描述" after a confirm failure, the session MUST transition back to the requirement-gathering phase, and the agent MUST send a follow-up guidance message with specific refinement suggestions based on the failure context.

### Key Entities

- **AgentResponse**: The unified response envelope returned by all agent operations. Confirm failures must use this shape (not bare `{ error: string }`) to ensure the frontend can render them uniformly.
- **AgentResponse.type**: Extended with `'error'` value for irrecoverable system failures, alongside existing `'guidance'`, `'workflow_ready'`, `'summary_ready'`, `'config_complete'`.
- **ConfirmErrorContext**: New metadata attached to failure responses — includes `failureReason` (enum: `timeout`, `validation`, `composition`, `system`), `attemptCount`, and optional `refinementHints` array.
- **Session.confirmState**: Tracks whether a confirm is in-flight (to reject concurrent requests) and cumulative failure count (to escalate guidance).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Zero HTTP 500 responses from the `/api/agent/confirm` endpoint under any failure condition — all responses are HTTP 200 with a valid `AgentResponse` shape. Verifiable by running the confirm flow with a killed LLM endpoint and checking response status codes.
- **SC-002**: When `AGENT_LLM_TIMEOUT_MS` is set to 300000ms and the actual LLM call takes up to 330s, the Electron client does NOT abort the request. Verifiable by adding a simulated delay to the LLM call and checking that the frontend receives the backend response.
- **SC-003**: After a confirm failure, users have at least one actionable path forward (retry or refine) without needing to close and reopen the session. Verifiable by triggering a timeout failure and confirming the UI renders actionable buttons.
- **SC-004**: No raw English error strings (`AbortError`, `Request timed out`, stack traces) are ever visible in the chat window. Verifiable by triggering every known failure mode and checking rendered text.

## Assumptions

- The existing `AgentResponse` type in the backend can be extended with a new `type: 'error'` value and optional `confirmErrorContext` metadata without breaking existing frontend response handling for other response types.
- The Angular chat component (`aily-chat.component.ts`) already has the infrastructure to render different card types based on `AgentResponse.type` — the new error card is an additional card type, not a new rendering system.
- The `SessionService` already tracks per-session state and can be extended with `confirmInFlight` and `confirmFailureCount` fields without architectural changes.
- The LLM timeout overshoot (observed 20s beyond configured timeout) is a known characteristic of the OpenAI SDK's abort behavior and will not be fixed upstream — the timeout buffer must account for it.
- Chinese language is the primary UI language for error messages; English fallback is not required for this feature.
