# Implementation Plan: 020-workflow-gen-resilience

**Branch**: `020-workflow-gen-resilience` | **Date**: 2026-04-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/020-workflow-gen-resilience/spec.md`

## Summary

Workflow generation confirm pipeline currently crashes hard on LLM timeout → HTTP 500 → frontend `AbortError`。本计划修复三层防线：后端异常包装为结构化响应、前端渲染错误恢复卡片、Electron HTTP 超时对齐实际管道时间。

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js v24 (backend), Angular 19 + Electron (aily-blockly)
**Primary Dependencies**: OpenAI SDK (LLM), express, ws (backend HTTP/WS), Angular standalone components (frontend)
**Storage**: In-memory session state via `SessionService`
**Testing**: Vitest (backend), Jasmine/Karma (aily-blockly)
**Target Platform**: Electron desktop (aily-blockly), Node.js server (backend)
**Project Type**: Agent service + desktop IDE
**Performance Goals**: confirm pipeline ≤ 400s total (including LLM timeout + fallback + validation)
**Constraints**: LLM timeout 300s is external dependency, cannot reduce; Electron IPC is sync bridge
**Scale/Scope**: Single-user desktop app, single session at a time

## Constitution Check

No constitution violations. This is a bugfix + resilience improvement within existing architecture.

## Project Structure

### Documentation (this feature)

```text
specs/020-workflow-gen-resilience/
├── spec.md
├── plan.md              # This file
├── research.md          # Root cause analysis
├── quickstart.md        # Integration test scenarios
├── checklists/
│   └── requirements.md
└── tasks.md             # Implementation tasks
```

### Source Code (affected files)

```text
backend/
├── src/
│   ├── agents/
│   │   ├── orchestrator.ts              # confirm() error wrapping
│   │   └── orchestrator/
│   │       ├── response-builder.ts      # buildCompositionFailureResponse()
│   │       └── workflow-architect.ts     # callLLM() try-catch
│   ├── agent-server/
│   │   ├── server.ts                    # HTTP handler → always 200
│   │   └── agent-service.ts             # confirm() → no re-throw
│   └── types.ts                         # AgentResponse type extension
└── tests/
    └── unit/
        └── agents/
            ├── orchestrator-confirm.test.ts    # New: confirm pipeline tests
            └── response-builder.test.ts        # Extended: failure response tests

aily-blockly/
├── electron/
│   └── tesseract-runtime.js             # resolveHttpTimeoutMs() formula
└── src/app/tools/aily-chat/
    ├── components/x-dialog/
    │   └── x-aily-config-guide-viewer/
    │       └── x-aily-config-guide-viewer.component.ts  # Error card rendering
    └── services/
        └── tesseract-chat.service.ts     # Confirm error handling
```

## Phases

### Phase 0: Research (completed)

Root cause analysis documented in [research.md](research.md). Key findings:
1. `tryComposeWithWorkflowArchitect()` correctly catches timeout → returns null → ComponentComposer fallback runs
2. ComponentComposer generates valid node structure but MCP validation fails (missing params, invalid connections)
3. `agentLoop.run()` returns `{valid: false}` → orchestrator builds `guidance` response with `buildValidationFailureMessage()`
4. **BUT** total time exceeds Electron HTTP timeout (315s < 320s+ actual) → client aborts before receiving response
5. Even when response arrives, `validation.errors` message is technical, not actionable

### Phase 1: Backend Resilience

1. **orchestrator.confirm()**: Wrap full pipeline in try-catch → on error, return `AgentResponse` type `guidance` with composition failure message
2. **response-builder.ts**: Add `buildCompositionFailureResponse(error, attemptCount, suggestions)` method
3. **agent-service.ts**: Convert catch-and-rethrow to catch-and-wrap → return structured response, never throw
4. **server.ts**: Confirm handler always returns 200; only use 500 for serialization failures
5. **SessionService**: Add `confirmFailureCount` tracking per session

### Phase 2: Frontend Error Recovery

1. **tesseract-chat.service.ts**: Handle confirm response by type, not by success/failure of HTTP call
2. **x-aily-config-guide-viewer**: Recognize `composition_failed` context in guidance responses → render error card with retry/refine buttons
3. **AbortError fallback**: Catch IPC-level AbortError → synthesize a client-side error response card

### Phase 3: Timeout Alignment

1. **tesseract-runtime.js**: Change `resolveHttpTimeoutMs()` formula, add confirm-specific override
2. Formula: `confirmTimeoutMs = max(llmTimeout * 1.2 + 30000, 390000)` → covers LLM overshoot + fallback
