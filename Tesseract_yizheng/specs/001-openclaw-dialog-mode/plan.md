# Implementation Plan: OpenClaw 对话模式

**Branch**: `001-openclaw-dialog-mode` | **Date**: 2026-04-01 | **Spec**: [/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/001-openclaw-dialog-mode/spec.md](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/001-openclaw-dialog-mode/spec.md)
**Input**: Feature specification from `/specs/001-openclaw-dialog-mode/spec.md`

## Summary

为现有 OpenClaw AI 面板增加 backend-first 的“对话模式”状态机，让已知技能在硬件齐备时秒级开玩、缺件时引导插拔并等待一次“开始部署”确认、未知技能时一键接力到教学模式。实现上复用现有 backend Agent 会话与 Flutter AI 面板，但新增统一的 `dialogueMode` 响应包和本地硬件事件适配层，把技能匹配、硬件校验、部署确认、教学跳转收敛到单一真相源，而不是继续堆散落的前端分支。

## Technical Context

**Language/Version**: TypeScript on Node.js for `backend` + Dart/Flutter Web for `frontend` + existing browser JS bridge assets  
**Primary Dependencies**: backend `AgentService`/HTTP+WebSocket server、Flutter `dio` API clients、`AiInteractionWindow`、existing MQTT device bridge、new local hardware adapter for MiniClaw-style WebSocket (`ws://192.168.1.150:18789/`)  
**Storage**: backend in-memory session state via `SessionService` + existing local asset/config files; no new persistent database required in first slice  
**Testing**: backend Vitest unit/integration tests, agent server contract tests, `flutter test`, `flutter analyze`, manual end-to-end desktop validation  
**Target Platform**: local desktop-embedded Flutter Web workspace with LAN-reachable mock hardware bridge and local backend agent server  
**Project Type**: multi-project desktop experience spanning backend service + Flutter client, with optional Electron shell embedding  
**Performance Goals**: branch A ready-to-play within 3s, hardware insertion feedback within 1s, successful post-insert validation within 5s, one-click teaching handoff without retyping  
**Constraints**: backend Agent output is the canonical UI truth source; frontend may show immediate loading on raw insert events but must wait for backend validation before declaring ready; preserve single conversation context across deploy/handoff; support local MiniClaw WebSocket and existing MQTT path behind one adapter  
**Scale/Scope**: one active dialogue session per workspace, single local operator, small curated skill catalog, handful of physical modules connected to one workstation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`/mnt/c/Users/sam/Documents/Sam/code/Tesseract/.specify/memory/constitution.md` 目前仍是占位模板，尚未形成可执行的项目宪法条款，因此没有可机械判定的硬性 gate。

本计划仍主动遵守三条设计约束：
- 保持 backend-first：客户端不自行发明“已准备好/该跳教学”的业务结论。
- 用单一状态机消灭散落的 if/else：对话模式三分支统一编码为会话阶段，而不是三套独立 UI 逻辑。
- 硬件接入做适配层：MiniClaw WebSocket 与现有 MQTT 只能在桥接层分流，不能污染对话业务层。

Phase 0 结论：通过。  
Phase 1 复核：通过，设计产物未引入与上述约束冲突的结构。

## Project Structure

### Documentation (this feature)

```text
specs/001-openclaw-dialog-mode/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── AGENTS.md
│   ├── dialog-mode-agent-contract.md
│   └── hardware-bridge-events.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── agent-server/
│   │   ├── agent-service.ts
│   │   ├── server.ts
│   │   └── websocket.ts
│   └── agents/
│       ├── component-selector.ts
│       ├── hardware-components.ts
│       ├── session-service.ts
│       └── types.ts
└── tests/
    ├── integration/
    └── unit/

frontend/
├── lib/
│   ├── module/home/
│   │   ├── home_main_page.dart
│   │   ├── home_workspace_page.dart
│   │   └── widget/ai_interaction_window.dart
│   └── server/
│       ├── api/
│       │   ├── agent_chat_api.dart
│       │   ├── agent_confirm_api.dart
│       │   └── agent_start_config_api.dart
│       └── mqtt/mqtt_device_service.dart
└── test/
```

**Structure Decision**: 本特性核心实现收敛在 `backend + frontend` 两处。`backend` 负责技能命中、硬件校验决策、部署确认和教学接力的标准响应；`frontend` 负责对话模式 UI 状态机、按钮渲染、硬件桥接和数字孪生反馈。Electron/`aily-blockly` 仅作为已有嵌入容器，不应承载对话模式业务分支。

## Complexity Tracking

当前未发现需要为“宪法违规”做额外辩护的设计复杂度。
