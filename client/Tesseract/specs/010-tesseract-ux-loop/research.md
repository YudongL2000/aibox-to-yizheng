# Research: Tesseract Client UX Loop

## Decision 1: Reuse the existing chat markdown and mermaid pipeline for workflow confirmation output

- Decision: Keep workflow confirmation rendering inside the current `tesseract-agent-response-adapter` and `x-dialog` markdown pipeline, but move the diagram and formatted summary generation earlier so they appear with the `确认工作流` action instead of after a separate create step.
- Rationale: The repository already has production renderers for markdown blocks, mermaid diagrams, buttons, and config-guide cards. Reusing that path removes UI divergence and directly satisfies the requirement to format long AI output with the existing chat renderer.
- Alternatives considered:
  - Build a second dedicated workflow-confirm component: rejected because it would duplicate markdown/diagram rendering logic and increase drift between chat phases.
  - Keep the current raw table output until workflow creation: rejected because it preserves the UX break the feature is meant to remove.

## Decision 2: Promote `确认工作流` to the action that both confirms and synchronizes the active workspace target

- Decision: Treat workflow confirmation as the moment the active workflow target is committed, then publish the workspace view target and initialize configuration without requiring a second `创建工作流` click.
- Rationale: The current split between confirm and create produces state drift and forces an unnecessary extra user action. The embedded n8n workspace and chat should share one canonical workflow target.
- Alternatives considered:
  - Leave confirmation and creation split but auto-click create internally: rejected because it hides the same architecture problem and keeps confusing intermediate states.
  - Delay workspace synchronization until the user finishes all config prompts: rejected because users need immediate visual confirmation that the workflow exists.

## Decision 3: Gate digital-twin refreshes on meaningful hardware scene changes, not heartbeat frequency

- Decision: Compare incoming hardware snapshots against the last applied component/port/status signature and only push updates to the digital twin when that signature changes.
- Rationale: The user-visible problem is repeated heartbeat traffic causing jitter even when the hardware scene is unchanged. Signature-based gating addresses the root cause without changing transport.
- Alternatives considered:
  - Add a simple debounce timer: rejected because it can still refresh unnecessarily and may delay real changes.
  - Lower heartbeat frequency globally: rejected because it would trade away responsiveness for all consumers.

## Decision 4: Treat the backend skill record as the single persisted source for skill cards and replay actions

- Decision: Use existing `SkillLibraryRecord` persistence under `backend/data/skills/` as the authoritative source for skill name, summary, required hardware, workflow JSON, and trace session ID; adapt consumers to expose the needed fields for chat cards and the Studio library.
- Rationale: The repository already stores full workflow JSON and session provenance in skill records. Surfacing those fields to the frontends is cheaper and safer than inventing a second skill metadata store.
- Alternatives considered:
  - Create a separate frontend-side skill cache schema: rejected because it introduces synchronization problems and duplicates data already persisted.
  - Compute skill cards entirely from current sessions: rejected because saved skills must stay usable after the original teaching session ends.

## Decision 5: Reuse the existing face-upload endpoint and dynamic config-guide contract for hot-plugging prompts

- Decision: Keep using `POST /api/agent/upload-face` for image uploads and extend existing config-guide viewers to render image, single-select, multi-select, and text prompts based on `InteractionRequest` metadata from the backend API.
- Rationale: The backend already exposes the upload endpoint and the API contract clearly documents `select_single`, `select_multi`, `image_upload`, and `config_input` shapes. The missing piece is rendering completeness, not new protocol design.
- Alternatives considered:
  - Introduce a new upload endpoint dedicated to chat: rejected because the existing endpoint already supports the required behavior.
  - Hardcode control types by field name: rejected because the API documentation explicitly warns against field-name-specific UI assumptions.

## Decision 6: Enforce Studio-over-digital-twin ordering in the Electron window manager instead of trying to patch around it in CSS

- Decision: Adjust window-open options and z-order handling in Electron so Studio and the skills library remain above the digital twin surface.
- Rationale: The reported issue is cross-window stacking, not an in-page overlay bug. The fix belongs in the window manager and open-window role logic.
- Alternatives considered:
  - Change only modal z-index values in Angular: rejected because separate BrowserWindows ignore CSS stacking.
  - Close the digital twin whenever Studio opens: rejected because it destroys useful parallel context.

## Validation Commands

- Backend: `cd backend && npm run build`
- Aily-blockly: `cd aily-blockly && npm run build` or the closest available type/build validation command in `package.json`
- Flutter: `cd frontend && flutter analyze`

Targeted follow-up tests should focus on dialogue response adaptation, skill-library rendering, and digital-twin state gating once implementation is in place.