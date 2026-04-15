# 010-tesseract-ux-loop/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/AGENTS.md

成员清单
spec.md: 本特性的需求规格，定义桌面端交互统一、工作流确认直达、技能卡片真分流、配置 GUI 渲染与窗口层级体验目标。
plan.md: 本特性的实现规划，拆分 backend、aily-blockly、frontend 的职责边界、数据流与验收路径。
tasks.md: 本特性的任务清单，按依赖顺序拆分可执行工作项与验证步骤。
checklists/requirements.md: 规格质量清单，约束需求完整性、无实现泄漏与成功标准可测。
contracts/: 对话输出、技能记录、工作区同步与配置渲染契约目录。

法则
- 这个 feature 的核心不是堆更多按钮，而是收敛单一真相源：聊天动作、工作区、技能库、硬件状态与数字孪生必须描述同一个现实。
- `spec.md` 只描述用户价值与验收，不泄露模块和框架细节；实现边界放进 `plan.md` 与 `contracts/`。
- 新增契约、清单或任务文件时必须立即补进这里，不能让 feature 目录出现匿名资产。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
