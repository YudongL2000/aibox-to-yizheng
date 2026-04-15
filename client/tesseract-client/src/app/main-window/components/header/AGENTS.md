# header/
> L2 | 父级: ../../AGENTS.md

成员清单
header.component.ts: 顶栏控制器，承载开发板选择、Skill Center 入口与硬件运行时状态框。
header.component.html: 顶栏模板，渲染左上硬件连接状态框与常规按钮组；Skill Center 入口保持在工具区。
header.component.scss: 顶栏样式，定义左上硬件状态框、库入口与按钮栅格的视觉节奏。

法则
- 这里展示的是硬件运行时快照，不是协议解析器；状态变化要从共享 service 读，不要在模板里重算。
- 顶栏空间极窄，新增状态必须压缩成一眼可读的摘要，不要把日志窗口搬进 header。
- 硬件状态框必须固定在左上主导航区域，优先于 Skill Center 入口展示。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
