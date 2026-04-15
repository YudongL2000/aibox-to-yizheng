# 002-hotplug-port-sync/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/AGENTS.md

成员清单
spec.md: “mock 插拔端口同步与数字孪生实时挂载”正式规格，定义默认底座、全量快照、拔出回退与单一场景真相。
plan.md: 实现计划主文档，固定协议修正点、结构决策与验收边界。
research.md: Phase 0 研究结论，记录端口身份为何丢失以及为何必须让 snapshot 成为一等协议。
data-model.md: 关键实体模型，统一热插拔事件、硬件快照与数字孪生场景的语义边界。
quickstart.md: 本地联调与验收走查脚本，覆盖默认底座、插入、拔出与多组件快照。
contracts/: 跨边界契约目录，定义 hotplug 事件与数字孪生场景的输入输出协议。
tasks.md: 依赖有序的实现任务清单，按用户故事拆解 backend / aily-blockly / frontend 的工作。
checklists/: 规格质量检查目录，记录本特性在进入计划阶段前的完成度。

法则
- 这个 feature 只解决“端口身份与数字孪生场景同步”，不偷偷扩展 dialogue-mode 的其他业务范围。
- `spec.md` 只定义用户价值与验收，不承载实现细节；协议、数据结构与模块改动必须放进 `plan.md`、`research.md`、`data-model.md` 或 `contracts/`。
- 所有设计文档都必须坚持 backend-first：数字孪生场景由 backend 投影，前端只转发与渲染。
- 任何新增文档都必须紧扣“默认底座 + snapshot + portId + 实时更新”这条主线，禁止再次长出第二套真相源。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
