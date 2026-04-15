# tests/unit/agents/ - Agent 单元测试集
> L2 | 父级: ../../CLAUDE.md

目录结构
tests/unit/agents/
├── dialogue-mode/ - skills JSON repository 专属测试目录
├── agent-loop.test.ts - Refactor-4 确认闭环测试，覆盖 autoFixable / needsUser / valid 三类反馈
├── agent-config.test.ts - 配置解析与默认值测试
├── agent-db.test.ts - 数据库初始化相关测试
├── agent-logger.test.ts - 日志记录测试
├── architect-system.test.ts - 系统提示词渲染测试
├── capability-registry.test.ts - 能力注册表索引、端点映射与依赖校验测试
├── component-composer.test.ts - 组件组合器能力映射、依赖补全与拓扑构建测试
├── component-selector.test.ts - 组件选择器行为测试
├── context-fragment.test.ts - Refactor-5 fragment diffing 测试，锁住 delta prompt 与 validation feedback 切片更新
├── config-agent.test.ts - 硬件配置流程测试（含 CONFIG_SKIP_CATEGORIES 跳过逻辑）
├── config-workflow-orchestrator.test.ts - 配置流程编排器测试
├── hardware-component-aliases.test.ts - 旧 capability alias 归一化与源码边界护栏测试
├── hardware-service.test.ts - 硬件服务推断测试
├── intake-agent.test.ts - IntakeAgent 委托 Orchestrator 的包装层测试
├── mcp-client.test.ts - MCP 客户端包装测试
├── node-dependency-rules.test.ts - 节点依赖规则验证测试（SPEAKER/TTS、YOLO/CAM、HAND/ASSIGN）
├── orchestrator.test.ts - Refactor-3 总编排器测试（AI 语义发现/澄清/总结/确认）
├── prompt-variants.test.ts - 提示词变体选择测试
├── refactor4-acceptance.test.ts - Refactor-4 量化验收测试（预算、文件体积、统一验证入口、验证闭环成功率）
├── reflection-assessment-parser.test.ts - 反思协议解析器测试（JSON 修复、字段过滤、归一化）
├── reflection-engine.test.ts - 反思引擎完整性检查、结构化反思产物与澄清问题测试
├── reflection-prompt-builder.test.ts - 反思提示词构建器测试（规则注入、历史裁剪、能力摘要）
├── result-branch-rules.test.ts - 猜拳胜负分支规则映射测试
├── session-service.test.ts - 会话状态测试
├── safety-net-controls.test.ts - scene safety net enabled/disabled/dormant 三态与 dormant 解析测试
├── workflow-architect.test.ts - 工作流生成与校验测试
├── workflow-architect-prompt-context.test.ts - WorkflowArchitect 上下文代理测试（历史压缩、节点摘要、工具摘要）
├── workflow-architect-token-budget.test.ts - WorkflowArchitect token 预算测试（工具摘要、系统 prompt、10 轮历史压缩）
└── workflow-deployer.test.ts - 工作流部署测试

架构决策
- 测试按模块职责拆分，覆盖提示词与组件选择核心逻辑。

开发规范
- 新增/删除/移动测试文件必须同步本文件。

变更日志
- 2026-01-17: 新增 component-selector.test.ts。
- 2026-02-04: 新增 config-workflow-orchestrator.test.ts，补齐编排层单元测试。
- 2026-02-04: 新增 node-dependency-rules.test.ts，验证节点依赖规则；扩展 config-agent.test.ts 覆盖跳过逻辑。
- 2026-02-05: 新增 result-branch-rules.test.ts，覆盖 empty/draw/win/lose 分支配置与 IF 映射兜底。
- 2026-03-06: 新增 reflection-engine.test.ts，覆盖缺失信息识别、问题生成与置信度决策。
- 2026-03-06: 新增 capability-registry.test.ts，覆盖能力检索、端点别名匹配与组合依赖校验。
- 2026-03-06: 新增 component-composer.test.ts，覆盖能力驱动组合与自动补齐依赖。
- 2026-03-06: 重写 intake-agent.test.ts 为包装层测试，并新增 orchestrator.test.ts 覆盖 Refactor-3 编排闭环。
- 2026-03-07: orchestrator/reflection-engine 测试新增 AI 语义发现、结构化反思摘要与下一步动作建议断言，防止澄清流程退回硬编码映射。
- 2026-03-07: agent-config/reflection-engine/orchestrator 测试补上 discovery/reflection 独立 timeout、低信号输入跳过 LLM 与非阻塞缺失项不再触发多余澄清。
- 2026-03-08: orchestrator.test.ts 调整“跟随小车”回归：在停用 Orchestrator HINTS 后，用 discovery timeout 模拟纯 AI 识别失败，确认系统不会再偷偷注入 follow-car fallback。
- 2026-03-08: reflection-engine.test.ts 调整为 AI-first 预期：不再从文本硬判 condition/logic，也不再对 low-signal 输入跳过 LLM，防止测试继续锁死旧启发式行为。
- 2026-03-08: orchestrator.test.ts 调整 low-signal 回归：`你好` 现在也会进入 discovery + reflection 两轮 LLM，防止测试继续依赖旧的 semantic discovery skip。
- 2026-03-08: capability-registry/component-composer/orchestrator/hardware-service/reflection-engine 测试切到场景真相层的规范 capability id（如 `face_net.face_recognition`、`wheel.movement_execute`），并补上旧 id 仅作兼容别名的断言，防止新旧硬件表再次分叉。
- 2026-03-08: 新增 hardware-component-aliases.test.ts，约束旧 capability id 只能存在于兼容边界文件，避免历史命名重新渗回业务源码。
- 2026-03-08: orchestrator.test.ts 新增两条护栏：澄清交互卡必须直接复用 AI 产出的 question/suggestion 选项，reject 后的下一条用户输入必须开启新意图窗口，防止旧拒绝上下文污染后续需求。
- 2026-03-08: 新增 reflection-assessment-parser.test.ts，锁住 Reflection parser 的 JSON 修复、字段过滤与协议归一化边界，防止解析容错逻辑重新回流到 engine。
- 2026-03-09: 新增 reflection-prompt-builder.test.ts，锁住 Reflection system/user prompt 的规则注入与历史裁剪边界，防止 prompt 拼装逻辑重新回流到 engine。
- 2026-03-13: 新增 agent-loop.test.ts，锁住确认闭环的三类验证反馈分流与自动修复边界。
- 2026-03-13: 新增 refactor4-acceptance.test.ts，将 Refactor-4 的 token 预算、文件体积、统一验证入口与验证闭环成功率收敛为可执行验收门。
- 2026-03-13: 新增 workflow-architect-prompt-context.test.ts，锁住 progressive disclosure 的历史压缩与节点上下文摘要边界。
- 2026-03-13: 新增 workflow-architect-token-budget.test.ts，锁住 Refactor-4 的工具摘要、系统 prompt 与 10 轮历史压缩预算。
- 2026-03-13: component-composer.test.ts 与 architect-system.test.ts 新增 code 节点最小模板守护，防止执行器节点重新退回空 `parameters`。
- 2026-03-14: 新增 context-fragment.test.ts，锁住 Refactor-5 的 fragment delta 组装与 validation feedback 覆盖更新边界。
- 2026-03-14: architect-system.test.ts 与 workflow-architect.test.ts 新增“结果分支拆分提示词”与“scene safety-net flags 可禁用”断言，开始把 Refactor-5 的安全网退役过程收敛到可观测、可回归的状态。
- 2026-03-14: agent-config.test.ts 新增 scene safety net 环境变量解析断言，防止 `.env` 开关与 WorkflowArchitect flags 再次脱节。
- 2026-03-14: reflection-prompt-builder/orchestrator/architect-system/workflow-architect 测试新增 E2E 优化护栏：澄清动作不得为空、单能力单节点约束、game 场景按手势分裂 HAND、emo 场景重复 ASR/LLM-EMO 归一化。
- 2026-03-15: 新增 safety-net-controls.test.ts，并扩展 agent-config.test.ts 覆盖 dormant 观测态与 `AGENT_DORMANT_SCENE_SAFETY_NETS`，防止安全网退役逻辑再次回流成二元开关。
- 2026-04-02: 新增 dialogue-mode/skill-library-repository.test.ts，锁住教学完成后的 skill JSON 落盘、端口折叠与 dialogue preview 导出。
- 2026-04-12: orchestrator.test.ts 新增零显式 capability 的 confirm 回归，锁住 `summary_ready -> confirm` 必须继续生成最小工作流，避免重新退回 guidance 循环。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
