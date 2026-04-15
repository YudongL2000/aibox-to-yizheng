# Implementation Plan: MQTT 硬件运行时闭环

**Branch**: `008-mqtt-hardware-runtime` | **Date**: 2026-04-05 | **Spec**: [/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/008-mqtt-hardware-runtime/spec.md](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/008-mqtt-hardware-runtime/spec.md)
**Input**: Feature specification from `/specs/008-mqtt-hardware-runtime/spec.md`

## Summary

把当前教学/对话模式中的 mock 热插拔、mock skill 选项和 mock 设备控制替换成真实硬件运行时：backend 负责消费 MQTT heartbeat、发出云侧控制指令、归一化数字孪生与对话路由；`aily-blockly` 负责展示连接状态、日志、技能命中结果、工作流上传/停止以及数字孪生交互控制；embedded `frontend` 数字孪生页负责展示真实五口挂载、麦克风/扬声器内置按钮与左侧预览面板。唯一真相源是 backend 的 `HardwareRuntimeState`，而不是任意一个前端局部状态。

## Technical Context

**Language/Version**: TypeScript on Node.js + Angular/Electron desktop renderer + Dart/Flutter Web embedded workspace + Python reference protocol samples  
**Primary Dependencies**: backend Agent server、现有 dialogue mode/skill library、MQTT client library、Electron `BrowserWindow`/IPC、Angular chat/log/skill center components、Flutter `HomeWorkspacePage`/`Model3DViewer`、WebRTC preview host  
**Storage**: backend JSON skill library + existing workflow/session files + in-memory hardware runtime cache；无新数据库  
**Testing**: `vitest`、`npx tsc -p tsconfig.app.json --noEmit`、`npx tsc -p tsconfig.spec.json --noEmit`、`npx ng build --configuration development`、`flutter analyze`、必要的 smoke 脚本  
**Target Platform**: Windows Electron desktop app with embedded Flutter Web digital twin and local backend services  
**Project Type**: Multi-repo desktop application with local backend, Electron shell, Angular renderer, and embedded web workspace  
**Performance Goals**: heartbeat 状态在 2 秒内反映到 UI；工作流上传/停止 10 秒内给出成功或失败反馈；日志窗口持续可读且不中断主交互  
**Constraints**: backend 是硬件运行时唯一真相源；不允许继续保留 mock skill 数据与 mock 硬件拓扑；五个真实接口固定映射为 `port_1`、`port_2`、`port_3`、`port_4`、`port_7`；`wifi`/`mimiclaw` 只显示状态不显示 3D 模型；预览窗必须在数字孪生窗口内部左侧呈现  
**Scale/Scope**: 单设备 `aibox001`、单活动数字孪生窗口、教学/对话模式与真实硬件闭环、三类预览（camera/microphone/speaker）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `.specify/memory/constitution.md` 仍是模板占位，不能作为真实约束来源。
- 当前实际治理约束以下列文档为准：
  - 根级 `AGENTS.md`
  - `backend/src/agents/CLAUDE.md`
  - `backend/src/agent-server/AGENTS.md`
  - `aily-blockly/src/app/tools/aily-chat/services/AGENTS.md`
  - `frontend/lib/module/home/AGENTS.md`
- 本方案遵守现有约束：
  - 单一真相源保留在 backend
  - renderer/frontend 只消费，不推导第二套硬件状态
  - 不引入新的桌面窗口体系，只扩展既有数字孪生窗口和日志窗口
- Gate result: PASS with documented constitution gap

## Project Structure

### Documentation (this feature)

```text
specs/008-mqtt-hardware-runtime/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── mqtt-hardware-runtime-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/agents/
│   ├── dialogue-mode/
│   ├── digital-twin-scene.ts
│   └── workflow-service.ts
├── src/agent-server/
│   ├── agent-service.ts
│   ├── server.ts
│   └── websocket.ts
├── src/services/
│   └── [mqtt runtime + command services]
└── tests/
    ├── integration/agent/
    └── unit/

aily-blockly/
├── electron/
│   ├── preload.js
│   └── window.js
└── src/app/
    ├── main-window/components/header/
    ├── tools/aily-chat/
    ├── tools/log/
    ├── tools/skill-center/
    ├── services/
    └── windows/iframe/

frontend/
├── lib/module/home/
│   ├── home_workspace_page.dart
│   ├── controller/
│   └── widget/
└── web/model_viewer/
    ├── viewer.js
    └── index.html

docs/dev/
├── heartbeat.log
├── cloud_mqtt_example.py
└── p2p_example.html
```

**Structure Decision**: backend 持有 `HardwareRuntimeState`、skills 查询结果、workflow/hardware command 状态与数字孪生 scene；`aily-blockly` 负责可读交互、日志、上传/停止动作和数字孪生窗口桥接；embedded `frontend` 只消费 canonical runtime state 并渲染数字孪生与预览。`docs/dev` 的协议样例作为本轮唯一外部协议参考。

## Phase 0: Research Summary

- `heartbeat.log` 已给出端侧状态与云侧命令回包的可读样式；这意味着客户端日志不应自行杜撰格式，而应围绕“收到端侧状态/收到命令回包/发送到 cloud2edge”三类事件收敛。
- `cloud_mqtt_example.py` 明确了三类控制消息：
  - `workflow`
  - `workflow_stop`
  - `cmd`
  并展示了状态查询与 request correlation 的最小模式，因此 runtime 需要保留 request/result 两跳状态。
- `p2p_example.html` 提供了摄像头预览的最小运行逻辑：基于 `ZLMRTCClient` 和远端播放 URL，属于独立于 MQTT heartbeat 的预览通道。
- 当前系统的最大结构问题是 mock state 仍然分散在 backend dialogue mode、`aily-blockly` viewer 卡片和数字孪生端口映射里。本轮必须先收口为一个 backend runtime model，再让三个消费端各自渲染。

## Phase 1: Design Artifacts

### Data Model

- 见 [data-model.md](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/008-mqtt-hardware-runtime/data-model.md)
- 核心实体：
  - `HardwareRuntimeState`
  - `HeartbeatDeviceRecord`
  - `HardwareCommandEnvelope`
  - `HardwarePreviewState`
  - `DialogueSkillMatch`

### Interface Contracts

- 见 [mqtt-hardware-runtime-contract.md](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/008-mqtt-hardware-runtime/contracts/mqtt-hardware-runtime-contract.md)
- 本轮 contract 聚焦：
  - MQTT heartbeat/command parsing
  - runtime state -> digital twin scene projection
  - dialogue mode backend routing
  - digital twin preview/control events

### Quickstart Validation Target

- 见 [quickstart.md](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/008-mqtt-hardware-runtime/quickstart.md)
- 最小闭环验收包含：
  - heartbeat 进入客户端并更新顶部状态与底部日志
  - cam/hand 等模块按真实端口更新数字孪生
  - workflow 上传/停止走真实 MQTT 指令
  - 麦克风/扬声器/camera 预览能发起且给出可见反馈
  - 对话模式不再显示 mock skill 选项

## Post-Design Constitution Check

- 没有引入新的硬件状态真相源
- 没有让数字孪生或对话 UI 继续保存自己的 mock 拓扑
- 所有硬件状态变化都要求先进入 backend runtime，再广播给消费者
- Post-design gate: PASS

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution remains template | 当前仓库尚未建立正式治理文档 | 假装存在真实宪法会让 gate 失真 |
| Digital twin includes preview panes | 用户要求在同一数字孪生窗口内确认 mic/speaker/camera 运行状态 | 把预览开到独立窗口会破坏调试闭环与唯一运行时视图 |
