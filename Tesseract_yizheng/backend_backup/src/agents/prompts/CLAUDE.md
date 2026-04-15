# prompts/ - 架构提示词与示例库
> L2 | 父级: ../../CLAUDE.md

目录结构
prompts/
├── architect-system.ts - 系统提示词构建器，汇总组件库/规则/示例
├── assembly-rules.ts - 组装规则与质量标准渲染
├── category-mapping.ts - 节点 category 分类规则（CAM/TTS/YOLO-RPS 等）
├── context-fragment.ts - Prompt fragment 基础设施，统一带 marker 的上下文切片组装与增量更新
├── error-patterns.ts - 常见错误模式与修复建议
├── few-shot-examples.ts - few-shot 示例（拓扑 + 组件组合）
├── fragments/ - Architect prompt 的静态知识切片（拓扑/notes/实体乘法/命名/game 专项）
├── node-name-generator.ts - 节点命名标准化（{type}_{category}_{action}_{detail}）
├── node-type-mapping.ts - category 到 n8n 节点类型映射（执行器强制 code）
├── node-templates.ts - 节点 parameters 空模板（业务值外置到 notes.sub）
├── prompt-variants.ts - 提示词变体定义
├── result-branch-rules.ts - 猜拳胜负分支规则（empty/draw/win/lose）与 IF 映射
├── sub-field-extractor.ts - notes.sub 字段抽取与默认值生成
├── title-generator.ts - 中文 title/subtitle 语义模板
└── workflow-components.ts - 工作流功能组件库（完整节点配置）

架构决策
- 组件库 + 组装规则驱动提示词，避免固定模板导致僵化。
- Few-shot 仅保留 topology/组件组合与关键节点说明，避免硬编码 JSON。
- Refactor-5 起，系统 prompt 通过静态 fragment + 动态 fragment 组装，避免 discovery/entity/validation 语义继续拼在单体字符串里。
- 端到端优化继续遵循“先增强 fragment，再观察 safety net 是否还能退役”的顺序；不要把场景知识重新塞回主流程 if/else。

开发规范
- 新增/删除/移动 prompts 内文件必须同步本文件。
- 节点配置示例必须符合 IF v2 + Set values + timeout 规范。

变更日志
- 2026-01-17: 新增 workflow-components.ts、assembly-rules.ts；更新系统提示词与示例结构。
- 2026-02-04: 新增 category/sub/title/name 四类元数据生成器，统一节点命名与 notes 语义字段。
- 2026-02-04: 新增 node-templates.ts，统一 parameters 空结构模板与最小字段保留策略。
- 2026-02-04: 新增 node-type-mapping.ts，统一执行器类型映射（HAND/SPEAKER/SCREEN -> code）。
- 2026-02-05: 新增 result-branch-rules.ts，统一胜负分支链路配置与 IF 分支映射规则。
- 2026-03-08: category/node-type/name/title/sub-field 规则补齐 `WHEEL`，并按场景真相层纠正执行器/识别器边界，避免提示词层继续沿用旧硬件表语义。
- 2026-03-14: 新增 context-fragment.ts，开始为 Refactor-5 的 fragment-based architect prompt 与 TurnContext diffing 提供基础设施。
- 2026-03-14: 新增 fragments/ 与动态 fragment 构造器，architect-system.ts 由单体字符串重构为可 diff 的 fragment 组装。
- 2026-03-14: 新增 game-rps-pattern fragment，并补上“单能力单节点”“比较逻辑不得占位字符串”等提示词约束，作为 E2E 优化的第一优先级知识切片。
- 2026-03-15: 新增 emotion-interaction-pattern fragment，把 emo 场景的双感知链、单 ASR/LLM-EMO 和 happy/sad 独立反应链前移进 prompt。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
