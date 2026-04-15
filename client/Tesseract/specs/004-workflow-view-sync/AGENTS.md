# 004-workflow-view-sync/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/AGENTS.md

成员清单
spec.md: “工作流视图同步闭环”正式规格，定义占位态、创建后自动切换与内嵌工作区同步的用户价值和验收边界。
plan.md: 实现计划主文档，固定单一真相源、状态同步链与本轮改动边界。
research.md: Phase 0 研究结论，记录主页泄漏、浏览器回退依赖与嵌入式视图漂移的根因判断。
data-model.md: 关键实体模型，统一项目工作区、workflow 引用、聊天创建结果与嵌入式视图状态。
quickstart.md: 本地联调与验收走查脚本，覆盖空项目占位、创建即显示、延迟对齐与串台保护。
tasks.md: 实施任务账本，记录本 feature 从审计、实现到编译验收的完成状态。
contracts/: 跨边界契约目录，定义工作流创建结果如何驱动客户端主工作区自动切换。
checklists/: 规格质量检查目录，记录本特性在进入计划阶段前的完成度与残余风险。

法则
- 该 feature 只解决“创建工作流后客户端主工作区如何即时更新”的闭环，不扩展热插拔或对话模式的其他业务范围。
- `spec.md` 只回答用户看到什么、何时切换、什么叫验收通过，禁止写入模块名、接口名或 webview 注入细节。
- 任何补充文档都必须坚持“backend 产生 workflow 真相，客户端工作区负责自动对齐”这条主线，不能再允许主页或第三方流程占据主画布。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
