# 005-skills-library-dialogue/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/AGENTS.md

成员清单
spec.md: “教学模式存库与对话模式真 Skill 分流”正式规格，定义技能入库确认、飞入动效、真实技能查询与 A/B/C 分支验收。
plan.md: 实现计划主文档，固定 backend skills repository、前端消费链和 mock 清理边界。
research.md: Phase 0 研究结论，记录为何要把 skills 真相源收回 backend JSON repository。
data-model.md: 关键实体模型，统一 SkillRecord、SkillSaveCandidate、DialogueRouteDecision 与库视图摘要。
quickstart.md: 本地联调脚本，覆盖教学存库、对话命中与 mock 清理验收。
tasks.md: 实施任务账本，记录从持久化、UI 动效到分流替换的执行顺序。
contracts/: 契约目录，约束 save candidate、save/list skills 与 dialogue envelope 的跨边界数据形状。
checklists/: 规格质量检查目录，记录该 feature 进入计划阶段前的完成度。

法则
- 本 feature 只解决“教学成果如何成为真实技能资产，以及对话模式如何消费真实技能库”的闭环，不处理云端同步、多用户分享或技能市场发布。
- `spec.md` 只回答用户在什么时候看到什么、点击后发生什么，以及什么叫技能库与对话模式真的打通，禁止泄露模块名、接口名或持久化路径。
- 任何后续计划文档都必须坚持“backend 维护技能库真相，aily-blockly 只消费并呈现”这条主线，不能再回退到前端 mock skills。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
