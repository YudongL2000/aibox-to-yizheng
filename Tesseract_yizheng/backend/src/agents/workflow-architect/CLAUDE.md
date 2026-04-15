# workflow-architect/
> L2 | 父级: ../CLAUDE.md

成员清单
connection-utils.ts: 连线通用工具，负责入边查找、主输出重设与边去重。
gesture-identity-builder.ts: 手势多人物身份分支构建器，负责 FACE-NET/IF 节点标准化与派生。
json-extractor.ts: LLM 输出的 reasoning/JSON 提取与修复层，统一处理 fenced JSON、平衡括号与 repair 调用。
node/: WorkflowArchitect 的节点结构层，承接 notes 补全、节点归一化与拓扑图操作。
prompt-context.ts: WorkflowArchitect 的上下文代理层，负责工具摘要、节点上下文摘要与历史压缩；Refactor-5 中继续承接 fragment 之外的运行时上下文。
scene/: 场景安全网后处理器，现已拆成 gesture/audio/game/emo/result/assign 六块修复器，并新增统一的 safety-net 控制与观测层。
token-budget.ts: Prompt 预算工具，提供系统 prompt、工具摘要与历史消息的近似 token 估算。

法则: 成员完整·一行一文件·父级链接·技术词前置；多轮验证场景优先走 fragment diff，而不是反复重发整份 system prompt。Refactor-5 Phase 4 已把主文件里的主要场景安全网拆进 `scene/`，`workflow-architect.ts` 只保留公开 API、LLM 循环与子模块调度；安全网 flags 与变更观测统一放在 `scene/safety-net-controls.ts`。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
