# Contract: Skill Record

## Purpose

Define the minimum data the backend skill catalog must provide for dialogue-mode skill cards and the Studio skills library.

## Required Fields

- `skillId`: stable identifier
- `displayName`: user-facing skill name
- `summary`: short description shown on cards
- `requiredHardware[]`: canonical hardware requirements used for readiness checks
- `workflow`: bound workflow JSON used for direct display/deployment
- `sourceSessionId`: original chat session used by the trace-back action
- `createdAt` and `updatedAt`: library metadata

## Consumer Expectations

1. Dialogue mode consumers must be able to compute `ready`, `partial`, or `blocked` states by comparing `requiredHardware[]` with the live hardware snapshot.
2. Studio skill cards must be able to show name, summary, hardware badges, trace action, and publish action without additional data fetches.
3. A skill record without bound workflow JSON must be treated as non-runnable and rendered as unavailable.
4. A skill record without `sourceSessionId` must disable trace-back actions rather than failing after click.

## Persistence Expectations

- The workflow JSON remains stored with the skill record even if it is not displayed on the card.
- Hardware identifiers must use a shared enum-like vocabulary so backend and frontend readiness logic stay consistent.