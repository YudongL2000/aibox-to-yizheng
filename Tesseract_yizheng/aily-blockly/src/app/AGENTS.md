# app/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/AGENTS.md

成员清单
components/: 通用 UI 组件层，承载窗口、菜单、工具容器与渲染基础件。
configs/: 配置与静态常量层，存放菜单、引导和平台常量。
editors/: 主编辑器层，承载 Blockly、代码编辑器与 Tesseract 工作区。
func/: 纯函数工具层，存放轻量帮助函数。
main-window/: 主窗口壳层，承载顶栏、底部日志与工作区布局拼装。
pages/: 页面级功能层，承载项目新建等独立页面。
services/: 应用服务层，负责项目路径、workflow 同步、日志、构建与系统桥接。
tools/: 工具侧功能层，承载 AI Chat、viewer 组件树与协议适配。
types/: 全局类型层，补齐 preload/Electron 等跨模块声明。
windows/: 子窗口层，负责 iframe 等独立窗口承载。

法则
- `editors/` 负责“画面显示什么”，`services/` 负责“当前真相是什么”；任何把这两层重新搅在一起的改动都会制造状态裂脑。
- Tesseract 相关 workflow 真相源只能在 `services/tesseract-project.service.ts`；聊天与工作区只能消费，不得再长出第二套 pending target。
- `tools/` 可以发起动作，但不能自己定义项目/工作区真相；一旦需要记忆活动 workflow，必须回写到 `services/`。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
