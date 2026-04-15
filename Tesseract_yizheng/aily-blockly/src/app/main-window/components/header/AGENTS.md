# header/
> L2 | 父级: ../../AGENTS.md

成员清单
header.component.ts: 顶栏控制器，承载开发板选择、窗口控制、`Digital Twin / Workflow` 主任务切换，以及右上角“我的库 / 广场 / AI / 模型 / 串口”一级页面入口，并控制中部项目标题只在非 Tesseract 工作区显示。
header.component.html: 顶栏模板，渲染常规按钮组、Tesseract 工作区的 surface tabs 与一级页面入口；主工作区 tab 现在以 Electron header 为唯一入口，studio/content pane 不再重复展示第二层同义 header。
header.component.scss: 顶栏样式，统一主工作区 tabs 与一级页面胶囊的视觉语法，避免把工作区 surface 和库/广场/AI/模型/串口做成断裂的多层导航。

法则
- 这里展示的是主工作区 surface，不是协议解析器；状态变化要从共享 service / 路由读，不要在模板里重算。
- 顶栏空间极窄，新增状态必须压缩成一眼可读的摘要，不要把日志窗口搬进 header。
- `Digital Twin / Workflow` 主任务 tab 必须由 Electron shell header 保留唯一入口；studio 与 digital-twin content pane 不得再复制第二层同义入口。
- `tesseract-studio` 路由下不要再把项目名重复挂回中部标题位；工作区身份以左侧 workspace tabs 为准，避免和 tab 文案抢主视觉。
- “我的库 / 广场 / AI / 模型 / 串口”这一排必须是同层级入口；不要再用分组、分隔线或不同控件语法暗示二级关系。
- “我的库 / 广场”在 header 里只负责 deep link 到各自一级页面，不要再直接弹完整管理页；完整管理态必须从支持层内部显式展开。
- header 的产品入口、shell button 与状态胶囊必须统一走 dark-first spatial semantic vars，保持“精简 shell bar”语法，不要回退成说明型或堆叠型导航。

变更日志
- 2026-04-12: `Digital Twin / Workflow` 主任务切换回收至 Electron header；studio 与 digital twin panel 删除重复 header，避免出现三层壳。
- 2026-04-12: macOS Tesseract header 删除历史遗留左侧 inset，并收紧 workbench nav 前导间距，避免菜单与 `Digital Twin / Workflow` 左侧再出现大片空白。
- 2026-04-12: header 改成 Spatial Wireframe shell bar，开发板/项目名/一级入口统一为硬边框 chip，不再混用旧胶囊和 glow hover。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
