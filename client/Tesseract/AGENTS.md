# Repository Guidelines

## Project Structure & Module Organization
This workspace contains multiple codebases. Make changes in the correct module and keep cross-module edits explicit.

- `quickstart.md`: 根仓级本地启动手册，描述 Apple Silicon macOS 下根仓与 4 个子仓的依赖安装、启动顺序与日常调试路径。
- `dev-up-macos.sh`: 根仓级 Apple Silicon macOS 单入口启动脚本，顺序拉起 backend、数字孪生 Web、Angular dev server 与 Electron 外部 backend 模式。
- `.vscode/`: VS Code workspace settings for editor-only behavior such as hiding nested Git repositories in Source Control.
- `backend/`: TypeScript agent + MCP services (`src/`, `tests/`, `scripts/`, `apps/agent-ui/`).
- `frontend/`: Flutter client (`lib/`, `test/`, platform folders `android/`, `ios/`, `web/`, assets in `assets/`).
- `aily-blockly/`: Angular + Electron desktop app (`src/`, `electron/`, `docs/`).
- `n8n/n8n-master/`: Forked n8n monorepo (`packages/`, `docker/`, `scripts/`).

## Build, Test, and Development Commands
Run commands from the target module directory.

- Backend: `cd backend && npm run build` (TS build), `npm run agent:dev` (agent server), `npm run test` / `npm run test:integration`.
- Flutter frontend: `cd frontend && flutter pub get`, `flutter run`, `flutter test`, `flutter analyze`.
- Aily Blockly: `cd aily-blockly && npm start` (Angular dev server), `npm run electron` (desktop dev), `npm run build`.
- n8n fork: `cd n8n/n8n-master && pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm test`.

## Coding Style & Naming Conventions
- TypeScript/JS: keep existing style per module tools; avoid mixing formatters across modules.
- `aily-blockly` and `backend/apps/agent-ui`: 2-space indentation.
- `n8n/n8n-master`: Biome/Prettier + Lefthook; tabs are expected in Biome-managed packages.
- Flutter/Dart: follow `flutter_lints` (`frontend/analysis_options.yaml`); keep file names `snake_case.dart`.
- Prefer descriptive module paths (example: `backend/src/services/...`, `frontend/lib/server/...`).

## Testing Guidelines
- Backend uses Vitest; coverage targets are ~80% lines/functions/statements, 75% branches.
- Flutter uses `flutter_test`; place tests under `frontend/test/` and name `*_test.dart`.
- Aily Blockly uses Angular/Karma tooling; add/update specs for behavior changes.
- n8n changes should include package-local tests and pass `pnpm test` before PR.

## Commit & Pull Request Guidelines
- Follow Conventional Commits where possible (`feat:`, `fix:`, `chore:`, optional scope like `feat(agent): ...`).
- Keep commits focused to one module.
- PRs should include: purpose, changed paths, test evidence (commands + results), config/env updates, and screenshots for UI changes.
- Link related issues/tasks and call out breaking changes explicitly.

## Security & Configuration Tips
- Do not commit secrets. Use local `.env` files (for example in `backend/apps/agent-ui/`).
- Validate deployment-related changes with sample configs in `backend/deploy/` and `n8n/n8n-master/docker/` before merging.

## Active Technologies
- TypeScript on Node.js for `backend` + Dart/Flutter Web for `frontend` + existing browser JS bridge assets + backend `AgentService`/HTTP+WebSocket server、Flutter `dio` API clients、`AiInteractionWindow`、existing MQTT device bridge、new local hardware adapter for MiniClaw-style WebSocket (`ws://192.168.1.150:18789/`) (001-openclaw-dialog-mode)
- backend in-memory session state via `SessionService` + existing local asset/config files; no new persistent database required in first slice (001-openclaw-dialog-mode)
- TypeScript on Node.js + Angular/Electron desktop renderer + Angular router、Electron IPC、embedded n8n runtime、本地项目快照服务 (004-workflow-view-sync)
- 本地项目文件与 `.tesseract/workflow.json` 快照 (004-workflow-view-sync)
- TypeScript on Node.js + Angular/Electron desktop renderer + backend `AgentService`/Express server/SessionService、dialogue-mode router、Electron IPC、Angular standalone components、ng-zorro modal (005-skills-library-dialogue)
- backend 本地 JSON files under `backend/data/skills/` + 现有 session/config/workflow 内存态与项目快照 (005-skills-library-dialogue)
- TypeScript on Node.js + Angular/Electron desktop renderer + backend AgentService/ConfigAgent、Electron BrowserWindow/ipc、`TesseractChatService`、数字孪生 iframe bridge (006-digital-twin-truth-sync)
- backend in-memory config state + existing workflow/session files；无新数据库 (006-digital-twin-truth-sync)
- TypeScript on Node.js + Angular/Electron desktop renderer + Dart/Flutter Web embedded workspace + backend `AgentService`/`ConfigAgent`、Electron `BrowserWindow`/IPC、`TesseractChatService`、`IframeComponent` postMessage bridge、Flutter `HomeWorkspacePage`/`DigitalTwinConsoleController` (006-digital-twin-truth-sync)
- TypeScript on Node.js for `backend` and `aily-blockly` + Dart/Flutter Web for `frontend` + `express`, `ws`, `axios`, `mqtt` (新增 direct dependency 于 backend), Angular/Electron IPC, Flutter Web + existing JS model viewer bridge, ZLMRTC browser helper adapted from `docs/dev/p2p_example.html` (009-mqtt-hardware-live)
- backend local JSON files (`backend/data/skills/`) + in-memory runtime store + existing session/workflow snapshot files (009-mqtt-hardware-live)
- TypeScript on Node.js for `backend` and `aily-blockly`; Dart/Flutter for `frontend` + Express/WebSocket agent server, Angular/Electron chat shell, local skill-library JSON storage, Flutter dialogue widgets, existing markdown/mermaid renderers, existing MQTT and digital twin bridges (010-tesseract-ux-loop)
- Local JSON files under `backend/data/skills/`, in-memory session/config state, existing workflow/project snapshot files, uploaded face images under `backend/data/uploads/` (010-tesseract-ux-loop)
- Angular/Electron `IframeComponent` postMessage bridge + Dart/Flutter Web `HomeWorkspacePage` + `AssemblyChecklistPanel`、`DialogueHardwareBridgeService` state$ relay、alias token matching (016-twin-assembly-checklist)
- TypeScript 5.x on Node.js v22 + OpenAI SDK, zod, express, ws (019-agent-markdown-clarify-fix)
- N/A (in-memory session state) (019-agent-markdown-clarify-fix)

## Recent Changes
- 001-openclaw-dialog-mode: Added TypeScript on Node.js for `backend` + Dart/Flutter Web for `frontend` + existing browser JS bridge assets + backend `AgentService`/HTTP+WebSocket server、Flutter `dio` API clients、`AiInteractionWindow`、existing MQTT device bridge、new local hardware adapter for MiniClaw-style WebSocket (`ws://192.168.1.150:18789/`)
- 004-workflow-view-sync: Added Angular/Electron workflow view sync closure for `aily-blockly`, centered on project workflow snapshots, placeholder-only empty workspaces, and embedded n8n auto-focus after create success.
- 016-twin-assembly-checklist: Moved hardware assembly detection from aily-blockly dialogue to Flutter digital twin. Added `AssemblyChecklistPanel` widget, postMessage relay in `iframe.component.ts`, completion handler in `aily-chat.component.ts`.
- 020-workflow-gen-resilience: Backend confirm pipeline never throws HTTP 500 — all failures return structured `AgentResponse` with Chinese error messages and escalating suggestions. Frontend catches IPC AbortError, guards deploy chain on non-workflow_ready, synthesizes client-side error response. Electron timeout formula widened from `llmTimeout + 15s` to `llmTimeout * 1.2 + 30s` with confirm-specific 1.5x multiplier.
- 021-mqtt-image-upload: Face image upload flow changed from backend disk-write to MQTT `rec_img` base64 publish. Added `publishRecImg()` to `MqttHardwareRuntime`, `publishImageViaMqtt()` to `AgentService`, and structured upload/publish logs. Flutter `AiInteractionWindow` now sends image `width` / `height`, stores `imageId`, and confirms FACE-NET with `face_info` only after upload.
