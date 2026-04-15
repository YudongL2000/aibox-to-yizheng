# skills/
> L2 | 父级: ../CLAUDE.md

成员清单
memory-bootstrap/: 可迁移的 Codex Skill，用于一次性初始化 OpenClaw 风格的项目 memory 体系。
parallel-iteration-docs/: 可迁移的 Codex Skill，用于生成“设计在 decisions，执行在 iterations”的并行开发资产包。

架构决策
- `skills/` 放可迁移、可复用、项目外也有价值的 Skill，不放项目内执行日志或长期记忆正文。
- Skill 的单一真相源必须在仓库顶层，避免 `docs/` 里再维护一份同名副本。

开发规范
- 新增 Skill 时同步本文件与对应 Skill 子目录的 `CLAUDE.md`。
- Skill 主体保持简短，模板与结构细节下沉到 `references/`。

变更日志
- 2026-03-13: 建立顶层 skills 目录，并接入 memory-bootstrap Skill 作为可全局安装的迁移资产。
- 2026-03-13: 新增 parallel-iteration-docs Skill，用于沉淀多 worktree / multi-agent 并行开发资产包模式。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
