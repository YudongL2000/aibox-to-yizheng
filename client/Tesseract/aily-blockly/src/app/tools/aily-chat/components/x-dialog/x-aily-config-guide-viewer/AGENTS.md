# x-aily-config-guide-viewer/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/components/x-dialog/AGENTS.md

成员清单
x-aily-config-guide-viewer.component.ts: 配置阶段说明卡片，展示当前节点提示；hot_plugging 类型订阅 DialogueHardwareBridgeService，渲染实时接入清单、30 秒超时提示，并在所需组件齐备时自动确认当前节点；select/config_input/image_upload 类型提供内联提交。

法则
- `hot_plugging` 场景不再有任何 mock 文字或端口选择按钮，改为实时硬件清单、超时提示与自动确认。
- 所有卡片使用暗紫色主题（`rgba(24, 20, 38)` 背景，`rgba(176, 110, 255)` 强调色）。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
