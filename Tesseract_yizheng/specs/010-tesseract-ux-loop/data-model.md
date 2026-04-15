# Data Model: Tesseract Client UX Loop

## Entity: Workspace Workflow Target

- Purpose: Represents the workflow the chat, embedded n8n workspace, and follow-up configuration flow are currently acting on.
- Key fields:
  - `sessionId`: owning dialogue or teaching session
  - `workflowId`: persisted n8n identifier when available
  - `workflowName`: user-facing label
  - `workflowJson`: workflow definition used for render and deployment
  - `source`: `skill-library`, `workflow-confirm`, or `config-resume`
  - `syncStatus`: `pending`, `visible`, `configuring`, `failed`
- Validation rules:
  - At least one of `workflowId` or `workflowJson` must exist before the workspace sync step.
  - `sessionId` must stay aligned with the chat session that produced or resumed the workflow.
- State transitions:
  - `pending` -> `visible` when the workspace view target is published successfully
  - `visible` -> `configuring` when configuration prompts begin
  - Any state -> `failed` if deployment or synchronization errors occur

## Entity: Skill Record

- Purpose: Persisted reusable skill entry exposed to both chat-mode suggestions and the Studio skills library.
- Key fields:
  - `skillId`
  - `displayName`
  - `summary`
  - `keywords`
  - `requiredHardware[]`
  - `workflowJson`
  - `workflowId`
  - `workflowName`
  - `sourceSessionId`
  - `createdAt`
  - `updatedAt`
- Validation rules:
  - `workflowJson` must be present for any skill card that offers direct run or replay.
  - `requiredHardware[]` must use canonical hardware identifiers so readiness checks are deterministic.
  - `sourceSessionId` is required for trace-back actions.
- Relationships:
  - One `Skill Record` may create one `Workspace Workflow Target` when selected.

## Entity: Hardware Availability Snapshot

- Purpose: Normalized view of live hardware state used for skill readiness and digital-twin refresh gating.
- Key fields:
  - `components[]`: normalized component identifiers and statuses
  - `ports[]`: active port or endpoint mappings
  - `lastHeartbeatAt`
  - `signature`: stable digest derived from the component and mapping set
  - `missingForSkill[]`: computed list for a selected skill
- Validation rules:
  - `signature` changes only when the rendered scene should change.
  - Missing hardware is computed from canonical IDs, not display strings.
- State transitions:
  - Recomputed on each heartbeat
  - Applied to digital twin only when `signature` differs from the last rendered signature

## Entity: Skill Summary Card

- Purpose: User-facing card shown in dialogue mode and the Studio skills library.
- Key fields:
  - `title`
  - `description`
  - `requiredHardware[]`
  - `availabilityStatus`: `ready`, `partial`, `blocked`
  - `missingHardware[]`
  - `traceSessionId`
  - `publishEnabled`
  - `workflowBindingPresent`
- Validation rules:
  - A card cannot expose a direct run action unless `workflowBindingPresent` is true.
  - `availabilityStatus` must match the current `Hardware Availability Snapshot`.

## Entity: Dialogue Configuration Prompt

- Purpose: One prompt step returned by the agent during hot-plugging or config entry.
- Key fields:
  - `type`: `hot_plugging`, `config_input`, `select_single`, `select_multi`, `image_upload`, or `config_complete`
  - `currentNode`
  - `progress`
  - `interaction`
  - `metadata.workflowId`
  - `message`
- Validation rules:
  - Render mode must be driven by `type` and `interaction.mode`, not by a field-name heuristic.
  - Image prompts require upload confirmation before submission.
  - `config_complete` must expose a next action to deploy or focus the workflow target.

## Entity: Workflow Diagram Summary

- Purpose: Visual summary shown during workflow confirmation.
- Key fields:
  - `markdownSummary`
  - `diagramCode`
  - `diagramFormat`
  - `fallbackMessage`
- Validation rules:
  - `diagramCode` must be wrapped in the syntax expected by the existing chart renderer.
  - If the renderer cannot identify a valid diagram type, the UI must fall back to readable markdown instead of surfacing a raw parser error.