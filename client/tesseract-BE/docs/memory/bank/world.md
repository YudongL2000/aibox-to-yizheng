# world

## Stable Facts

- 仓库：`tesseract-BE`
- 主要技术栈：TypeScript、Node.js、n8n、Vitest、Vite
- 核心后端模块：
  - `src/agents/`：Agent 核心逻辑
  - `src/agent-server/`：HTTP / WebSocket 服务层
  - `apps/agent-ui/`：前端调试与交互界面
- 文档系统使用 `CLAUDE.md` 维护目录级地图与职责边界。
- 当前主要长期架构主题是 `docs/decisions/refactor-4/` 下的 harness engineering 重构。

## Stable Workflow Facts

- 架构或目录级变更需要同步更新对应 `CLAUDE.md`。
- 长时记忆目录位于 `docs/memory/`，默认加载顺序是 `MEMORY.md -> 今日/昨日 daily -> bank/*`。
