# float-sider/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/AGENTS.md

成员清单
float-sider.component.ts: 浮动侧边栏行为入口，负责根据工作区模式分发项目设置、模型库与数字孪生弹窗。
float-sider.component.html: 浮动侧边栏按钮骨架，声明 Tesseract / legacy 模式下的可见操作，并为每个入口补齐可读 label 元信息。
float-sider.component.scss: 浮动侧边栏布局、视觉样式与显隐动画，负责把旧式深灰块面收敛成贴边 compact rail。

架构
- 该目录只负责“用户意图 -> 服务调用”的分发，不持有项目、窗口或运行时真相源。
- Tesseract 模式下，“工作流模板”按钮当前收敛为打开 frontend 数字孪生工作台的入口，统一通过 `UiService.openWindow()` + `iframe` 子窗口承载 Flutter Web 页面。
- 数字孪生入口必须显式声明窗口层级意图（如 `keepAboveMain/windowRole`）；否则主窗口一旦重新聚焦，就会把数字孪生盖回去。

变更日志
- 2026-04-12: 右侧浮动侧边栏改为贴边 compact rail，去掉旧硬编码暗灰块样式，并给每个 icon 补 hover label 以降低纯图标辨识成本。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
