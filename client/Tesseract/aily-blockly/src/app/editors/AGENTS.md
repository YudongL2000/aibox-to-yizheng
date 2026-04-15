# editors/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/AGENTS.md

成员清单
tesseract-studio/: Tesseract 工作区页面，负责项目级 runtime 与本地 n8n 工作区装配。
blockly-editor/: Blockly 编辑器页面。
code-editor/: 代码编辑器页面。

法则
- 编辑器页面拿到路由 `path` 后，必须同步回 `ProjectService.currentProjectPath`，否则跨窗口工具会失去项目上下文。
- Tesseract 工作区优先保证项目路径、runtime 和聊天模式同构；路径不同步就是系统性断链。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
