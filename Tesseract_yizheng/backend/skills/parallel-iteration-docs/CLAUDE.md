# parallel-iteration-docs/
> L2 | 父级: ../CLAUDE.md

成员清单
SKILL.md: 并行开发执行资产包 Skill 主说明，定义触发条件、目录布局、执行步骤与护栏。
references/: 结构合同与输出骨架参考，供 Skill 按需加载。

架构决策
- 这个 Skill 的核心约束是“设计和执行分层”：设计真相放 `docs/decisions/`，执行资产包放 `docs/iterations/<iter-id>/`。
- 迭代专属 launcher 必须和该迭代的 runbook、parallel doc、integration output 共置，避免跨目录成员清单。

开发规范
- 修改目录布局或产物 contract 时，先更新 `references/`，再更新 `SKILL.md`。
- Skill 主体只保留流程与约束，具体结构说明放进 `references/`。

变更日志
- 2026-03-13: 新增 parallel-iteration-docs Skill，固化多 worktree / multi-agent 并行开发资产包模式。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
