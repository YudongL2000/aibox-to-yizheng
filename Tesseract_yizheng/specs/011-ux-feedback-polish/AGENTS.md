# 011-ux-feedback-polish/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/AGENTS.md

成员清单
spec.md: 本特性的需求规格，定义澄清循环修复、会话隔离、热插拔真检测、流程图预渲染与桌面端 UX 收口目标。
plan.md: 本特性的实现规划，拆分 backend 与 aily-blockly 的职责边界、状态流与验收路径。
tasks.md: 本特性的任务清单，记录实现、构建、提交与人工验收状态。
research.md: 技术调研结论，沉淀澄清循环、mermaid 渲染、热插拔桥接与桌面视觉改造的现状判断。
data-model.md: 会话桶、热插拔步骤态与反馈渲染相关的数据模型约束。
quickstart.md: 本特性的人工回归指南，覆盖 summary_ready 流程图、热插拔检测与桌面品牌验收。
contracts/: 本特性的契约目录，描述会话隔离与反馈输出的输入/输出边界。

法则
- 这个 feature 的核心是把用户反馈里暴露出的割裂体验收束成一个闭环，不能只修文案不修状态流。
- `spec.md` 只讲用户价值与验收；真实改动落点、模块分工与实现取舍必须写进 `plan.md` 与 `contracts/`。
- 任务状态必须反映真实执行情况；未跑的人工验收不能伪装成完成。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md