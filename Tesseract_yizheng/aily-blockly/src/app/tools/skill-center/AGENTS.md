# skill-center/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/AGENTS.md

成员清单
skill-center.component.ts: Skill Center 完整管理态入口，负责承接“我的库”或“Skill 广场”其中一个一级页面的扩展管理态、skills 列表订阅、入库高亮态、分页（pageSize=6）、删除确认（NzModalService.confirm → service.delete）。
skill-center.component.html: Skill Center 管理态模板，改为单页极简头部 + 内容区，不再自带左侧导航、说明副标题或跨页面 tab；本地库卡片含 hover 删除按钮、分页器（nz-pagination）与广场占位页。
skill-center.component.scss: Skill Center Spatial dark shell 样式，统一弹层背景、单页头部、技能卡、空态与按钮层级，禁止再回到独立紫色品牌皮肤。
skills-panel.component.ts: 右侧支持层里的轻量 Skills 单页，分别服务“我的库”或“Skill 广场”一级页面，负责当前任务注入与展开管理动作。
skills-panel.component.html: 轻量 Skills 面板模板，承接右侧支持层里的一级页面内容，不再保留内部 tab、hero header 或占位说明块；外层壳已经表达“我的库 / Skill 广场”时，这里只保留计数与管理动作，不再重复页面标题。
skills-panel.component.scss: 轻量 Skills 面板样式，收敛右侧支持层里的库卡片节奏与调用按钮层级，并保持嵌入态无额外内框。
skill-center.component.spec.ts: Skill Center UI 守护测试，锁住真实空态与新技能入库高亮。

法则
- Header/SupportPanel/聊天动作只负责唤起与切换初始视图；轻量调用态与完整管理态必须共用同一份 `TesseractSkillLibraryService` 真相源。
- “我的库”和“Skill 广场”必须是两个独立一级页面；这里不允许再长出“库里套市场”“市场里套模型”之类跨维度 tab。
- 这里展示的本地库必须只消费 `TesseractSkillLibraryService`，禁止继续写死 mock skill 卡片。
- 完整 Skill Center 现在也属于 Electron 主页面活跃视觉链路；卡片、空态、分页、关闭按钮必须跟 `src/spatial-design-ref.scss` 共用同一套 surface/border/text/status/button 语义，不允许保留独立紫渐变和 glow 品牌层。
- 这里的页面必须遵守 less is more：一级标题之外不再复制 eyebrow、副标题和“后续接入”式说明段落。
- "新技能飞入库"只能是 UI 表现层动画，不得反向制造第二套 skills 状态。
- 删除走 `TesseractSkillLibraryService.delete()` → Electron IPC → backend DELETE API，无直接 HTTP 调用。
- 轻量调用态只负责“用于当前任务 / 回溯 / 发布入口”三类协作动作；批量管理、删除、分页等复杂行为必须留在完整 Skill Center，但完整 Skill Center 也必须保持单页，不再内嵌次级导航。
- 右侧 support panel 已经提供窗体标题和壳层边框；`skills-panel` 嵌入态不得再重复绘制页名 hero 或第二层 panel chrome。
- 打开 Skills Center 前隐藏数字孪生窗口（`electronAPI.digitalTwin.hide()`），关闭后恢复（`.show()`）。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
