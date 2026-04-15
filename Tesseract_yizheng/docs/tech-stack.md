# Tech Stack

## Workspace Shape

- Monorepo workspace with 4 primary codebases: `backend`, `frontend`, `aily-blockly`, `n8n/n8n-master`
- Root repo also carries shared governance docs, startup scripts, specs, and agent instructions

## Backend

- Language: TypeScript 5.x
- Runtime: Node.js 22
- Core stack: `express`, `ws`, `zod`, OpenAI SDK, MQTT bridge, local MCP/agent services
- State model: in-memory session/config state plus local JSON/workflow snapshot files

## Frontend

- Language: Dart
- Framework: Flutter / Flutter Web
- Core stack: `dio`, embedded workspace UI, digital twin and dialogue widgets
- Assets: local images/models/videos plus browser-side model viewer bridge

## Desktop Shell

- Language: TypeScript
- Framework: Angular + Electron
- Core stack: Angular standalone components, Electron IPC, ng-zorro modal, embedded n8n runtime
- Main app root: `aily-blockly`

## Automation / Workflow

- `n8n/n8n-master` is a forked n8n monorepo managed with `pnpm`
- Local workflow truth also appears in project snapshots and `.tesseract/workflow.json`-style files

## Shared Constraints

- Prefer reuse-first refactor before introducing new modules or UI surfaces
- Avoid hard-coded IDs, paths, thresholds, and environment-specific literals
- Cross-module changes must keep docs, folder maps, and startup instructions in sync
