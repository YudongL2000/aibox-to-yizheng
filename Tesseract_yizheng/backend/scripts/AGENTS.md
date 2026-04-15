# scripts/
> L2 | 父级: ../AGENTS.md

成员清单
git/: 仓库治理脚本目录，收纳分支清理等 git 运维入口。
deploy-*.sh: 部署脚本族，负责本地或远端服务发布。
generate-*.js: 报告与发布说明生成脚本族。
migrate-*.ts: 数据迁移脚本族，负责数据库或工具文档迁移。
test-*.{ts,js,sh}: 调试与回归脚本族，验证单点能力或集成链路。
update-*.{js,sh}: 版本、依赖与发布准备脚本族。
mcp-http-client.js: 轻量 HTTP MCP 客户端，把 JSON-RPC 透传到远端 MCP 服务。
http-bridge.js: HTTP 与 stdio 之间的桥接脚本，服务老环境或外部客户端。
sync-copilot-chat-to-memory.js: 轮询当前仓库对应的 VS Code Copilot `chatSessions/*.jsonl`，把可见聊天内容去重后同步到显式配置的 Memory MCP。
run-copilot-memory-sync.ps1: Windows 启动器，固定工作目录并把同步器 stdout/stderr 归档到 AppData 日志；计划任务场景可先脱离出隐藏常驻子进程。
install-copilot-memory-sync-task.ps1: 注册当前用户的 Windows 计划任务，在登录后拉起隐藏常驻的 Copilot Memory 同步器。
uninstall-copilot-memory-sync-task.ps1: 停止并删除 Copilot Memory 同步计划任务，保留状态与日志文件。

架构决策
- `scripts/` 放仓库级运维与本地自动化，不承载生产运行时业务逻辑。
- Copilot Memory 同步器保持为纯 Node.js 脚本，避免把本地开发机行为耦合进 `src/` 构建产物。
- 同步器默认只建立基线不回灌历史消息；显式 `--backfill` 才导入既有会话，且回灌状态先落盘为空集避免中途崩溃后丢历史。
- 同步器默认优先锁定当前仓库的 workspaceStorage，而不是扫描所有 VS Code 工作区，减少跨项目聊天外泄面。

开发规范
- 新增脚本必须同步本文件，并在脚本头部补全 L3 契约。
- 会修改外部系统状态的脚本必须提供 dry-run 或等价的安全模式。

变更日志
- 2026-03-14: 新增 `sync-copilot-chat-to-memory.js`，用于把 GitHub Copilot Chat 会话自动镜像到 Memory MCP。
- 2026-03-14: 新增 Windows 计划任务安装/卸载脚本与 PowerShell 启动器，使 Copilot Memory 同步器可随登录自动拉起。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md