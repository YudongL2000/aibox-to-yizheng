# Implementation Plan: Mock 插拔端口同步与数字孪生实时挂载

**Branch**: `002-hotplug-port-sync` | **Date**: 2026-04-01 | **Spec**: [/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/002-hotplug-port-sync/spec.md](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/002-hotplug-port-sync/spec.md)
**Input**: Feature specification from `/specs/002-hotplug-port-sync/spec.md`

## Summary

修复当前 hotplug 链把“全量硬件快照”压扁成“单个 component 事件”的设计缺陷，让 mock 插拔在 backend、aily-blockly 与数字孪生页面之间稳定传递 `connectedComponents + portId`，并保证数字孪生默认只显示底座 `device-001 / 5.glb`。实现原则是：snapshot 成为一等协议，backend 继续产出唯一 `digitalTwinScene`，容器前端只转发，不再本地猜挂载位置。

## Technical Context

**Language/Version**: TypeScript on Node.js for `backend` + TypeScript/Angular/Electron for `aily-blockly` + Dart for `frontend` digital twin DTO bridge  
**Primary Dependencies**: `DialogueModeService`、`hardware-validation.ts`、`digital-twin-scene.ts`、`TesseractChatService`、`DialogueHardwareBridgeService`、Flutter `DigitalTwinSceneConfig` parser  
**Storage**: session in-memory state only; no new persistence  
**Testing**: backend Vitest unit/integration tests, `aily-blockly` TypeScript compile + Angular build, targeted frontend Dart tests/analyze for DTO path  
**Target Platform**: local desktop app + embedded digital twin page + mock hardware bridge events  
**Performance Goals**: 默认底座 1 秒内显示；插入/拔出后 1 秒内更新场景；多组件快照一次完整刷新  
**Constraints**: backend `digitalTwinScene` is the only display truth; snapshot must preserve `portId`; removal must not leave ghost models  
**Scale/Scope**: 单工作台、少量组件、单会话 hotplug 调试

## Constitution Check

`/mnt/c/Users/sam/Documents/Sam/code/Tesseract/.specify/memory/constitution.md` 仍未形成硬性约束，因此本计划按项目现有实践自检：

- backend-first：通过。数字孪生场景继续由 backend 投影。
- 消灭特殊情况：通过。把“单组件事件”和“全量快照事件”统一归约到同一份快照模型，而不是继续堆分支。
- 实用主义：通过。只修 snapshot/port 同步与默认底座，不扩大到其他 UI 重构。

## Project Structure

### Documentation (this feature)

```text
specs/002-hotplug-port-sync/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── AGENTS.md
│   └── hotplug-scene-contract.md
├── checklists/
│   ├── AGENTS.md
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/agents/
│   ├── types.ts
│   ├── digital-twin-scene.ts
│   └── dialogue-mode/
│       ├── dialogue-mode-service.ts
│       └── hardware-validation.ts
└── tests/unit/agent-server/

aily-blockly/
├── src/app/tools/aily-chat/
│   ├── aily-chat.component.ts
│   └── services/
│       ├── tesseract-dialogue.models.ts
│       ├── tesseract-chat.service.ts
│       └── dialogue-hardware-bridge.service.ts
└── electron/

frontend/
└── lib/server/hardware_bridge/hardware_bridge_models.dart
```

**Structure Decision**: hotplug 真相源仍然收敛在 `backend`。`aily-blockly` 负责把 mock 事件标准化并透传给 backend，然后把 backend 场景桥接到数字孪生窗口；`frontend` 只保留 DTO/scene 消费层的一次性兼容，不承载业务判断。

## Complexity Tracking

当前没有必须接受的额外复杂度。最危险的坏味道是“一个事件只带一个 component”，这正是本轮要消灭的特殊情况。
