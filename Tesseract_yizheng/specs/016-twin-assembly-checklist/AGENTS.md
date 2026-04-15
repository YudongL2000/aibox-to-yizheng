# specs/016-twin-assembly-checklist/
> L2 | 父级: specs/AGENTS.md

成员清单
spec.md: 数字孪生组装检测台特性规格，定义用户场景（清单展示、心跳实时更新、全部就绪自动通知闭环）、功能需求与验收标准。
plan.md: 实施计划，记录技术上下文、架构决策（职责迁移、postMessage 中继、面板布局、延迟完成与取消）与文件结构。
tasks.md: 任务分解，按依赖顺序排列 Flutter 组件创建、页面集成、aily-blockly 中继与对话闭环。
checklists/: 质量检查清单目录。

法则
- 本目录只承载 016 特性规格文档，不包含实现代码。
- 核心变更涉及 Flutter `assembly_checklist_panel.dart` + `home_workspace_page.dart`（清单面板）和 aily-blockly `iframe.component.ts` + `aily-chat.component.ts`（postMessage 中继与闭环）。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
