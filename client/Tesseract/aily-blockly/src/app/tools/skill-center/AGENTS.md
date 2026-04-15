# skill-center/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/AGENTS.md

成员清单
skill-center.component.ts: Skill Center 模态入口，负责视图切换、skills 列表订阅、入库高亮态、分页（pageSize=6）、删除确认（NzModalService.confirm → service.delete）。
skill-center.component.html: Skill Center 结构模板，左侧导航、本地库卡片（含 hover 删除按钮）、分页器（nz-pagination）、空态提示与广场占位页。
skill-center.component.scss: Skill Center 深色视觉样式，弹层自适应布局（calc(100vw-96px) × calc(100vh-96px)）、summary 3行截断（line-clamp）、飞行动画、删除按钮 hover 渐现。
skill-center.component.spec.ts: Skill Center UI 守护测试，锁住真实空态与新技能入库高亮。

法则
- Header/聊天动作只负责唤起与切换初始视图，页面内部的 tab 状态必须收敛在这里。
- 这里展示的本地库必须只消费 `TesseractSkillLibraryService`，禁止继续写死 mock skill 卡片。
- "新技能飞入库"只能是 UI 表现层动画，不得反向制造第二套 skills 状态。
- 删除走 `TesseractSkillLibraryService.delete()` → Electron IPC → backend DELETE API，无直接 HTTP 调用。
- 打开 Skills Center 前隐藏数字孪生窗口（`electronAPI.digitalTwin.hide()`），关闭后恢复（`.show()`）。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
