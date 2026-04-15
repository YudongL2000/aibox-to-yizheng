# refactor-5/
> L2 | 父级: ../CLAUDE.md

基于 Refactor-4 后首次端到端测试的差距分析。
核心论点：LLM 上下文不足是工作流质量的瓶颈——通过上下文工程让 LLM 自主生成正确工作流，而非用模板替代 LLM 思考。

成员清单
SCENE_DRIVEN_COMPOSITION.md: AI-Native 工作流组合设计文档，涵盖三场景 ground truth 分析、上下文工程方案（Contextual Fragment 模式 + TurnContext Diffing + discovery 实体提取 + architect prompt 增强 + 管线统一）、WorkflowArchitect 拆分计划、Codex 架构借鉴、ground truth 验证体系与执行矩阵。
EXECUTION_PLAN.md: Codex 串行执行手册，8 个 Phase（P0 类型基础 → P1 Discovery 增强 → P2 Prompt Fragment 化 → P3 Composition 统一 → P4 Architect 拆分 → P5 Ground Truth 验证 → P6 TurnContext Diffing → P7 端到端验证），每步含精确文件路径、代码片段、验证命令与提交信息。
E2E_OPTIMIZATION.md: 三场景端到端测试审核与优化执行文档。基于 6971 行生产日志诊断三个问题（澄清交互回退、game 逻辑缺失、emo 节点重复），给出 P0/P1/P2 分层修复方案与 safety net 渐进式验证策略。
QUALITY_STABILIZATION.md: 工作流质量稳定化执行文档。基于 SafetyNet 对照矩阵 (096d63f) 的架构反思，将 9 个 safety net 分为 T1(模板替换)/T2(结构补全)/T3(卫生清理) 三梯队，按四阶段执行：P1 瓦解 T1（emo 降级为增量补全 + 新增 emo fragment）→ P2 削减 T2（gesture/game fragment 增强）→ P3 CI 质量门 → P4 T3 稳态化。
QUALITY_STABILIZATION_SUMMARY.md: Refactor-5 质量稳定化总结文档，汇总质量门执行、Ground Truth 对比、SafetyNet 矩阵结论，以及相对重构前的质量增进与剩余边界。

架构决策
- `docs/decisions/refactor-5/` 只放 Refactor-5 的设计文档，执行资产未来放 `docs/iterations/refactor-5/`。
- 场景 ground truth 仅用于验证工作流质量，绝不注入生成管线。
- 借鉴 Codex 的 Contextual Fragment 模式（带标记的模块化 prompt 组装）和 TurnContext Diffing（多轮只发 delta）。
- P0: discovery 实体提取、architect prompt 增强（fragment 化）、confirm 路径统一走 LLM。P1: WorkflowArchitect 拆分、ground truth 自动化验证。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
