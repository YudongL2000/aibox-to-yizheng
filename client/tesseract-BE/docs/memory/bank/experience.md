# experience

## Validated Practices

- 先写架构决策文档，再进入大规模重构，能明显降低后续反复返工。
- 把 capability / hardware 定义收成单一真相源，能显著减少 Agent 行为和配置漂移。
- 将健康探测、discovery、reflection、generation 的 timeout 拆开，比单一 timeout 更稳。
- 后端 trace 与前端可视化调试联动后，AI-native 行为问题更容易被真实定位，而不是靠猜。
- SafetyNet 退役要按场景逐条做对照实验；`AGENT_SCENE_SAFETY_NETS=none` 只适合暴露原始缺陷，不适合拿来判断哪条安全网已经可删。
- 设计 SafetyNet 退役测试时，要先避开 generic normalizer 的前置裁剪规则；否则你以为在测 scene safety net，实际上在测更底层的 node cleanup。
- 对照测试一旦超过 800 行，优先抽离 fixture 库而不是继续在测试文件里堆 workflow 常量；矩阵文件应该只承载实验逻辑与断言。
- T1 级 safety net（完整模板替换）会切断 prompt engineering 的真实反馈回路；如果目标是 AI-native，第一优先级不是继续强化模板，而是把它降级成增量补全器。
- 要评估“prompt 变强后 SafetyNet 还剩多少必要性”，fixture 最好从 ground truth 派生轻缺口版；这样测到的是剩余退步幅度，而不是严重缺图下的抢救能力。
- 质量门和对照矩阵不是一回事：前者负责锁最低交付线，后者负责衡量 SafetyNet 还能不能退役。两者混在一个测试里，阈值会失真。
- `dormant` 是安全网退役前最稳的过渡态：先影子执行、只记 warning，不改写真实 workflow；等真实日志长期不再触发，再考虑彻底 disable。
- 写质量总结时，必须同时报告“全网开启时相对 Ground Truth 的当前对齐度”和“单网关闭后的退步幅度”；`delta = 0` 只说明当前结构化 fixture 没退步，不足以证明某条 SafetyNet 已可删除。
- 质量门、矩阵和 Ground Truth 回放全绿，只能说明“实验室内收敛”；是否真正稳定，必须再跑真实 `chat -> confirm -> workflow/create` E2E，并从日志反提 workflow JSON 做二次评估。
- `workflow_ready` 不是端到端闭环的最强证据；对 Agent 来说，更可靠的成功标志是日志里出现 `ConfigWorkflowOrchestrator: ConfigAgent initialized`，因为它证明 workflow 已真正创建并进入配置阶段。
- 总结文档必须区分 stabilized profile 和 raw profile；raw 去网模式适合裸能力对照，不适合直接充当交付验收配置。

## Repeated Pitfalls

- 一旦 `Orchestrator` 或 `WorkflowArchitect` 继续吸收策略、协议、trace、fallback，文件会迅速变成不可维护的厚层。
- 用 hint-style 硬编码去“救”识别能力，短期有效，长期会破坏 AI-native 评估。
- 把新知识直接写进长期文档，最终会把 memory 体系变成膨胀的杂物间。

## Effective Workflow

- 新事实先记 `daily/`，只把稳定内容晋升到 `bank/`。
- 在做架构级调整前，先对齐目录地图和长期目标，再落实现。
