# types/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/AGENTS.md

成员清单
electron.d.ts: renderer 侧的 Electron 全局类型边界，约束 preload 暴露出的 IPC/API 结构，包括 Tesseract/n8n/hardware/数字孪生 preview-state、结构化日志桥与 `env.get/set` 配置入口。

法则
- 这里的声明只描述 `window.electronAPI` 真正暴露的表面，不得用类型去美化一个并不存在的 bridge。
- preload / IPC 新增方法后，必须同步更新这里；否则 renderer 里的 `any` 黑洞会重新吞掉契约。
- `electronAPI.log` 若新增日志字段或诊断入口，类型必须先反映真实 IPC 契约，再允许 renderer 侧消费；日志接口不能靠口头约定存活。
- `digitalTwin` 下的 scene 与 preview-state 是两条真相源；scene 只表达配置场景，preview-state 只表达子页上行的 model click / mic / speaker / session control 事件。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
