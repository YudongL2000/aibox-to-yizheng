# skill-center/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/AGENTS.md

成员清单
skill-center.component.ts: Skill Center 模态入口，负责“我的库 / Skill 广场 / 云端备份”的视图切换、真实 skills 列表订阅与入库高亮态。
skill-center.component.html: Skill Center 结构模板，组织左侧导航、真实本地库卡片、空态提示与广场占位页。
skill-center.component.scss: Skill Center 深色视觉样式，定义弹层布局、技能入库飞行动画与空态卡片层次。
skill-center.component.spec.ts: Skill Center UI 守护测试，锁住真实空态与新技能入库高亮。

法则
- Header/聊天动作只负责唤起与切换初始视图，页面内部的 tab 状态必须收敛在这里。
- 这里展示的本地库必须只消费 `TesseractSkillLibraryService`，禁止继续写死 mock skill 卡片。
- “新技能飞入库”只能是 UI 表现层动画，不得反向制造第二套 skills 状态。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
