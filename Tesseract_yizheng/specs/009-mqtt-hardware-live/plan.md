# Implementation Plan: MQTT Hardware Live Integration

**Branch**: `009-mqtt-hardware-live` | **Date**: 2026-04-05 | **Spec**: [/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/009-mqtt-hardware-live/spec.md](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/009-mqtt-hardware-live/spec.md)
**Input**: Feature specification from `/specs/009-mqtt-hardware-live/spec.md`

## Summary

以 backend 常驻 MQTT runtime store 取代现有热插拔 mock，把 heartbeat/命令回包收敛成唯一硬件真相源，再由 backend 同时驱动 skills 语义分流、日志流、工作流上传/停止和 canonical `digitalTwinScene`。`aily-blockly` 负责消费 backend runtime 流并提供状态框、日志、工作流控制与数字孪生窗口协调；`frontend` 只消费 canonical scene 与 preview/control 元数据，调整为真实五个接口并提供 mic/speaker/camera 预览面板。

## Technical Context

**Language/Version**: TypeScript on Node.js for `backend` and `aily-blockly` + Dart/Flutter Web for `frontend`  
**Primary Dependencies**: `express`, `ws`, `axios`, `mqtt` (新增 direct dependency 于 backend), Angular/Electron IPC, Flutter Web + existing JS model viewer bridge, ZLMRTC browser helper adapted from `docs/dev/p2p_example.html`  
**Storage**: backend local JSON files (`backend/data/skills/`) + in-memory runtime store + existing session/workflow snapshot files  
**Testing**: Vitest for backend, Angular/Karma/TypeScript compile for `aily-blockly`, `flutter test` / `flutter analyze` for `frontend`  
**Target Platform**: Windows desktop client with Electron shell + embedded Flutter web twin + local backend agent server  
**Project Type**: Multi-project desktop system (`backend` + `aily-blockly` + `frontend`)  
**Performance Goals**: Heartbeat-driven status/twin updates visible within 2 seconds; command feedback within 3 seconds; media preview state within 5 seconds  
**Constraints**: Single hardware truth source; no fake model for `wifi/mimiclaw`; digital twin ports reduced to `port_1..4` and `port_7`; preview degradation must be explicit and readable  
**Scale/Scope**: One hardware box (`aibox001`) per active desktop session, one embedded twin window, one active log stream, one skill-routing decision per dialogue turn

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `.specify/memory/constitution.md` 仍是模板占位，不提供真实 MUST 规则；本次仅以根仓 `AGENTS.md`、模块 `AGENTS.md`、以及“唯一真相源 / 分形文档同步 / 无第二状态副本”作为事实约束。
- Gate result: CONDITIONAL PASS
  - PASS: 方案把 heartbeat/command runtime store 固定在 backend，避免 UI 复制状态。
  - PASS: 计划把架构文档与新增模块 `AGENTS.md` 纳入交付。
  - WARNING: constitution 模板未落地，无法提供正式治理条款；本 feature 需在 plan/tasks 中显式自带约束。

## Project Structure

### Documentation (this feature)

```text
specs/009-mqtt-hardware-live/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── mqtt-runtime-contract.md
│   └── digital-twin-preview-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── agent-server/
│   ├── agents/
│   │   └── dialogue-mode/
│   ├── services/
│   └── utils/
└── tests/
    ├── integration/
    └── unit/

aily-blockly/
├── electron/
├── src/
│   ├── app/main-window/components/
│   ├── app/tools/aily-chat/
│   │   ├── components/
│   │   └── services/
│   ├── app/tools/log/
│   └── app/services/
└── src/app/windows/iframe/

frontend/
├── lib/module/home/
│   ├── controller/
│   ├── widget/
│   │   └── dialogue_mode/
│   └── home_workspace_page.dart
├── lib/server/
│   ├── hardware_bridge/
│   └── mqtt/
├── test/
└── web/model_viewer/
```

**Structure Decision**: 选择多项目结构。backend 负责 MQTT runtime store、skills routing 与 canonical scene；`aily-blockly` 负责桌面态 UI、日志窗口、workflow/mic/speaker/camera 控制入口与数字孪生窗口桥；`frontend` 只负责数字孪生渲染与 preview pane。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Backend + Electron + Flutter 三段联动 | 需求天然跨 runtime / desktop shell / embedded web | 只改其中一段会重新制造第二真相源 |
| Runtime store + canonical scene projection | 需要统一 skills routing、日志、数字孪生、状态框 | 让 UI 直接解析 heartbeat 会把状态复制到多个地方 |
