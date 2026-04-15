# tools/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/AGENTS.md

成员清单
aily-chat/: AI 助手主模块，负责旧 Agent/QA 与 Tesseract backend 的教学/对话双子模式切换。
skill-center/: Skill 库中心模态模块，负责“我的库 / Skill 广场”两套原型页的展示与切换。
log/: 日志面板模块，负责展示 renderer 内部日志、硬件 runtime heartbeat/command 事件，并为系统级结构化归档提供调试入口。

法则
- 工具窗口如果依赖当前项目路径做模式判定，必须只信任 `ProjectService.currentProjectPath` 这一份真相源。
- Tesseract 相关交互应优先在 `aily-chat/` 容器内闭环；不要再把 renderer 业务状态分裂到其他前端壳里。
- 接入 Tesseract backend 时，优先消除“项目未同步导致走旧逻辑”的特殊情况，而不是继续堆分支兜底。
- 日志调试必须区分“renderer 面板内日志”和“Electron session 结构化归档”；前者服务交互，后者服务系统级故障追踪，二者不能互相冒充。
- 硬件 runtime 状态与命令日志应由共享 service 汇聚后再写入 `log/`，不要让 header 或聊天模块各自直接篡改日志列表。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
