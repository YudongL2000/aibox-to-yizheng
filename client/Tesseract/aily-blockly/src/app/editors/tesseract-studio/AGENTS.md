# tesseract-studio/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/editors/AGENTS.md

成员清单
tesseract-studio.component.ts: Tesseract 工作区页面入口，负责读取路由可选 `path/workflowId`、消费项目级 workflow sync target，并在“无 workflow / 待对齐 / ready”之间切换。
tesseract-studio.component.spec.ts: 工作区同步回归测试，锁住全局活动工作区 `workflowId` 聚焦与延迟结果防串台契约。
tesseract-studio.component.html: 工作区模板，承载嵌入式 n8n 页面、无 workflow 占位态、待对齐空态与状态操作按钮。
tesseract-studio.component.scss: 工作区样式，定义工作区、空态、待对齐态与无 workflow 占位态视觉。

法则
- 路由里的可选 `path/workflowId` 共同定义当前活动工作区；`workflowId` 一旦存在就必须优先刷新内嵌 n8n 到该 workflow。
- 页面在没有 `workflowId` 时只能显示占位文案；展示主页、默认示例或第三方 workflow，等同于制造调试幻觉。
- 无 workflow 的占位态只能影响“显示什么”，不能阻断 embedded n8n runtime 的后台拉起；否则右侧“创建工作流”会因为左侧没预热 n8n 而直接失败。
- `tesseract-project.service.ts` 广播的 workflow sync target 是左侧工作区的瞬时同步信号；一旦收到匹配目标，页面必须立刻更新路由或刷新 webview，不能等用户手动点“打开工作流”。
- embedded n8n 的营销/引导提示不属于 Tesseract 工作区语义，`dom-ready` 后必须主动清理，否则调试画面会被第三方提示污染。
- 任何影响聊天模式、runtime 或本地 n8n 绑定的项目路径变更，都必须先修正这里的同步链。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
