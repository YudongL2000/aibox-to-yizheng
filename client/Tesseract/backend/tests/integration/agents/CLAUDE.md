# agents/
> L2 | 父级: ../CLAUDE.md

Ground truth 与 Agent 端到端结构评测测试目录。这里允许读取 docs/development/scene 的 JSON，但只用于对比，不用于生成。

成员清单
ground-truth.test.ts: 三场景 ground truth 自评与结构评分测试，锁住评估器的对比语义。
safety-net-fixtures.ts: SafetyNet 对照测试的场景输入库，集中管理 gesture/emo/game workflow fixture 与 ground truth 加载器。
safety-net-matrix.test.ts: Refactor-5 SafetyNet 对照测试，逐场景比较关键 safety net 开关前后的 ground truth 得分与拓扑变化。
quality-baseline.ts: Refactor-5 质量门静态阈值真相源，定义三场景最低 coverage / category / nodeCount 与 SafetyNet 退步预算。
quality-gate.test.ts: Refactor-5 CI 质量门入口，锁定全网开启质量基线与关键 SafetyNet 的 coverage 退步幅度。

法则: 测试可以读 ground truth，运行时代码不可以；评测阈值要服务于回归守护，不要变成场景模板注入。质量门优先使用 ground-truth 派生轻缺口 fixture，而不是手写严重残缺 workflow。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
