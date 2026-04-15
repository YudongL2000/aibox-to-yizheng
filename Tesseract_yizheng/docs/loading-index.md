# Loading Index

## Scenario -> File Mapping

| Scenario | Primary File |
|---|---|
| Session continuity | `today.md` |
| Workspace contract | `CLAUDE.md` |
| Rules reference | `docs/rules/README.md` |
| Tech stack baseline | `docs/tech-stack.md` |
| Workspace map | `docs/workspace-structure.md` |
| Skills / UI interaction draft | `docs/skill-center-ui-interaction.md` |
| Session start protocol | `docs/session-start.md` |
| Engineering guardrails | `.cursor/rules/vibe-engineering.mdc` |
| Loading discipline | `.cursor/rules/vibe-loading.mdc` |
| Folder/File sync contract | `.cursor/rules/vibe-doc-sync.mdc` |
| Component reuse policy | `.cursor/rules/vibe-component-reuse.mdc` |
| Historical specs | `specs/*` |

## Loading Discipline

- 先读 `CLAUDE.md` 和目标目录的 `.folder.md`，再决定是否下钻。
- 每次只加载和当前任务直接相关的模块文档，不预加载整个多仓工作区。
- 跨模块改动时，至少同步检查 `backend/`、`frontend/`、`aily-blockly/`、`n8n/` 四个子仓的目录契约。
