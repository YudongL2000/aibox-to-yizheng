# agents/
> L2 | 父级: ../CLAUDE.md

成员清单
agent-config.test.ts: Agent 配置与 timeout 规则测试，锁住降级启动与超时口径。
agent-db.test.ts: Agent 数据库初始化与路径行为测试。
agent-logger.test.ts: Agent 日志记录器测试。
agent-loop.test.ts: 组合-验证-修复闭环测试。
architect-system.test.ts: WorkflowArchitect 系统拼装测试。
capability-registry.test.ts: 能力注册表检索与映射测试。
component-composer.test.ts: 组件组合器测试。
component-selector.test.ts: 组件选择策略测试。
config-agent.test.ts: 硬件配置流程与 mock 接口位选择测试。
config-workflow-orchestrator.test.ts: 配置编排器测试。
context-fragment.test.ts: Prompt 上下文片段测试。
digital-twin-scene.test.ts: 数字孪生投影测试，锁住“同一物理硬件只投影一次”、5 口接口与 builtin top controls 的唯一真相源。
dialogue-mode/: 对话模式子目录测试，守 skills 库与 dialogue-mode 专属契约。
hardware-component-aliases.test.ts: 硬件能力别名兼容测试。
hardware-service.test.ts: 硬件查询与推断测试。
intake-agent.test.ts: 入口代理兼容测试。
mcp-client.test.ts: MCP 客户端桥接测试。
mqtt-hardware-runtime.test.ts: MQTT 硬件运行时测试，锁住 heartbeat 解析、5 口映射与 workflow / command 封装。
node-dependency-rules.test.ts: 节点依赖规则测试。
orchestrator.test.ts: 总编排器测试。
prompt-variants.test.ts: Prompt 变体测试。
reflection-assessment-parser.test.ts: Reflection 协议解析测试。
reflection-engine.test.ts: Reflection 引擎测试。
reflection-prompt-builder.test.ts: Reflection prompt 构建测试。
result-branch-rules.test.ts: 结果分支规则测试。
safety-net-controls.test.ts: 场景安全网控制测试。
session-service.test.ts: 会话状态机与 trace 总线测试。
title-generator.test.ts: 标题生成测试。
types.test.ts: Agent 类型结构测试。
workflow-architect-prompt-context.test.ts: WorkflowArchitect prompt 上下文测试。
workflow-architect-token-budget.test.ts: WorkflowArchitect token 预算测试。
workflow-architect.test.ts: 工作流架构测试。
workflow-deployer.test.ts: 工作流部署测试。

法则
- 这里的测试优先锁住 Agent 真相源：配置态、对话态、数字孪生投影与编排状态不能各自长出第二套解释。
- 凡是 physical component -> scene model 的投影逻辑，都必须在这里有最小回归，避免“一个硬件被投影成多个模型”的回归再次出现。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
