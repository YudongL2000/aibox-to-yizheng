# 001-openclaw-dialog-mode/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/AGENTS.md

成员清单
spec.md: “OpenClaw 对话模式”正式规格，定义三条用户分支、功能要求、关键实体、成功标准与范围假设。
plan.md: 实现计划主文档，固定技术上下文、结构决策与本轮设计边界。
research.md: Phase 0 研究结论，记录状态机、backend-first 契约与硬件桥接等关键决策。
data-model.md: 对话模式核心实体模型，统一 session、skill、hardware、deployment、handoff 的状态形状。
quickstart.md: 本地联调与验收走查脚本，覆盖三条分支与异常路径。
contracts/: 跨边界契约目录，定义 backend Agent envelope 与本地硬件桥事件标准。
tasks.md: 依赖有序的实现任务清单，按 US1/US2/US3 分 phase 拆解可独立交付的开发工作。
checklists/: 规格质量检查目录，记录本特性在进入计划阶段前的完成度与风险。

法则
- `spec.md` 只回答用户要什么、为什么重要、如何验收，不承载实现方案。
- `plan.md`、`research.md`、`data-model.md` 与 `contracts/` 共同回答“如何正确实现”，但不得回头修改规格范围。
- `tasks.md` 必须严格映射 `spec.md` 的用户故事优先级，并把每项工作落到精确文件路径，禁止出现“改一下前后端”这类模糊任务。
- 本目录中的所有设计文档都必须坚持 backend-first：业务结论来自 Agent 契约，而不是前端自行推理。
- 本目录下新增任何派生文档，都必须与 `spec.md` 的范围边界一致，不能偷偷扩大或缩小 feature。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
