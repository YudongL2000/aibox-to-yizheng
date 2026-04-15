# e2e/
> L2 | 父级: ../../CLAUDE.md

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

成员清单
agent-workflow.test.ts: 验证 AgentService 下的多轮会话编排与工作流确认闭环，聚焦 Orchestrator 状态累积。
config-agent-flow.test.ts: 验证 HTTP API 下从需求输入到 ConfigAgent 完整配置完成的真实端到端路径。

架构决策
tests/e2e 只覆盖跨服务边界的长路径行为，不再依赖过时的 scenario-era workflow mock。

变更日志
2026-03-06: 建立 tests/e2e 的 L2 地图，收敛旧场景测试到 capability-driven 编排与配置闭环。
