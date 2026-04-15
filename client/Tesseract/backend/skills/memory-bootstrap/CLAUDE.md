# memory-bootstrap/
> L2 | 父级: ../CLAUDE.md

成员清单
SKILL.md: Memory 体系初始化 Skill 主说明，定义触发条件、执行步骤、约束与验证标准。
references/layout.md: 目录结构、模板与晋升规则参考，供 Skill 按需加载。

架构决策
- `memory-bootstrap` 设计为可直接复制到 `~/.codex/skills/` 的自包含 Skill。
- `SKILL.md` 只保留流程和约束，具体模板放到 `references/`，避免主技能过厚。

开发规范
- 修改目录结构或模板时，优先更新 `references/layout.md`，再更新 `SKILL.md`。

变更日志
- 2026-03-13: 新增 memory-bootstrap 顶层 Skill，用于跨项目初始化 OpenClaw 风格 memory 体系。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
