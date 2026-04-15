# Research: MQTT Hardware Live Integration

## Decision 1: Backend MQTT client is the only hardware truth source

- Decision: 在 `backend` 建立常驻 MQTT client 与 runtime store，统一消费 `qsf/{deviceId}/edge2cloud` heartbeat/命令回包，并对 `cloud2edge` 指令做日志化封装。
- Rationale: `backend` 已经是 dialogue mode、skills routing、digital twin scene 的业务真相源；把 MQTT 直接塞进 `frontend` 或 `aily-blockly` 会复制状态，制造第二真相源。
- Alternatives considered:
  - `aily-blockly` 直接连 MQTT：能更快出 UI，但会让 backend 与 UI 各保一份硬件状态。
  - `frontend` 直接连 MQTT：数字孪生更近，但 dialogue/teaching 无法复用同一状态。

## Decision 2: Digital twin consumes canonical scene, not raw heartbeat

- Decision: heartbeat 先进入 backend runtime store，再由 backend 投影成 canonical `digitalTwinScene`，`aily-blockly` 和嵌入式 Flutter 只消费这份 scene。
- Rationale: 原始 heartbeat 含设备元数据与云侧语义，数字孪生只该看到“最终渲染态”；这样可以保证 skills routing、状态框、日志、数字孪生看到的是同一份投影结果。
- Alternatives considered:
  - 前端自己解析 heartbeat：速度快，但 scene/对话/日志容易分叉。

## Decision 3: Five physical ports are explicit, not inferred

- Decision: 将真实接口 `3-1.2/3-1.3/3-1.4/3-1.6/3-1.7` 固定映射为 `port_1/2/3/4/7`，并在 scene config 中只暴露这五个外设口。
- Rationale: 旧的 8 口模型是 mock 时代遗留，继续保留会让 heartbeat 与数字孪生无法精确对应。
- Alternatives considered:
  - 保留 8 口并只用其中 5 个：视觉和语义都混乱。

## Decision 4: wifi and mimiclaw remain stateful but model-less

- Decision: `wifi` 与 `mimiclaw` 只进入 runtime state 与日志，不生成 3D 模型。
- Rationale: 它们是真实硬件能力，但没有对应外设模型；伪渲染任何已有模型都会污染用户理解。
- Alternatives considered:
  - 用占位模型硬显示：最容易误导调试。

## Decision 5: Media previews are command-driven diagnostic panes

- Decision: 麦克风、扬声器、摄像头预览都作为数字孪生左侧诊断面板；麦克风/扬声器以活动波形表达运行态，摄像头基于 `p2p_example.html` 的 ZLMRTC 播放逻辑。
- Rationale: 需求重点是“确认硬件已经运行”，不是做完整多媒体工作站；用状态化 preview pane 足够提供可信反馈。
- Alternatives considered:
  - 将 preview 放回主客户端右侧聊天区：会把数字孪生操作与诊断反馈拆开。

## Decision 6: Dialogue mode removes hardcoded skills and mock choices

- Decision: 对话模式只信任 backend skills library + backend semantic router + runtime heartbeat state；旧的 mock skill 卡片与 mock 插拔入口从用户面移除。
- Rationale: 分支 A/B/C 只有建立在同一真相源之上才有意义。
- Alternatives considered:
  - 保留 mock UI 作为 fallback：会继续让真实路径和演示路径互相污染。

## Decision 7: Bottom log panel is fed by structured runtime events

- Decision: 心跳、命令发送、命令回包、workflow upload/stop、preview lifecycle 都进入统一 hardware runtime log 流，由 `aily-blockly` 显示在现有底部日志窗口。
- Rationale: 用户要求基于 `heartbeat.log` 的样式持续观察真实交互，最自然的路径就是复用现有日志面板而不是再造一个调试窗。
- Alternatives considered:
  - 直接写控制台：不可读，且对用户不可见。

## Decision 8: Upload/stop commands terminate at backend

- Decision: “上传工作流到硬件”“停止工作流”按钮只触发 backend API，由 backend 负责把 workflow/stop 指令翻译成 `cloud_mqtt_example.py` 所定义的消息形状。
- Rationale: workflow 是 backend 已知对象，指令拼装也属于业务层，不该由 UI 直接拼 MQTT payload。
- Alternatives considered:
  - Electron 主进程直接发 MQTT：绕过 backend，破坏唯一真相源。
