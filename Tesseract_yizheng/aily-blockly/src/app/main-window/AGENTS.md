# main-window/
> L2 | 父级: ../AGENTS.md

成员清单
main-window.component.ts: 主窗口布局壳，拼装 header/footer、工作区与底部面板切换。
main-window.component.html: 主窗口骨架模板，组织顶栏、中心工作区与底部工具区；底部工具区现含日志、终端与硬件连接 icon tab。
main-window.component.scss: 主窗口整体样式，负责主内容区伸缩与分栏布局，以及底部硬件连接面板视觉。
components/: 主窗口局部组件层，承载顶栏、底栏与对话框等壳内交互；footer/ 负责常驻 launcher，与 header/ 一起定义壳层主导航。

法则
- main-window 只负责布局和壳内协调，不保存业务真相；日志、硬件状态、项目状态与主工作区 surface 都应回到 services / 路由。
- 顶栏若需要展示运行时状态或主工作区 tab，必须消费共享 service / query 的只读状态，不能自建状态副本。
- footer 左下角 launcher 必须始终可见；日志、终端与硬件连接入口不能依赖底部面板先展开。
- 底部工具区可以承载日志、终端与硬件连接摘要，但硬件真相仍必须来自共享 runtime service，不能在壳内自行拼状态。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
