# dialogue_mode/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/lib/module/home/widget/AGENTS.md

成员清单
dialogue_mode_models.dart: 对话模式纯视图模型，定义分支、阶段、技能卡与动作按钮的稳定形状。
dialogue_mode_state.dart: 对话模式本地状态层，折叠 loading、会话、校验态与教学接力入口。
dialogue_mode_mapper.dart: backend `dialogueMode` envelope 到本地视图模型的纯映射器，统一默认技能卡与动作语义。
dialogue_mode_card.dart: 对话模式主卡片视图，渲染可用技能、AI 当前状态、校验条和主动作按钮。

法则
- 本目录只承载“对话模式”的局部状态和视图，不反向侵入旧工作流配置链。
- 所有业务结论必须来自 backend `dialogueMode` envelope；这里只做展示与轻量交互编排。
- 对话模式主卡片必须跟工作台 `interaction_modules/` 共用 Spatial dark shell 语法：mono label、panel/list-item、语义状态色、主次按钮，不得恢复成独立紫色赛博主题。
- 对话模式主卡片只保留关键状态、技能和动作；`gameplayGuide` 一类补充说明默认不在主卡片重复渲染。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
