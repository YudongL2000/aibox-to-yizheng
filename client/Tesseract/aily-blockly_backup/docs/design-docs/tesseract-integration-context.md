# Tesseract Integration Context

## Purpose
This document compresses the working context scattered across [../product-specs/tesseract-desktop-prd-v3.md](../product-specs/tesseract-desktop-prd-v3.md) and [../references/conversation-log-2026-03-03.md](../references/conversation-log-2026-03-03.md) into implementation-ready repository guidance for `aily-blockly`.

It exists to answer one question: what are we actually turning this desktop app into?

## Product Goal
The active direction is to turn `aily-blockly` into a Tesseract-first desktop application for hardware workflow authoring:

1. The user describes a hardware scenario in natural language.
2. Tesseract Agent turns that request into a workflow blueprint.
3. The user confirms the blueprint.
4. The app generates or updates an n8n workflow locally.
5. The app guides hardware configuration and deployment.

This is the "hardware Cursor" direction referenced in the planning documents.

## Chosen Architecture
The current MVP deliberately does **not** embed backend TypeScript directly into the Electron main process.

Instead:

- Electron remains JavaScript-based.
- Electron starts and supervises a local Tesseract Agent sidecar.
- Electron starts and supervises a local n8n runtime.
- Angular uses preload APIs and IPC to talk to both.

This keeps the desktop integration incremental and avoids introducing a second main-process build chain into `aily-blockly`.

## Workspace Strategy
The desktop app now has two editor paths:

- `Tesseract Studio`
  - default for new projects
  - project marker: `.tesseract/manifest.json`
  - workflow snapshot: `.tesseract/workflow.json`
  - route: `/main/tesseract-studio`
- `Legacy Blockly`
  - fallback for historical projects
  - project marker: `project.abi`
  - route: `/main/blockly-editor`

This is a cutover-with-fallback strategy, not a hard deletion of Blockly.

## UI Direction
The PRD settled on four visible changes:

1. Replace the main Blockly-first editing experience with an n8n workflow-first workspace.
2. Keep legacy Blockly available as a compatibility path.
3. Replace Tesseract-route side rail actions that are centered on pinmap/circuit with actions centered on 3D model, templates, and workflow context.
4. Reuse `aily-chat` rendering logic and extend it with Tesseract-specific response cards instead of inventing a second chat system.

## Chat Rendering Contract
Tesseract Agent responses should be adapted into the existing `aily-*` markdown ecosystem.

The MVP mapping is:

- `summary_ready`
  - text
  - `aily-workflow-blueprint`
  - `aily-component-recommendation`
  - `aily-button`
- `workflow_ready`
  - text
  - `aily-mermaid`
  - `aily-button`
- `select_single`, `select_multi`, `image_upload`, `config_input`, `hot_plugging`
  - `aily-config-guide`
  - `aily-button`
- `config_complete`, `error`
  - `aily-state`

## Why a Separate Project Marker Exists
`package.json.type` is intentionally not reused for mode switching.

Reasons:

- it already has runtime meaning in the JS ecosystem
- it would create avoidable ambiguity for legacy projects
- a separate `.tesseract/manifest.json` makes project intent explicit and cheap to detect

## What We Keep from Legacy aily-blockly
- Electron shell and window/tool management
- project creation/opening flow
- board and library ecosystem
- serial monitor
- build/upload pipeline
- `aily-chat` UI framework and custom markdown viewers
- fallback Blockly editor

## What We Add for the MVP
- local runtime managers for Tesseract Agent and n8n
- preload APIs for desktop workflow operations
- Tesseract project scaffolding
- Tesseract Studio route and embedded n8n shell
- route-aware float sider behavior
- local Tesseract chat transport and response adapters

## Implementation Boundaries
- `../backend` is treated as an allowed sibling dependency.
- The MVP targets one local desktop instance, not multi-user or multi-tenant orchestration.
- The goal is a working integration path, not a full replacement of every legacy workflow in one pass.

## Acceptance Commands
- Build the sibling Agent runtime:
  - `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend && npm run build`
- Ensure the local n8n workspace is built:
  - `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/n8n/n8n-master && pnpm build:n8n`
- Prepare the desktop runtime artifacts:
  - `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npm run prepare:tesseract-runtime`
- Smoke-check sidecar + n8n health and editor URL:
  - `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npm run smoke:tesseract -- --project /absolute/path/to/project`

## Troubleshooting
- `prepare:tesseract-runtime` fails:
  - confirm `../backend/dist/agent-server/index.js` exists
  - run `cd ../backend && npm run build`
- n8n iframe stays blank:
  - confirm `../n8n/n8n-master/packages/cli/dist` exists
  - run `cd ../n8n/n8n-master && pnpm build:n8n`
  - verify `http://127.0.0.1:5678/healthz` is reachable
- Tesseract project opens the wrong editor:
  - confirm `.tesseract/manifest.json` exists inside the project root
  - legacy Blockly projects should only carry `project.abi`
