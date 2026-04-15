# agent-ui/
> L2 | 父级: ../../CLAUDE.md

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

成员清单
src/App.tsx: Agent UI 总装配，把 AI 健康测试台放在 n8n 上方，并连接聊天面板与工作流创建状态。
vite.config.ts: Vite 开发入口，固定 5173 并代理 /api、/uploads、/ws 到 Agent Backend。
src/lib/agentApi.ts: 前端与 Agent Backend 的协议边界，统一 HTTP 响应归一化并声明 trace/clarificationQuestions/AI 推荐理由协议。
src/lib/runtimeStatusView.ts: 运行时状态视图模型，统一 Header/ChatInterface/AIHealthLab 的标签、摘要与样式语义。
src/hooks/useAgentChat.ts: 聊天状态机，协调 WebSocket、HTTP 回退、工作流创建、按消息锚定的 agent_trace 流与配置同步。
src/components/AIHealthLab.tsx: 可折叠的 AI 健康测试面板，展示探测状态、超时阈值与调参说明。
src/components/Header.tsx: 顶部状态栏，同时展示链路连接与 LLM 运行诊断。
src/components/ChatInterface.tsx: 主交互面板，承载摘要确认、配置输入、工作流创建、结构化澄清问题、AI 反思痕迹与消息内流式调试时间线。
src/components/InteractionCard.tsx: 结构化交互卡片，统一渲染带 AI 推荐理由的澄清动作选项与配置型单选/多选/上传交互。
src/components/BuildProgressBar.tsx: 展示 Refactor-3 三阶段进度。
src/components/N8nIframe.tsx: 按需加载 n8n 预览，减少 5678 页面噪音对聊天调试的干扰。
src/components/*.test.tsx: 前端关键交互测试，覆盖 AI 健康面板、摘要、配置、等待提示、运行时告警与构建状态展示。

架构决策
agent-ui 以“协议观察器 + 操作台”为目标，不只消费后端结果，还要最大限度暴露 sessionId、responseType、workflowId、currentNode 与配置进度，方便验证 Refactor-3 新编排链路。
开发态默认走 5173 同源代理，不再要求浏览器直接跨域访问 3006，这样前后端联调只需要记住一个入口。
运行时诊断由后端 `/api/agent/runtime-status` 与 WebSocket `runtime_status` 帧提供，前端优先消费推送，HTTP 只做兜底，不在浏览器侧猜测 LLM 是否可用。
运行时展示文案统一收敛到 `runtimeStatusView.ts`，避免 Header、聊天告警和健康面板各写一套状态映射。
AI 健康探测超时独立于生成链路超时，前端直接展示 `AGENT_LLM_HEALTH_TIMEOUT_MS` 对应阈值，避免把“探测慢”和“生成慢”混为一谈。
后端编排过程通过 WebSocket `agent_trace` 帧流式推送，ChatInterface 按消息锚点展示 reflection/tool/validation 轨迹，并展开 AI 已识别条件、建议下一步与能力发现线索。
澄清动作优先走结构化 `interaction` 选项卡，`clarificationQuestions` 只保留给无选项时的兜底展示，前端不再默认重复打印问题列表。
澄清选项不仅展示 label/value，还展示 AI 推荐理由，避免 UI 看起来像静态按钮墙。

变更日志
2026-03-06: 建立 agent-ui 模块地图，并将前端交互对齐到 Orchestrator 与 ConfigAgent 新协议。
2026-03-06: vite.config.ts 固定为 5173 代理入口，agentApi/useAgentChat 默认走同源 /api 与 /ws。
2026-03-06: WebSocket 等待态改为响应驱动结束，n8n iframe 改成按需加载，避免“AI 无回复”的假象与 telemetry 噪音误导。
2026-03-06: Header 与 ChatInterface 接入运行时诊断状态，显式区分连接在线与 LLM 降级/禁用。
2026-03-06: 运行时诊断改为 WebSocket 主动推送，去掉前端 15s 轮询。
2026-03-06: 新增 AIHealthLab，前端直接展示当前探测超时与根目录 `.env` 调参方式。
2026-03-06: 新增 runtimeStatusView.ts，统一运行时状态映射；AIHealthLab 支持折叠，减少调试台对主界面的侵占。
2026-03-06: useAgentChat 接入 agent_trace 流，ChatInterface 新增可折叠的流式过程面板，直接展示反思引擎与工具调用过程。
2026-03-06: AIHealthLab 移到 n8n 上方；流式过程改为挂在每次交互消息下方；guidance 的 clarificationQuestions 改为结构化渲染。
2026-03-06: guidance 澄清改为选项驱动，ChatInterface/InteractionCard 会基于后端 `interaction` 直接呈现“下一步可以怎么补充”。
2026-03-07: ChatInterface 开始展示 AI trace 中的识别条件/建议动作/能力发现线索；InteractionCard 会直接显示每个推荐选项的 AI 理由。
