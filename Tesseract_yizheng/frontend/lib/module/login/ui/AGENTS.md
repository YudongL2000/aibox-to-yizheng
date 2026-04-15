# ui/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/lib/module/login/AGENTS.md

成员清单
login_page_new.dart: 登录界面，负责账号输入、提交与失败反馈，并移除未接线的附加入口说明。
splash_page.dart: 启动判流页，负责缓存初始化，并把用户送往登录页、默认以 Digital Twin 为首屏的工作台、纯数字孪生嵌入页或显式 `entry=home` 首页。

架构
- 该目录只承载启动与登录 UI，不保留业务模块真相源。
- `splash_page.dart` 是桌面端嵌入数字孪生和首页对话工作台的唯一放行点；任何直达策略变更，都必须先在这里收口，再向业务页扩散。
- 常规启动默认进入 `HomeWorkspacePage` 的 Digital Twin 主视图；只有显式 `surface=workflow`、`entry=workflow` 或 prompt 直达链路才应优先打开 Workflow。
- `source=aily-blockly` 的数字孪生入口必须保持单画布；其他 `entry=digital-twin` 入口允许直接挂载 AI 对话模式。
- `splash_page.dart` 的加载态主题色来自运行时 `SpatialThemeData`；凡是读取 `spatial.palette` / `spatial.status(...)` 的 `TextStyle`、`Indicator` 都不能再包成 `const`。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
