# orchestrator/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/src/agents/CLAUDE.md

成员清单
capability-discovery.ts: 语义发现与能力检索层，封装 registry 检索、LLM discovery、结构化实体提取与 topology hint 归档。
response-builder.ts: 响应构造层，统一 summary、blueprint、guidance/workflow_ready 状态输出，并负责 AI-native 澄清交互的选项筛选与兜底补全。
workflow-config-normalizer.ts: confirm 前工作流归一化层，负责 notes/sub 清洗、结构校验与自动修复。

法则: 让 Orchestrator 只负责流程编排，发现/响应/归一化各自下沉到子模块；Refactor-5 起 discovery 负责把实体和拓扑语义保存进 state，而不是只回能力 id。澄清交互优先消费 Reflection 的 AI 产物，fallback 只能做补位，不能重新退回硬编码问答墙。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
