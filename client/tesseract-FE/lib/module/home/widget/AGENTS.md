# widget/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/lib/module/home/AGENTS.md

成员清单
ai_interaction_window.dart: AI 双模交互中枢，负责教学模式/对话模式切换、workflow URL 回传、backend digital twin scene 注入与物理 cue 分发。
dialogue_mode/: 对话模式局部状态、DTO 映射与主卡片视图子模块。
model_3d_viewer.dart: Flutter Web 与 three.js iframe 的协议桥，管理 controller、channel、绝对 world transform、初始化/运行时缩放、灯光同步以及 `viewerReady/transformsChanged/rebuild/apply transforms` 的 viewer 诊断日志。
digital_twin_preview_pane.dart: 左侧 preview 面板与顶部控制条，统一渲染常驻的 mic/speaker/camera 三张诊断卡；mic/speaker 仅在设备真正 running 时显示活动波形，camera p2p 改为显式 connect/disconnect，并接收 runtime state / top control 状态。
digital_twin_control_console.dart: 数字孪生右侧控制台，消费 controller 与设备列表，承载组件选中、接口锚点吸附、绝对位姿、组件大小、等比例滑轨、组件安装锚点、接口-组件残差、三层挂载诊断和灯光编辑 UI，当前不在桌面嵌入工作台默认挂载。
code_console_widget.dart: 构建/部署阶段的 JSON 控制台，当前不在桌面嵌入工作台默认挂载。
model_preview_page.dart: 九宫格模式的单模型预览页。
assembly_checklist_panel.dart: 硬件组装清单面板，渲染组件需求列表与实时检测状态，支持别名匹配，并在全部就绪后直接显示“下发工作流/停止工作流”端侧操作按钮。
interaction_modules/: AI 卡片与配置交互子组件集合。

法则
- Flutter 侧只处理协议与状态，不直接猜测 three.js 内部对象。
- 任何新增 viewer 消息都必须同步更新 `viewer.js` 与本目录的桥接代码。
- host/viewer 协议必须优先走 JSON-safe 消息；`model_3d_viewer.dart` 需要同时容忍字符串 JSON 与对象消息，避免 Flutter Web 在 JS object 边界静默丢帧。
- 本目录中的 `position/rotation` 默认都指向预览窗口全局坐标系的绝对值，不再用“相对偏移”这种模糊语义。
- `scale` 允许单独编辑，也允许通过等比例滑轨整体缩放；两者都必须通过 controller 和 viewer 协议同步，不能靠重建 iframe 偷渡状态。
- 组件安装锚点与接口-组件残差必须拆开展示；前者定义组件天然对接姿态，后者只负责当前 `portId + modelId` 的现场校准。
- 所有挂载编辑器都必须明确区分“接口本地坐标”和“世界坐标”，并把接口锚点、安装锚点、残差和合成结果展示出来，避免误导。
- 控制台中的配置导出必须直接对应 `assets/config/digital_twin_mount_profiles.json` 与 `assets/config/digital_twin_port_component_overrides.json`，避免人工转译。
- 接口摆放 UI 只改 `interface_id`；组件安装锚点与接口残差分别由独立编辑区维护，不直接篡改接口挂载设备的绝对位姿。
- preview 区展示 mic/speaker 波形与 camera p2p 预览，top controls 只表达内置麦克风/扬声器，不再混入 3D 组件本体。
- 灯光属于 viewer 协议的一部分；Flutter 侧只保存配置，不直接改 three.js 内部灯对象。
- `digital_twin_control_console.dart` 只消费 controller 暴露的意图级方法，不反向窥探 HomeWorkspacePage 的局部状态。
- `home_workspace_page.dart` 现在以 preview 区 + 数字孪生画布为基础壳，首页/教学入口可再挂载 `AiInteractionWindow`，但仍以数字孪生画布为主视图。
- backend 配置态/对话态 scene 是唯一真相源；`ai_interaction_window.dart` 若消费到 `digitalTwinScene`，只能转发，不能重新拼一份本地模型列表。
- `dialogue_mode/` 只折叠 backend `dialogueMode` envelope，不得重新从消息文案、硬件桥事件或本地布尔值猜分支。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
