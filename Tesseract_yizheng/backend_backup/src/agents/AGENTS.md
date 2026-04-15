# agents/ - Agent 核心编排与提示词层
> L2 | 父级: ../../AGENTS.md

成员清单
agent-config.ts: Agent 运行配置读取与默认值收敛。
component-selector.ts: 从用户意图与实体推导硬件/能力组合。
config-agent.ts: 工作流创建后的节点配置引导与确认链路。
config-agent-service.ts: ConfigAgent 创建入口，负责延迟解析 n8n API 配置，避免 backend 启动顺序把 client 固化死。
dialogue-mode/: 对话模式技能库、路由与硬件就绪态编排。
hardware-endpoint-defaults.ts: robot.local / ai.local / hardware-api 默认 endpoint 与 n8n env expression 真相源。
hardware-components.ts: 硬件组件目录与别名真相源。
intake-agent.ts: 教学模式入口 facade，把用户输入交给 orchestrator。
orchestrator.ts: 教学模式主协调器，驱动 discovery/reflection/summary/workflow-ready。
orchestrator/: 响应装配与蓝图归一化；024 起承担 clarification category 透传与 summary_ready Mermaid 拓扑预览。
prompts/: 工作流架构提示词系统；024 起节点命名规范改为中文业务场景名称。
reflection-assessment-parser.ts: 反思结果解析与 suggested action 清洗；024 起去掉 UI label 冗余前缀。
reflection-decision-policy.ts: 反思兜底策略与 blocking 判定；024 起仅 trigger/feedback 为阻塞项。
reflection-engine.ts: 反思循环核心，输出结构化 missing_info 与澄清建议。
reflection-prompt-builder.ts: 反思提示词构建；024 起强调“最小闭环=触发+反馈”与短标签约束。
session-service.ts: Session 状态与确认实体持久化。
types.ts: agent 共享类型；024 起补充 ClarificationCategory 与 option.category 强类型。
workflow-architect.ts: 工作流架构生成入口。
workflow-architect/: 工作流生成细分构建器与命名/语义助手。

法则
- teaching 模式的澄清上下文优先沿 `UI -> agent-service -> intake-agent -> orchestrator` 单向透传；仅当本轮缺失显式 category 且上一轮只剩一个 pending clarification category 时，允许 orchestrator 基于 pending state 做无歧义兜底。
- reflection 的 blocking 语义是业务规则，不要在 UI 层重新复制一套“哪些必须问”的判断。
- prompt 命名规则与运行时 name 规范必须一致；改其一时同步检查 prompts/ 与 node-name-generator.ts。
- robot.local / ai.local / hardware-api 这类 fallback URL 只能从 `hardware-endpoint-defaults.ts` 派生；prompt/template/registry/scene flow 不得再各自复制一份。
- `workflow-service.ts` 必须支持“n8n API 未配置”的 unavailable 降级态；调用方可以继续启动服务，但真正创建 workflow 时要拿到明确错误。
- `mqtt-hardware-runtime.ts` 对 workflow upload/stop 与 command ack 必须输出摘要日志，只能记 requestId/status/response 摘要，不能把整份 workflow payload 当成常规 info 刷屏。
- dialogue-mode 的 `start_deploy` 语义是“进入互动”，不是“上传到硬件”；真正端侧下发只能走 hardware workflow upload 链路。

变更日志
- 2026-04-09: 为 024-teaching-mode-logic-optimize 建立目录级地图，记录 clarificationContext 透传、最小闭环 blocking 规则、summary_ready Mermaid 拓扑与中文节点命名约束。
- 2026-04-09: teaching 模式新增单一 pending clarification category 的后端兜底确认；small-car/麦克纳姆别名与运行时中文节点命名继续向 orchestrator/selector 收口。
- 2026-04-12: 新增 hardware-endpoint-defaults.ts，统一 robot.local / ai.local / hardware-api fallback 与 n8n env-backed expression，移除 prompts.ts 旧入口聚合。
- 2026-04-12: mqtt-hardware-runtime.ts 开始输出 workflow upload/ack 摘要日志；dialogue-mode start_deploy 文案收紧为“开始互动/已进入互动”，避免和端侧下发混淆。
- 2026-04-12: workflow-service.ts / config-agent-service.ts 改为按请求延迟解析 n8n API 配置，修复 backend 先启动、embedded n8n 后就绪时的 `unauthorized`/永久禁用 client 问题。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
