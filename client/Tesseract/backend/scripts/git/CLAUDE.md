# scripts/git/
> L2 | 父级: ../CLAUDE.md

成员清单
git-prune-merged-branches.sh: 清理已并入基线分支的本地并发开发分支，默认 dry-run，保护当前分支、保护分支与 worktree 分支。

架构决策
- `scripts/git/` 只放仓库治理脚本，不承载发布、测试、迁移逻辑。
- 分支清理必须先列候选，再显式 `--apply` 删除；所有破坏性 git 操作默认只观察，不默认执行。
- 保护规则必须集中在脚本内部，调用方只触发入口，不能各处复制删除条件。

开发规范
- 新增 git 治理脚本必须放在本目录，并补全 L3 契约。
- 修改保护分支、worktree 跳过逻辑或基线分支语义时，先改脚本文字说明，再改实现。

变更日志
- 2026-03-12: 从 scripts/ 根层拆出 git-prune-merged-branches.sh，建立 scripts/git 模块边界。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
