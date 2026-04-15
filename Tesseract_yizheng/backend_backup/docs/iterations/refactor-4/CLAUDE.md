# refactor-4/
> L2 | 父级: ../CLAUDE.md

成员清单
ITER_REFACTOR4_PARALLEL.md: Refactor-4 并行执行清单，定义 6 lane 分支矩阵、固定 merge 顺序、harness 合同与验收门槛。
run-refactor4.md: Refactor-4 快速启动指南，包含 worktree/tmux 启动方式、环境变量、首次提示词与集成回归步骤。
refactor4_parallel_tmux.sh: Refactor-4 并行开发启动脚本，按固定 pane 顺序创建 5 个 feature lane 与 1 个 integrator worktree。
ITER_REFACTOR4_INTEGRATION_OUTPUT.md: Integrator 集成输出模板，记录 merge 顺序、冲突解决、回归结果与遗留风险。

架构决策
- `docs/iterations/refactor-4/` 是 Refactor-4 的执行真相层，集中维护 runbook、launcher、integration output，避免 `decisions/` 和 `scripts/` 跨目录耦合。
- 架构设计仍以 `../../decisions/refactor-4/HARNESS_ENGINEERING_REFACTOR.md` 为真相源；本目录只承接执行与落地。

开发规范
- 脚本、分支矩阵、merge 顺序、验收指标必须同构，任何一处变更都要同步本目录全部资产。
- 迭代脚本变更后至少执行 `bash -n refactor4_parallel_tmux.sh`。

变更日志
- 2026-03-13: 从 `docs/decisions/refactor-4/` 与 `docs/scripts/` 收敛出独立执行资产包模块。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
