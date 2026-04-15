# 006-digital-twin-truth-sync/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/AGENTS.md

成员清单
spec.md: “数字孪生唯一真相源同步”正式规格，定义 mock 端口确认后的实时 scene 对齐、后台真相源与顶层窗口行为。
plan.md: 实现计划主文档，固定 backend `config-state` scene、Electron 窗口 profile 与客户端读后校验策略。
research.md: Phase 0 研究结论，解释为何必须以 backend canonical scene 取代瞬时响应 scene。
data-model.md: 关键实体模型，统一 DigitalTwinSceneEnvelope、ConfigNodeMountState、DigitalTwinWindowState 与同步检查点。
quickstart.md: 本地联调脚本，覆盖 speaker/mock 端口实时更新与数字孪生顶层窗口验收。
tasks.md: 实施任务账本，记录从真相源收口、窗口层级到日志诊断的执行顺序。
contracts/: 契约目录，约束 `confirm-node/config-state/digitalTwinScene` 的跨边界数据形状。
checklists/: 规格质量检查目录，记录该 feature 进入计划阶段前的完成度。

法则
- 本 feature 只解决“数字孪生 scene 真相源、实时同步、窗口层级”闭环，不扩展新的硬件种类或新的 UI 页面。
- `spec.md` 只描述用户何时看到什么、什么叫实时更新成功、什么叫窗口保持在客户端顶部，禁止泄露模块名和实现细节。
- 后续计划文档必须坚持“backend canonical scene -> Electron broadcast -> frontend consume”单向数据流，禁止再让 renderer 或日志字符串充当真相源。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
