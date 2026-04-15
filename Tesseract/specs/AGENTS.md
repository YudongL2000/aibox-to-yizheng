# specs/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/AGENTS.md

成员清单
001-openclaw-dialog-mode/: “OpenClaw 对话模式”特性规格目录，承载需求规格与质量检查清单。
002-hotplug-port-sync/: “mock 插拔端口同步”特性规格目录，承载默认底座、snapshot 全量快照与数字孪生实时挂载需求。
003-workflow-sync-placeholder/: “工作流占位与自动同步”预备规格壳，记录一次未采用的 feature scaffold，避免规格树出现无语义目录。
004-workflow-view-sync/: “工作流视图同步闭环”正式规格目录，承载占位态、创建后自动切换与内嵌 n8n 同步验收要求。
005-skills-library-dialogue/: “教学模式存库与对话模式真 Skill 分流”正式规格目录，承载 skills 持久化、飞入反馈与 A/B/C 真分流需求。
006-digital-twin-truth-sync/: “数字孪生唯一真相源同步”正式规格目录，承载 mock 端口确认后的实时 scene 对齐、顶层子窗口约束与 backend-first 配置态验收。
007-mqtt-hardware-sync/: 早期 MQTT 规格壳，记录第一次热插拔 mock → MQTT 真链路的需求草案，现已被 009 正式规格替代。
009-mqtt-hardware-live/: “MQTT 真硬件联动”正式规格目录，承载 heartbeat 真相源、技能语义分流、工作流下发/停止、数字孪生预览与日志闭环。
010-tesseract-ux-loop/: “客户端交互体验闭环”正式规格目录，承载品牌统一、工作流确认直达、技能卡片真分流、配置 GUI 渲染与窗口层级体验优化。
011-ux-feedback-polish/: “UX 反馈收口”正式规格目录，承载澄清循环修复、会话隔离、热插拔真检测、流程图预渲染与桌面端品牌/加载态抛光需求。012-mermaid-render-fix/: "Mermaid 图表渲染修复"正式规格目录，修复 aily-mermaid 代码块因 JSON 包装与 markdown unescape 冲突导致的 "No diagram type detected" 渲染失败。
013-digital-twin-jitter-fix/: "数字孪生心跳抖动修复"正式规格目录，修复 syncDigitalTwinScene 去重 key 包含 source/heartbeatAt 导致每次心跳触发 IPC 调用的抖动问题。
014-hardware-assembly-twin-ux/: "硬件组装数字孪生 UX 重设计"正式规格目录，将 hot_plugging 节点从内联聊天卡片移入数字孪生专用组装窗口，以「开始组装硬件」按钮分隔软硬件两配置阶段，心跳全部就绪后自动关闭窗口并无缝衔接 confirmNode 闭环。
015-hotplug-detection-fix/: "热拔插设备检测修复"正式规格目录，修复 heartbeat `devices: string[]` 无法进入桥接组件快照、alias 匹配过弱与残留 timeout 误报，确保数字孪生与对话推进共享同一份硬件真相源。
016-twin-assembly-checklist/: "数字孪生组装检测台"正式规格目录，将硬件组装组件检测从 aily-blockly 对话窗口迁移至 Flutter 数字孪生前端，在窗口右侧显示组件清单面板，基于心跳自动更新勾选状态，全部就绪后自动通知闭环。
017-hardware-assembly-list-fix/: "硬件组装清单三联修"正式规格目录，修复三个确认 Bug：① devices 字符串格式解析导致摄像头不更新；② 组装清单仅显示当前节点而非所有硬件；③ 软硬件配置顺序倒置，同时实现一次组装完成后批量自动确认剩余硬件节点。
018-twin-preview-device-control/: "数字孪生预览面板设备控制"正式规格目录，承载 MQTT 心跳→预览状态注入管道、麦克风/扬声器 MQTT 控制中继、Camera P2P WebRTC 预览 streamUrl 透传、Flutter 侧 topControls 绑定修复与 IPC 全链路设备操控闭环。
法则
- `specs/` 只存放 feature 规格与其配套检查清单，不承载实现代码或临时调试记录。
- 每新增一个 feature 目录，都必须同步补齐该目录自己的 `AGENTS.md`，避免规格树出现语义盲区。
- 规格文档必须描述用户价值、范围与验收标准，禁止泄露框架、接口或模块结构等实现细节。
- 如果出现重复 feature 壳，必须在 `AGENTS.md` 中明确哪个是正式规格、哪个是预备脚手架，不能让编号分叉变成语义分叉。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
