# login/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/AGENTS.md

成员清单
model/login_model.dart: 登录态数据模型，承载用户信息与缓存写入结构。
ui/login_page_new.dart: 登录表单页，负责显式鉴权输入与提交。
ui/splash_page.dart: 启动判流页，负责缓存初始化、登录校验与本地嵌入数字孪生直达。

架构
- login 模块只负责鉴权与启动分流，不持有业务工作台状态。
- `splash_page.dart` 现在接受本地 loopback 的 `entry=digital-twin&source=aily-blockly` 启动意图，用来把桌面端弹窗直接送到数字孪生工作台；非本地场景仍保持正常登录闸门。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
