# agents/ - Agent 逻辑核心模块
> L2 | 父级: ../CLAUDE.md

目录结构
agents/
├── agent-loop.ts - Refactor-4 确认闭环内核，统一承接组合后验证/修复循环
├── agent-config.ts - Agent 配置结构与默认值，支持缺失 LLM 时降级启动并分离健康/发现/反思超时
├── agent-db-path.ts - Agent 数据库路径解析
├── agent-db.ts - Agent 数据库初始化与操作入口
├── agent-logger.ts - Agent 运行日志与审计记录
├── allowed-node-types.ts - 节点白名单定义
├── config-agent-service.ts - 硬件配置代理组装入口
├── config-agent.ts - 硬件拼装流程与状态管理
├── config-workflow-orchestrator.ts - 配置流程编排器（会话状态 + ConfigAgent 协同）
├── component-selector.ts - 组件选择器（需求分析 → 组件组合）
├── capability-registry.ts - 能力注册表（能力索引、关键词检索、依赖校验）
├── component-composer.ts - 组件组合器（能力到节点的动态映射、拓扑构建与组合 trace 上报）
├── db-maintenance.ts - 数据库维护工具
├── digital-twin-scene.ts - 数字孪生投影器，把 ConfigAgentState 与 dialogue-mode 硬件快照统一折叠成 frontend/客户端可直接消费的 scene payload
├── dialogue-mode/ - OpenClaw 对话模式真相源子模块（技能匹配、MimicLaw 兜底对话、MQTT runtime 硬件校验、部署确认、教学接力）
├── evaluation/ - Ground truth 结构评测模块，只承接生成质量对比
├── hardware-capability-ids.ts - 规范组件 id 与 canonical capability id 常量中心，消除字符串漂移
├── hardware-component-aliases.ts - 旧 capability id 兼容边界，只承接历史别名到规范能力的映射
├── hardware-components.ts - 场景组件真相层与运行时兼容投影，统一沉淀 category/notes/typeVersion 定义
├── hardware-service.ts - 硬件组件查询与推断
├── mqtt-hardware-runtime.ts - MQTT 心跳解析、workflow/command 封装与硬件 runtime store
├── intake-agent.ts - 入口代理（保留旧 API，转发到 Orchestrator）
├── llm-client.ts - LLM 调用封装，支持 LLM 调试 trace 与未配置场景降级
├── mcp-client.ts - MCP 工具调用封装
├── node-type-versions.ts - n8n 节点 typeVersion 最小值配置
├── orchestrator-hints.ts - 已归档的启发式关键词清单，当前不接入主链路
├── orchestrator/ - Orchestrator 子模块（语义发现/响应构造/工作流归一化）
├── orchestrator.ts - Refactor-3 总编排器（AI 语义发现 → 反思 → 组合 → 验证）
├── prompts/ - 提示词与组件库（含子模块 CLAUDE.md）
├── prompts.ts - 提示词入口聚合
├── prompt-copy.ts - Agent 统一引导语文案中心
├── reflection-assessment-parser.ts - Reflection assessment 协议解析器，负责 JSON 修复、字段过滤与归一化
├── reflection-decision-policy.ts - Reflection 决策规则单一真相源，同时供 prompt 规则、fallback 与运行时 guard 复用
├── reflection-engine-hints.ts - 已归档的反思启发式清单，当前不接入主链路
├── reflection-engine.ts - 反思引擎（完整性检查、结构化反思产物、澄清动作建议与反思 trace，作为 policy + parser + prompt builder 的协议壳）
├── reflection-prompt-builder.ts - Reflection 提示词构建层，统一 system prompt 与 assessment prompt 的拼装
├── session-service.ts - 会话管理、状态机与编排 trace 事件总线
├── types.ts - Agent 领域类型中心，含 trace 协议定义
├── workflow-architect/ - 工作流架构子模块（JSON 提取、node 归一化、scene 安全网、上下文预算）
├── workflow-architect.ts - 工作流生成与验证循环主壳，Refactor-5 Phase 4 后已收敛到 426 行，只保留公开 API、LLM 循环与子模块调度
└── workflow-service.ts - 工作流存取与中转

架构决策
- 组件选择器将需求分析显式化，避免提示词依赖隐式推理。
- Blueprint 增加 componentSelection 保留旧字段以保证兼容。
- Orchestrator 持有 Refactor-3 的多轮状态，IntakeAgent 仅保留兼容入口职责。
- Refactor-4 起，确认构建后的组合-校验-修复循环优先收敛到 `agent-loop.ts`，避免 `orchestrator.ts` 继续吸收验证回路。
- Refactor-5 起，`confirm` 的主生成路径优先走 `WorkflowArchitect`；主路径未产出可用结果时优先复用 session 内最近一次成功的复杂工作流，只有历史复杂工作流也不可复用时才降级到 `ComponentComposer`，避免 discovery 阶段抽取出的实体/拓扑语义在规则层被截断。
- Refactor-5 起，`evaluation/` 只允许做 ground truth 对比，不允许把 scene JSON 注入运行时生成管线。
- LLM 配置缺失时允许 server 启动，真正调用阶段再返回明确错误，避免联调被启动门槛阻塞。
- 健康探测超时与生成超时拆开配置，避免一个阈值同时绑住“可用性判断”和“业务生成”两种语义。
- 发现、反思、重型生成使用不同 timeout 语义：`discovery` 追求快速 hint，`reflection` 追求稳定澄清，`generation` 才允许长时推理。
- 编排 trace 统一写入 SessionService，再由 WS 向前端流式推送，避免日志、会话状态、调试 UI 各维护一套过程真相。
- 澄清问题通过结构化 clarificationQuestions 回到前端，避免 UI 从 guidance 文案里反向解析问题列表。
- 所有 `n8n-nodes-base.code` 节点的最小可执行参数必须复用 `src/utils/code-node-parameters.ts`；禁止 composer / architect / prompt template 再次各自手写默认 `jsCode` 或空参数。
- 配置阶段与 dialogue-mode 的组件挂载结果只能由 `digital-twin-scene.ts` 投影成 scene payload；禁止 server、renderer 或 prompt 层再次各自猜 category->model/interface 映射。
- canonical 外部挂载接口是 5 个通用口 + 1 个 HDMI 口：`port_1`、`port_2`、`port_3`、`port_4`、`port_hdmi`、`port_7`；`mic` / `speaker` 只能出现在 `top_controls`，不得再占用外部挂载模型。
- raw 物理口别名（如 `3-1.3`、`3-1.6`、`/dev/hdmi`）进入 `digital-twin-scene.ts` 前后都必须收敛成 canonical `port_*`；否则 backend 正式 scene 和前端 assembly overlay 会各自命中不同接口锚点。
- 配置阶段 `confirm-node` 返回的 `digitalTwinScene` 只可作为过渡态；真正落盘后的挂载结果必须以 `config-state -> digital-twin-scene.ts` 的 read-after-write 投影为准，避免响应先到、状态未稳时把旧 scene 当成真相源。
- dialogue-mode 对“特定技能请求 / 普通对话”的划分只能由 backend 输出 `branch/relay` 真相源；前端只可代理 MimicLaw WebSocket，不得自己从原文反推教学跳转或 WS 透传。
- MQTT 心跳与 command 回包必须先进入 `mqtt-hardware-runtime.ts`，再投影成 dialogue-mode / digital-twin scene；禁止 dialogue-mode 直接把 mock hotplug 当成硬件真相。
- Orchestrator 当前主链路不再消费硬编码 HINTS，也不再对 low-signal 输入跳过 discovery；启发式关键词被归档到独立模块，能力发现只保留 registry 检索、AI semantic discovery 与 reflection，便于单独调试 Agent 的自适应识别能力。
- ReflectionEngine 当前也不再消费文本关键词启发式；完整性判断只信显式能力，澄清问题与下一步动作优先交给 LLM 反思，便于单独观察 AI-first 的需求识别能力。
- Reflection 的 prompt 规则、fallback 兜底与运行时 hard guard 现在必须共用 reflection-decision-policy.ts；禁止再次把同一条显式性规则分别写在 prompt 文案、fallback 和代码分支里。
- Reflection 的协议解析与 JSON 修复现在必须共用 reflection-assessment-parser.ts；禁止再次把 normalize/safeParse 逻辑塞回 reflection-engine.ts。
- Reflection 的 system/user prompt 拼装现在必须共用 reflection-prompt-builder.ts；禁止再次把 prompt 模板和历史摘要逻辑塞回 reflection-engine.ts。
- hardware-components.ts 现在只允许“场景定义 -> 运行时能力”这一个方向；旧 capability id 兼容统一下沉到 hardware-component-aliases.ts，禁止双向渗漏。
- hardware-capability-ids.ts 统一承载 canonical component/capability id；真相层与兼容层都必须引用它，禁止再次手写相同字符串。

开发规范
- 新增/删除/移动 agents 内文件必须同步本文件。
- 组件选择规则修改需同步单元测试。

变更日志
- 2026-01-17: 新增 component-selector.ts，扩展 blueprint 以传递组件建议。
- 2026-01-20: 新增 node-type-versions.ts，集中管理节点版本号。
 - 2026-01-28: 新增 config-agent.ts 与 config-agent-service.ts，补齐硬件配置流程。
- 2026-02-04: 新增 config-workflow-orchestrator.ts，将配置编排职责从 session-service.ts 解耦。
- 2026-02-07: 新增 prompt-copy.ts，统一维护 Intake/Config/Orchestrator 引导文案。
- 2026-02-10: 新增 workflow-architect/ 子模块，拆分多人物身份分支构建与连线通用逻辑。
- 2026-03-06: 新增 capability-registry.ts 与 reflection-engine.ts，支持能力驱动的多轮需求澄清。
- 2026-03-06: 新增 component-composer.ts，改为基于能力的工作流组合并移除场景模板依赖。
- 2026-03-06: 新增 orchestrator.ts，并将 intake-agent.ts 重构为调用 Orchestrator 的轻量代理。
- 2026-03-06: agent-config.ts 与 llm-client.ts 支持无 LLM 配置降级启动，避免联调时因秘钥缺失直接启动失败。
- 2026-03-06: agent-config.ts 新增 AGENT_LLM_HEALTH_TIMEOUT_MS，支持单独调节 AI 健康探测超时。
- 2026-03-06: Orchestrator/ReflectionEngine/ComponentComposer/LLMClient 接入 session trace，支持后端调试日志与前端流式过程可视化。
- 2026-03-06: guidance 响应新增 clarificationQuestions，前端可结构化展示澄清问题。
- 2026-03-07: Orchestrator 新增 AI 语义发现增强，ReflectionEngine 改为输出结构化反思摘要与下一步动作建议，降低澄清阶段对硬编码选项工厂的依赖。
- 2026-03-07: agent-config.ts 新增 AGENT_LLM_DISCOVERY_TIMEOUT_MS 与 AGENT_LLM_REFLECTION_TIMEOUT_MS；低信号输入会跳过昂贵的 discovery/reflection LLM 调用，避免寒暄把链路卡死。
- 2026-03-08: 新增 orchestrator-hints.ts，将 Orchestrator 的 HINTS 关键词归档出主文件并暂时停用；当前能力发现以 registry + AI discovery 为主，方便调试自适应需求识别链路。
- 2026-03-08: 新增 reflection-engine-hints.ts，将 ReflectionEngine 的关键词判定、候选能力 hints 与 low-signal 跳过逻辑归档出主文件并暂时停用；反思阶段改为只信显式能力与 LLM 结构化产物。
- 2026-03-08: Orchestrator 移除 `shouldSkipSemanticDiscovery`，`你好` 这类 low-signal 输入也会真实进入 discovery + reflection 两轮 LLM，方便完整调试 AI-first 需求识别链路。
- 2026-03-08: hardware-components.ts 改为单一真相源：场景定义按 category 合并能力，并直接派生运行时 `HARDWARE_COMPONENTS`、旧 capability 别名与 lookup 名称；CapabilityRegistry/ComponentComposer/HardwareService/WorkflowArchitect 同步切到这套新表。
- 2026-03-08: 新增 hardware-component-aliases.ts，将历史 capability id 兼容映射从 hardware-components.ts 中抽离；现在业务层只见规范能力 id，旧别名只留在 registry 边界。
- 2026-03-08: 新增 hardware-capability-ids.ts，统一声明 canonical capability id；hardware-components.ts 与 hardware-component-aliases.ts 改为引用常量，进一步收紧单一真相源。
- 2026-03-08: Orchestrator 移除 `missingFields -> 静态澄清选项` 工厂；澄清卡片改为优先消费 ReflectionEngine 的 `suggested_user_actions`，没有时再直接复用 LLM 产出的 `clarification_questions.options`，避免旧模板把 AI 澄清链路拖回硬编码死循环。
- 2026-03-08: Orchestrator 在上一轮为 `reject_out_of_scope` 时只用最新用户输入开启新意图窗口；发现与反思不再把已拒绝需求继续拼进下一轮，避免“遛狗 -> 看家的呢”仍被旧拒绝上下文污染。
- 2026-03-08: 新增 reflection-decision-policy.ts，将 Reflection 的规则文案与运行时 decision guard 收敛到单一真相源，消除 prompt 规则和 hard guard 双份维护的分叉风险。
- 2026-03-08: Reflection fallback 缺失项推断、模板问题与置信度估算也迁入 reflection-decision-policy.ts；reflection-engine.ts 退化成单纯的 LLM 调用、解析与协议拼装外壳。
- 2026-03-08: 新增 reflection-assessment-parser.ts，将 Reflection 的 JSON 修复、字段过滤与协议归一化从 reflection-engine.ts 抽离，进一步收紧“策略”和“解析”两层职责边界。
- 2026-03-09: 新增 reflection-prompt-builder.ts，将 Reflection 的 system prompt 与 assessment prompt 拼装从 reflection-engine.ts 抽离，进一步收紧“调度”和“提示词构建”两层职责边界。
- 2026-03-13: 新增 agent-loop.ts，将确认构建后的组合/验证循环从 orchestrator.ts 抽离，并引入 Refactor-4 的三类验证反馈语义。
- 2026-03-13: 新增 orchestrator/ 子模块，将 capability discovery、response builder、workflow config normalizer 从 orchestrator.ts 中抽离，确保总编排器收敛到 <500 行主流程。
- 2026-03-13: 新增 workflow-architect/prompt-context.ts，将 WorkflowArchitect 的工具摘要、节点上下文摘要与历史压缩从主文件中抽离，开始接入 progressive disclosure。
- 2026-03-13: 新增 workflow-architect/token-budget.ts，将系统 prompt、工具摘要与历史消息 token 预算显式化，并用单测锁住 Refactor-4 量化指标。
- 2026-03-13: component-composer.ts、workflow-config-normalizer.ts、workflow-architect.ts 与 prompts 改为共享 code 节点最小模板，修复 SCREEN/HAND/SPEAKER/WHEEL 在确认构建后因空 `jsCode` 被 validator 打回的问题。
- 2026-03-14: CapabilityDiscovery 开始输出结构化 `entities` 与 `topologyHint`，并写入 OrchestratorState；Prompt 层新增 context-fragment.ts，为 Refactor-5 的上下文工程与 TurnContext diffing 打底。
- 2026-03-14: Orchestrator.confirm() 主路径切到 WorkflowArchitect，静态/动态 prompt fragment 通过 architect-system.ts 组装，ComponentComposer 降级为 fallback。
- 2026-03-14: 新增 evaluation/ground-truth-evaluator.ts，开始用 gesture/game/emo 三场景 ground truth 做结构化质量验收。
- 2026-03-14: WorkflowArchitect Phase 4 完成主拆分：新增 workflow-architect/scene/gesture-identity-flow.ts、audio-repair-flow.ts、result-flow.ts、assign-flow.ts，`workflow-architect.ts` 从 4136 行收敛到 426 行，并保留原有回归与 ground truth 验收全绿。
- 2026-03-14: Refactor-5 follow-up 将场景安全网 flags 与拓扑变更审计抽到 workflow-architect/scene/safety-net-controls.ts，同时增强 topology/entity/notes prompt 片段，开始把“分支拆分”约束更多前移到 prompt，而不是继续堆在后处理里。
- 2026-03-14: agent-config.ts 新增 `AGENT_SCENE_SAFETY_NETS` / `AGENT_DISABLE_SCENE_SAFETY_NETS`，scene safety net 可以通过 `.env` 精确开关，不必再改代码才能观察原始模型输出。
- 2026-03-15: scene safety net 新增 dormant 观测态与 `AGENT_DORMANT_SCENE_SAFETY_NETS`，音频修剪类安全网可以只报警不改写，用于验证退役安全性。
- 2026-04-01: 新增 digital-twin-scene.ts，配置阶段响应、config-state 查询与 dialogue-mode 硬件响应开始统一附带 digitalTwinScene，前后端不再各自猜默认挂载关系。
- 2026-04-05: digital-twin-scene.ts 收口为 5 个通用口 + HDMI 口，并把 microphone / speaker 改成 builtin top controls；wifi / mimiclaw 继续只保留运行时语义，不再渲染成外部模型。
- 2026-04-01: 新增 dialogue-mode/ 子模块，开始把 `/api/agent/chat?interactionMode=dialogue`、硬件校验与 start-deploy 收敛到后端真相源。
- 2026-04-01: hotplug 协议补齐 `connectedComponents`，`hardware-validation.ts` 改为 snapshot-first；缺失 `portId` 的组件不再被数字孪生假装挂到默认端口。
- 2026-04-01: ConfigAgent 的 `hot_plugging` 响应开始显式下发 5 口 `hardware_port` 选项，`confirmNodeConfig()` 也接受 `portId` 并统一归一到 canonical topology，mock 插拔终于能实时驱动配置态数字孪生。
- 2026-04-01: dialogue-mode 新增 `proxy_chat + relay` 分支；非特定技能表述现在由 backend 明确下发 MimicLaw WebSocket 透传指令，未知但明确的技能需求仍保留教学接力。
- 2026-04-05: 新增 mqtt-hardware-runtime.ts，开始以 MQTT heartbeat/command 协议作为硬件运行时真相源，并把 dialogue-mode / digital-twin scene 统一切到这份 backend-first 状态。
- 2026-04-15: `digital-twin-scene.ts` 开始复用 `mqtt-hardware-runtime.ts` 的物理口别名规范化，修复 raw `3-1.x` 端口进入正式 scene 时的接口映射歧义。
- 2026-04-01: dialogue-mode 新增 `dialogue-mode-router.ts`，MimicLaw vs A/B/C 的分流改由 backend LLM 语义判定，正则规则只保留为兜底，不再让硬编码词表主导产品行为。
- 2026-04-15: `session-service.ts` 新增最近一次复杂工作流缓存；`orchestrator.confirm()` 在 WorkflowArchitect 失败时优先复用历史复杂工作流，再降级到 ComponentComposer，降低 LLM 主路径抖动时的退化幅度。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
