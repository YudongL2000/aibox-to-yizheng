# Implementation Plan: 数字孪生唯一真相源同步

**Branch**: `006-digital-twin-truth-sync` | **Date**: 2026-04-03 | **Spec**: [/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/006-digital-twin-truth-sync/spec.md](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/006-digital-twin-truth-sync/spec.md)
**Input**: Feature specification from `/specs/006-digital-twin-truth-sync/spec.md`

## Summary

修复教学模式 mock 拼装时“右侧卡片已确认端口，但数字孪生仍停在底座”的裂脑。唯一真相源保持在 backend `config-state -> digital-twin-scene.ts`，但闭环必须覆盖三段消费链：`backend canonical scene -> aily-blockly scene bridge -> embedded frontend digital twin consumer`。同时数字孪生窗口继续作为客户端之上的单实例业务子窗口复用。

## Technical Context

**Language/Version**: TypeScript on Node.js + Angular/Electron desktop renderer + Dart/Flutter Web embedded workspace  
**Primary Dependencies**: backend `AgentService`/`ConfigAgent`、Electron `BrowserWindow`/IPC、`TesseractChatService`、`IframeComponent` postMessage bridge、Flutter `HomeWorkspacePage`/`DigitalTwinConsoleController`  
**Storage**: backend in-memory config state + existing workflow/session files；无新数据库  
**Testing**: `vitest`、`npx tsc -p tsconfig.app.json --noEmit`、`npx tsc -p tsconfig.spec.json --noEmit`、`npx ng build --configuration development`、`flutter analyze`  
**Target Platform**: Windows desktop Electron client + embedded Flutter Web digital twin page  
**Project Type**: Multi-module desktop app with local backend + Electron window orchestration + embedded web workspace  
**Performance Goals**: mock 端口确认后 2 秒内看到正确挂载；数字孪生窗口复用与置顶无额外交互；冷启动嵌入页不得吞掉第一帧 scene  
**Constraints**: backend canonical scene 是唯一真相源；不能让 Angular 或 Flutter 各自猜场景；embedded frontend 是真相源唯一消费端之一，不是第二真相源；数字孪生窗口必须单实例且位于主客户端之上  
**Scale/Scope**: 单客户端、单活动数字孪生窗口、教学模式配置态与 mock 拼装闭环；本轮不引入新模型协议，只补齐消费链、回退与诊断

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `.specify/memory/constitution.md` 仍是模板占位，不能作为真实治理规则；当前实际约束以下列文档为准：
  - 根级 `AGENTS.md`
  - `backend/src/agents/CLAUDE.md`
  - `backend/src/agent-server/AGENTS.md`
  - `frontend/lib/module/home/AGENTS.md`
  - `aily-blockly/src/app/windows/iframe/AGENTS.md`
- 设计遵守现有约束：不增加第二 scene 真相源，不让 renderer/frontend 自己拼场景，不引入新的窗口体系。
- 设计修正点：embedded `frontend` 被显式纳入闭环消费端，而不是被排除在结构决策之外。
- Gate result: PASS with documented constitution gap

## Project Structure

### Documentation (this feature)

```text
specs/006-digital-twin-truth-sync/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── digital-twin-truth-sync-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/agents/
│   ├── digital-twin-scene.ts
│   └── config-agent.ts
├── src/agent-server/
│   ├── agent-service.ts
│   ├── server.ts
│   └── websocket.ts
└── tests/unit/
    ├── agent-server/agent-service.test.ts
    └── agents/digital-twin-scene.test.ts

aily-blockly/
├── electron/
│   ├── window.js
│   └── preload.js
└── src/app/
    ├── components/float-sider/float-sider.component.ts
    ├── services/ui.service.ts
    ├── tools/aily-chat/services/tesseract-chat.service.ts
    └── windows/iframe/iframe.component.ts

frontend/
└── lib/module/
    ├── login/ui/splash_page.dart
    └── home/
        ├── home_workspace_page.dart
        └── controller/digital_twin_console_controller.dart
```

**Structure Decision**: backend 仍负责 canonical scene 与物理硬件去重；`aily-blockly` 负责读取 canonical scene、缓存并广播；embedded `frontend` 是唯一被允许消费并显示 scene 的渲染端，必须实现 ready-handshake、scene replay、fallback 与消费诊断。不在任何一层复制第二套场景推导逻辑。

## Phase 0: Research Summary

- scene 不更新的真实断点不在 backend 场景生成，而在 `iframe -> embedded frontend` 启动竞态：
  - 第一帧 scene 可能早于 `HomeWorkspacePage.onMessage` 注册而丢失
  - 本地资产加载完成后会把已收到 scene 覆盖回默认底座
- `config-state` 继续是 canonical scene；但如果没有消费端 replay 机制，再正确的真相源也到不了画面。
- 真正需要补的不是新 scene 协议，而是：
  - 子页 ready-handshake
  - 最近一次 inbound scene 保留与重放
  - 明确 fallback/retry policy
  - 贯穿 backend -> Electron -> frontend consume 的诊断 checkpoint

## Phase 1: Design Artifacts

### Data Model

- 见 [data-model.md](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/006-digital-twin-truth-sync/data-model.md)
- 本轮新增的关键实体是 `EmbeddedSceneConsumerState` 与 `DigitalTwinSceneCheckpoint`

### Interface Contracts

- 见 [digital-twin-truth-sync-contract.md](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/006-digital-twin-truth-sync/contracts/digital-twin-truth-sync-contract.md)
- 本轮新增 contract：
  - embedded frontend `tesseract-digital-twin-ready`
  - parent `tesseract-digital-twin-scene`
  - canonical scene replay rule
  - fallback/retry diagnostics

### Quickstart Validation Target

- 见 [quickstart.md](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/006-digital-twin-truth-sync/quickstart.md)
- 计划中的闭环验收不再只看 backend/unit test，而是明确包含：
  - 重启 `frontend` + `aily-blockly`
  - 打开数字孪生窗口
  - mock `speaker -> port_2`
  - 验证嵌入页真实挂载

## Post-Design Constitution Check

- 没有引入第二真相源
- 没有把业务语义下沉到渲染层做推导
- 通过 ready-handshake/replay 把时间竞态显式化，符合“单向数据流优先于多处猜测”的设计法则
- Post-design gate: PASS

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution remains template | 当前仓库仍未建立可执行 constitution | 强行宣称零风险 PASS 会让 plan 失真 |
| Extra frontend consume layer in plan | embedded Flutter 页本来就是实际显示端 | 把它排除在设计外，任务可以全绿但用户画面仍失败 |
