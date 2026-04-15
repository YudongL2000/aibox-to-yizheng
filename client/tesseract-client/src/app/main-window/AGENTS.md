# main-window/
> L2 | 父级: ../AGENTS.md

成员清单
main-window.component.ts: 主窗口布局壳，拼装 header/footer、工作区与底部面板切换。
main-window.component.html: 主窗口骨架模板，组织顶栏、中心工作区与底部工具区。
main-window.component.scss: 主窗口整体样式，负责主内容区伸缩与分栏布局。
components/: 主窗口局部组件层，承载顶栏、底栏与对话框等壳内交互，header/ 是硬件状态入口。

法则
- main-window 只负责布局和壳内协调，不保存业务真相；日志、硬件状态、项目状态都应回到 services。
- 顶栏若需要展示运行时状态，必须消费共享 service 的只读快照，不能自建状态副本。
- 底部工具区只展示日志与终端，不应反向驱动硬件连接逻辑。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
