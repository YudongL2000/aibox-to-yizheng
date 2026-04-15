# Implementation Plan: Agent Markdown Output & Clarification Fix

**Branch**: `019-agent-markdown-clarify-fix` | **Date**: 2026-04-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/019-agent-markdown-clarify-fix/spec.md`

## Summary

Three surgical changes to the backend agent pipeline:
1. Rewrite `buildGuidanceMessage()` and sibling methods in `response-builder.ts` to emit markdown instead of plain-text concatenation.
2. Raise the `llmDiscoveryTimeoutMs` default ceiling from 6000ms to 15000ms in `agent-config.ts`.
3. Fix `buildQuestionOptions()` in `response-builder.ts` to synthesize fallback interaction options from `missing_info` when reflection questions lack explicit `options` arrays.

All changes are in `backend/src/agents/` — zero frontend changes needed (markdown renderer already exists).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js v22  
**Primary Dependencies**: OpenAI SDK, zod, express, ws  
**Storage**: N/A (in-memory session state)  
**Testing**: Vitest (unit + integration)  
**Target Platform**: Windows/Linux Node.js server (Electron-embedded)  
**Project Type**: Backend agent service  
**Performance Goals**: Agent response latency < LLM round-trip + 50ms overhead  
**Constraints**: Markdown output must be valid CommonMark, compatible with `ngx-x-markdown` and Flutter markdown renderers  
**Scale/Scope**: Single-module change in `backend/src/agents/orchestrator/response-builder.ts` + one-line config change in `agent-config.ts`

## Constitution Check

*Constitution template not populated — no gates to check.*

## Project Structure

### Documentation (this feature)

```text
specs/019-agent-markdown-clarify-fix/
├── plan.md              # This file
├── research.md          # Root cause analysis and decisions
├── quickstart.md        # Verification steps
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Implementation tasks
```

### Source Code (affected files)

```text
backend/src/agents/
├── agent-config.ts                        # FR-004: timeout ceiling change
└── orchestrator/
    └── response-builder.ts                # FR-001/002/003/005/006: markdown + options fix

backend/tests/unit/agents/orchestrator/
└── response-builder.test.ts              # Existing tests to update for markdown output
```

**Structure Decision**: All changes stay within the existing backend agent module. No new files, no new dependencies, no structural changes.
