# Tasks: MQTT 硬件运行时闭环

**Input**: Design documents from `/specs/008-mqtt-hardware-runtime/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 保留 backend `vitest`、`aily-blockly` TypeScript 编译、Angular 构建、`frontend` `flutter analyze`，并增加 MQTT runtime/parser、dialogue routing、preview state 的回归。

## Phase 1: Setup

- [ ] T001 对齐 `specs/008-mqtt-hardware-runtime/` 文档集合并补齐分形 AGENTS 映射
- [ ] T002 审计 `docs/dev/heartbeat.log`、`cloud_mqtt_example.py`、`p2p_example.html` 与现有热插拔 mock/数字孪生/日志链的最小改动文件集合

## Phase 2: Foundational

- [ ] T003 在 `backend` 建立 `HardwareRuntimeState`、heartbeat/parser、command log 与 canonical scene 投影基础设施
- [ ] T004 在 `aily-blockly` 建立 runtime state 消费、日志窗口数据源、顶部连接状态框与数字孪生控制动作基础设施
- [ ] T005 在 `frontend` 数字孪生页收口五口映射、内置 mic/speaker 控件与左侧预览面板基础布局

## Phase 3: User Story 1 - 实时硬件在线与挂载同步 (Priority: P1) 🎯 MVP

**Goal**: heartbeat 到达后，顶部状态、底部日志和数字孪生挂载同步对齐。  
**Independent Test**: 发送包含 `cam @ 3-1.4`、`hand @ 3-1.6`、`wifi @ 3-1.2` 的 heartbeat 后，客户端顶部显示已连接，日志滚动 heartbeat，数字孪生只在 `port_3/port_4` 显示 cam/hand 挂载，不为 wifi 伪造模型。

- [ ] T006 [P] [US1] 新增 heartbeat parser 与 runtime state 回归测试 in `backend/tests/unit/...`
- [ ] T007 [US1] 在 `backend` 解析 heartbeat、映射真实端口、生成 canonical scene、过滤 `wifi/mimiclaw` 无模型挂载
- [ ] T008 [P] [US1] 在 `aily-blockly` 顶部增加硬件连接状态框，并把 heartbeat/command 事件流接入底部日志窗口
- [ ] T009 [US1] 在 `aily-blockly` 与 `frontend` 数字孪生桥中消费 canonical scene，移除旧 mock 八口逻辑并按五口映射更新挂载
- [ ] T010 [US1] 更新相关 AGENTS 文档，固化 heartbeat -> runtime -> scene 的唯一真相源法则

## Phase 4: User Story 2 - 配置完成后将工作流真实下发到硬件 (Priority: P1)

**Goal**: 节点全配置完成后，客户端直接上传/停止真实工作流，并在日志中看到云侧下发与端侧回包。  
**Independent Test**: 当 workflow 已创建且节点全部配置完成时，UI 出现上传/停止按钮；点击上传后底部日志显示 `workflow` 消息与回包；点击停止后显示 `workflow_stop` 消息与回包。

- [ ] T011 [P] [US2] 新增 workflow upload/stop MQTT command 与命令回包回归测试 in `backend/tests/integration/...`
- [ ] T012 [US2] 在 `backend` 用 canonical workflow context 构建 `workflow`/`workflow_stop` MQTT 命令并关联回包
- [ ] T013 [US2] 在 `aily-blockly` 教学/对话完成态显示 `上传到硬件` 和 `停止工作流` 按钮，并消费 backend command execution/result
- [ ] T014 [US2] 将云侧下发命令、回包与失败态写入底部日志窗口并反馈到按钮状态

## Phase 5: User Story 3 - 对话模式基于真实 skills 库与 backend Agent 分流 (Priority: P2)

**Goal**: 移除 mock 技能数据和硬编码 skill 选项，由 backend 决定走 specs/001 A/B/C 或 MimicLaw。  
**Independent Test**: 输入真实 skills 库中已有的技能请求时，前端不再显示 mock 选项卡，而是直接进入 backend 决定的分支；未知技能进入教学；普通闲聊走 MimicLaw。

- [ ] T015 [P] [US3] 新增 skills semantic match/dialogue routing 回归测试 in `backend/tests/unit/...` 与 `backend/tests/integration/...`
- [ ] T016 [US3] 在 `backend` 收口真实 skill 查询 + current hardware runtime 驱动的 A/B/C/MimicLaw 路由
- [ ] T017 [US3] 在 `aily-blockly` 移除 mock skills 数据、对话模式 mock 卡片与硬编码选项，改为消费 backend routing 结果
- [ ] T018 [US3] 更新技能库/对话模式相关 AGENTS 文档，固化“frontend 不保留 mock skill 状态”的法则

## Phase 6: User Story 4 - 数字孪生中的麦克风、扬声器与摄像头预览 (Priority: P2)

**Goal**: 用户通过数字孪生直接触发 mic/speaker/camera，并在左侧预览面板确认运行状态。  
**Independent Test**: 点击顶部麦克风/扬声器按钮分别触发相应命令与波形预览；点击摄像头模型时出现摄像头预览或明确失败提示。

- [ ] T019 [P] [US4] 新增 mic/speaker/camera preview runtime state 与交互回归测试 in `aily-blockly`/`frontend`
- [ ] T020 [US4] 在 `backend` 建立 mic/speaker command 发起与 preview runtime state 更新接口
- [ ] T021 [US4] 在 `aily-blockly` 数字孪生控制链中接上 mic/speaker/camera 动作，转发到 backend 并显示命令/结果
- [ ] T022 [US4] 在 `frontend` 数字孪生页增加顶部 mic/speaker 控件、左侧预览面板和摄像头模型点击行为
- [ ] T023 [US4] 基于 `docs/dev/p2p_example.html` 在 `frontend` 嵌入 camera P2P/WebRTC 预览宿主

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T024 收口 `localhost/127.0.0.1`、MQTT device/topic、P2P 预览地址等 runtime 配置入口
- [ ] T025 增加贯穿 backend -> aily-blockly -> frontend 的可读诊断日志与 revision/checkpoint
- [ ] T026 运行 `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend && npm run build`
- [ ] T027 运行 `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend && npx vitest run --coverage.enabled false ...`
- [ ] T028 运行 `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npx tsc -p tsconfig.app.json --noEmit`
- [ ] T029 运行 `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npx tsc -p tsconfig.spec.json --noEmit`
- [ ] T030 运行 `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npx ng build --configuration development`
- [ ] T031 运行 `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend && flutter analyze`

## Dependencies & Execution Order

- Phase 1 -> Phase 2 -> US1
- US2 依赖 US1 的 runtime/log/scene 真相源已打通
- US3 依赖 backend runtime 与 skills 查询已经可用
- US4 依赖 US1 的数字孪生基础布局与 canonical preview state 已建立
- Polish 在所有目标用户故事完成后执行

## Parallel Opportunities

- T006 与 T008 可并行
- T011 与 T013/T014 可并行
- T015 与 T017 可并行
- T019 与 T022/T023 可并行
- T026/T028/T031 可并行验证

## Implementation Strategy

1. 先收口 backend `HardwareRuntimeState`，把 heartbeat、command、scene 统一到一条 canonical runtime 流
2. 再让 `aily-blockly` 的状态框、日志窗口、对话动作和数字孪生桥全部消费这条流
3. 最后扩展 embedded `frontend` 的数字孪生渲染和预览能力
4. 过程中持续删除 mock 热插拔、mock skills 和旧端口假设，避免双真相源复活
