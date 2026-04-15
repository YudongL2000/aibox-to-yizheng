# scripts/
> L2 | 父级: ../CLAUDE.md

成员清单
debug-required_file_not_found.md: VSCode/WSL 路径异常排查说明。
fix-worktree-paths-for-vscode.ps1: 修复 Windows VSCode 对 WSL worktree 路径的 Git 识别问题。
refactor3_parallel_tmux.sh: Refactor-3 并行开发 worktree + tmux 启动脚本。
restore-worktree-paths-for-wsl.sh: 将 Git worktree 路径从 Windows 兼容态恢复为 WSL 可用态。
test-ssh-connection.sh: GitHub SSH 连接检测脚本。

架构决策
- `docs/scripts/` 只存文档配套执行脚本，不承载业务运行时代码。
- 只有“跨迭代复用”的通用脚本才留在这里；迭代专属 launcher 应跟随各自 `docs/iterations/<iter-id>/` 模块。
- 新增通用脚本时，必须先固定它所依赖的文档合同，再写脚本；禁止脚本先于执行文档漂移。

开发规范
- 新增脚本必须补 L3 契约注释。
- 并行脚本变更后至少执行 `bash -n` 做语法校验。

变更日志
- 2026-03-13: 将 Refactor-4 launcher 迁到 `docs/iterations/refactor-4/`，当前目录只保留跨迭代复用脚本。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
