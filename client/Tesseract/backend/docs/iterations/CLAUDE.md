# iterations/
> L2 | 父级: ../CLAUDE.md

成员清单
refactor-4/: Refactor-4 执行资产包模块，集中放并行执行清单、运行指南、启动脚本与集成输出模板。

架构决策
- `docs/iterations/` 只承载“某次迭代如何执行”的成套资产，不承载架构设计真相源。
- 每个迭代目录必须自带 `CLAUDE.md`，并把脚本、runbook、integration output 放在同一模块，避免跨目录成员清单。

开发规范
- 新增迭代时，优先在这里建立独立模块，再从 `docs/decisions/` 引用设计文档。
- 迭代专属脚本默认跟随迭代目录，不放进 `docs/scripts/`。

变更日志
- 2026-03-13: 新增 iterations 模块，作为并行开发执行资产的统一挂载点。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
