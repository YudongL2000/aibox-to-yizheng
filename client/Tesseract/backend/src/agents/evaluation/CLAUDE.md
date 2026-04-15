# evaluation/
> L2 | 父级: ../CLAUDE.md

工作流生成质量评估模块。ground truth JSON 只允许被读取用于对比，不允许注入到生成链路。

成员清单
ground-truth-evaluator.ts: 结构评估器，对比节点数、category 分布、fan-out 拓扑、notes 完整率与变量流完整性。

法则: 评测器只做对比，不参与生成；任何把 scene JSON 引回 src/ 运行时的做法都违反 AI-native 铁律。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
