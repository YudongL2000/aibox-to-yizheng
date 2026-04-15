# tesseract-BE - n8n MCP backend and local agent tooling

<directory>
apps/ - 前端应用与独立工作区，目前承载 agent-ui。
codex/ - 内嵌 Codex 工作区与其依赖，不参与本仓库主运行时。
data/ - 本地数据库、日志与上传目录。
deploy/ - Docker、compose、Railway 与部署资产。
docs/ - 使用、部署、设计决策与迭代文档。
scripts/ - 仓库级运维脚本、发布脚本与本地桥接/同步工具。
src/ - 主运行时代码，包含 MCP、HTTP server、agent、service 与数据库层。
tests/ - 单元、集成、基准与回归测试。
types/ - 全局声明与测试环境类型。
</directory>

<config>
package.json - NPM 依赖与仓库级脚本入口。
restart-agent-dev.sh - 根目录重启脚本，按 `.env` 的 `AGENT_PORT` 优先识别并清理 backend 进程签名；默认只处理 backend 监听进程，显式传 `--kill-electron-parent` 时才连 aily-blockly 的 Electron 父进程树一起关闭，并在启动期遇到 `EADDRINUSE` 时自动重试清场。
tsconfig.json - 开发期 TypeScript 配置，允许 JS 脚本共存。
tsconfig.build.json - 生产构建配置，只编译 src/。
.vscode/mcp.json - 工作区 Copilot MCP 服务配置。
</config>

法则: 运行时代码留在 src/，仓库运维和本地自动化留在 scripts/；新增目录或脚本入口时，同步更新对应 AGENTS 映射。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
