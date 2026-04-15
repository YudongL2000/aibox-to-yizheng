# services/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/AGENTS.md

成员清单
chat.service.ts: 旧 Agent/QA 模式会话服务，负责模型、标题与历史会话状态。
chat-history.service.ts: 聊天历史存储服务，负责全局索引、项目级/全局级会话数据与定时兜底保存。
subagent-session.service.ts: subagent 会话服务，负责服务端子代理会话复用、流式事件解析与执行进度推送。
tesseract-chat.service.ts: Tesseract backend 访问层，以 session/workflow 为真相源桥接 chat/confirm/create/config/open 动作，把 backend `digitalTwinScene` 以带元数据的 canonical envelope 同步到 Electron 子窗口桥，并在创建成功后发布项目级 workflow 视图同步目标。
tesseract-agent-response-adapter.ts: backend AgentResponse -> aily markdown block 适配器，负责把 workflow/config 响应折叠成前端块协议，把真实 skills 库折成对话卡片，并在 config_complete 时挂出上传到硬件 / 停止工作流 / 打开工作流动作块。
tesseract-dialogue.models.ts: 对话模式共享模型，统一 card payload、真实 skills preview、relay 指令、教学接力、入库候选与 backend envelope 归一化。
dialogue-hardware-bridge.service.ts: Mimiclaw/MiniClaw WebSocket 入口，把插拔事件标准化成 frontend 可消费的单一硬件桥事件，并以 `AILY_DIALOGUE_*` 配置代理普通对话到 MimicLaw。
dialogue-hardware-bridge.service.spec.ts: 桥接层回归测试，锁住 `device_info` snapshot 到 `connectedComponents + portId` 的归一化契约，以及 MimicLaw chat frame 的聚合行为。
tesseract-agent-response-adapter.spec.ts: 协议适配器回归测试，锁定 summary/workflow/config/error 与真实 skills/入库按钮的渲染契约。
tesseract-chat.service.spec.ts: Tesseract 服务层回归测试，锁定“无项目路径也能 confirm/create/open”的 backend-first 行为。

法则
- backend `sessionId/workflowId/workflowUrl` 是唯一真相源；本地 `.tesseract/workflow.json` 只能做可选缓存，不能反向决定动作是否合法。
- `dialogueMode` 只能有一份模型与一份硬件桥；再长出第二套 `dialogue-*` 目录，等同于重新制造状态分叉。
- backend `dialogueMode.librarySkills` 是对话模式里 skills 卡片唯一来源；移除硬编码 wakeup skills 后，前端不得补回本地假数据。
- 只在 `projectPath` 存在时落本地快照；没有项目时继续走 backend session，但仍必须允许客户端工作区用 `workflowId` 自动聚焦目标流程。
- “创建工作流”成功的第一反应应该是发布项目级 workflow sync target，而不是等用户再点一次“打开工作流”；否则左侧主工作区会继续停在旧画面。
- workflow create / node confirm / workflow open 这类依赖 n8n Public API 的动作，必须在聊天层显式确保 embedded n8n 已启动；不能假设左侧页面显示过主页就等于 runtime 一定活着。
- `workflow_ready` 只能提供“创建工作流”动作；真正的“打开工作流”按钮必须来自已创建的 workflow 引用。
- 已创建 workflow 的打开动作必须携带足够上下文把客户端主路由切到 `tesseract-studio`；只留外部 URL 会让应用内工作区永远停在旧画面。
- 对话模式卡片 payload 必须直接服务于 `x-aily-dialogue-mode-viewer`，字段名不得在 adapter/viewer 之间漂移。
- `digitalTwinScene` 为 null 时要回落到底座默认场景，而不是保留上一轮会话残影。
- `snapshot` 事件必须携带全量 `connectedComponents`；只传单个 `component` 会让端口与场景再次漂移。
- 高噪音服务日志必须分级：周期性状态走 `debug`，异常走 `warn/error`；禁止把正常心跳写成刷屏级 `info/log`。
- hardware_port 确认必须同时携带 `portId/topology`；否则 backend 只能把节点标记 configured，却无法实时更新数字孪生挂载位。
- 对话模式命中已有 skill 后的硬件校验，仍必须复用 `validateHardware(snapshot)` 这条唯一入口；不能再偷偷走 mock insert 旁路，端口选择必须回落到 backend 给出的真实 options。
- 配置阶段数字孪生同步必须优先读 backend `getConfigState()` 的 canonical scene；`confirm-node` 响应里的 scene 只可当过渡反馈，不能直接当最终真相源。
- `digitalTwinScene` 同步日志至少要覆盖 `response -> getConfigState() -> setScene(envelope) -> setScene(result)` 四跳；否则无法判断问题出在 backend 投影、Electron 缓存还是 IPC 落地。
- 非特定技能输入是否走 MimicLaw，只能服从 backend `dialogueMode.relay`；前端不得重新从原文猜“普通聊天”还是“教学需求”。
- MimicLaw WebSocket URL、relay timeout 与 idle timeout 必须优先读取 `AILY_DIALOGUE_WS_URL` / `AILY_DIALOGUE_RELAY_TIMEOUT_MS` / `AILY_DIALOGUE_RELAY_IDLE_MS`；renderer debug 可再用 `localStorage` 的 `aily.dialogue.wsUrl` / `aily.dialogue.relayTimeoutMs` / `aily.dialogue.relayIdleMs` 覆盖。
- MimicLaw transport `chat_id` 必须保持 ASCII-safe 且长度不超过 30；backend 给出的长业务 id 只能作为 hint，桥接层必须在发送前短化兜底。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
