# ui/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/lib/module/login/AGENTS.md

成员清单
login_page_new.dart: 登录界面，负责账号输入、提交与失败反馈。
splash_page.dart: 启动判流页，负责缓存初始化，并把用户送往登录页、首页、纯数字孪生嵌入页或带 AI 面板的工作台。

架构
- 该目录只承载启动与登录 UI，不保留业务模块真相源。
- `splash_page.dart` 是桌面端嵌入数字孪生和首页对话工作台的唯一放行点；任何直达策略变更，都必须先在这里收口，再向业务页扩散。
- `source=aily-blockly` 的数字孪生入口必须保持单画布；其他 `entry=digital-twin` 入口允许直接挂载 AI 对话模式。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
