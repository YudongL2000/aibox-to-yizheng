# refactor-4/
> L2 | 父级: ../CLAUDE.md

基于 AI Agent Harness Engineering 文章的架构审查与重构方案。
核心论点：脚手架而非模型决定 Agent 性能。

成员清单
HARNESS_ENGINEERING_REFACTOR.md: 架构重构设计文档，涵盖审查总览、五维对标分析、P0/P1/P2 三级重构方案、执行计划、验收标准。
REFACTOR4_AUDIT_REPORT.md: 重构实施审查报告，基于设计文档与代码交叉验证，涵盖逐 Lane 验证、量化指标复测、质量门违规、偏差清单与风险评估。

法则: 成员完整·一行一文件·父级链接·技术词前置

架构决策
- `docs/decisions/refactor-4/` 只放 Refactor-4 的设计真相源，不再混放启动脚本和执行资产。
- Refactor-4 的执行资产包统一放在 `../../iterations/refactor-4/`，由该模块独立维护自己的 `CLAUDE.md` 和成员清单。
- Refactor-4 执行资产包对齐 `Parallel Iteration Docs` skill，但以本仓库的 6 lane 矩阵、pane 顺序和 merge 顺序为最终真相源。

变更日志
- 2026-03-13: 将 Refactor-4 执行资产包迁到 `docs/iterations/refactor-4/`，当前目录只保留设计文档。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
