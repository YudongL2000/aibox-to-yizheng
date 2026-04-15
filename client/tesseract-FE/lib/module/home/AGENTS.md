# home/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/AGENTS.md

成员清单
home_workspace_page.dart: 工作台总装页，消费数字孪生 controller，并在“纯数字孪生嵌入模式”与“数字孪生 + AI 对话模式工作台”之间切换，同时负责与父窗口进行 JSON-safe 的数字孪生 scene ready-handshake、replay、consumed-ack、preview/runtime state 与 viewer-ready 诊断。
home_main_page.dart: 首页入口与导航壳，负责把首页按钮与 prompt 路由到教学或对话工作台。
home_my_product_page.dart: 产品展示页，当前不在数字孪生主链路。
controller/: Home 模块的数字孪生控制器层，承接场景、灯光与 viewer 协议状态。
model/: Home 模块本地模型层与轻量状态占位。
widget/: Home 模块组件层，承载 3D viewer、AI 辅助组件与调试部件。

架构
- `module/login/ui/splash_page.dart` 可基于查询参数把本地嵌入入口直接导向 `HomeWorkspacePage`；嵌入入口保持纯数字孪生，常规入口则可直接挂载 AI 对话模式。
- 数字孪生主链路: `HomeWorkspacePage -> Model3DViewer -> web/model_viewer/viewer.js`
- 工作台通过 `controller/digital_twin_console_controller.dart` 维护场景与灯光真相源；`home_workspace_page.dart` 负责读取 `assets/config/digital_twin_interfaces.json`、`assets/config/digital_twin_mount_profiles.json`、`assets/config/digital_twin_port_component_overrides.json`，并把结果收口到 preview 区 + 数字孪生画布。
- 数字孪生嵌入页必须把最近一次收到的 backend scene 保留下来；本地默认资产加载完成后只能重放该 scene，不能把已挂载组件重新覆盖回底座。
- `home_workspace_page.dart` 负责把跨运行时 `postMessage` 数据先归一化成 Dart 可消费结构，再交给 `DigitalTwinSceneConfig.tryParse`，避免 JS object / Dart Map 边界把 scene 静默吞掉；scene 应用后必须回传 consumed ack，并在 viewer 构建日志里打印 revision/modelIds。
- scene 被页面消费后，必须把 `revision/modelCount/modelIds` 以 consumed-ack 回传给父窗口；否则 Electron 侧无法确认“scene 已发出”和“scene 已生效”之间的断点。
- 默认打开数字孪生时只显示 `device-001 / 5.glb` 底座；硬件 mock 插拔产生的挂载态必须通过 backend scene + 父窗口消息注入，不允许页面自己猜测全套组件。
- scene envelope 现在要同时表达 preview sessions 与 top controls；preview 区与顶部 mic/speaker 控件不能再写死在页面里。
- `widget/ai_interaction_window.dart` 现在是首页工作台的正式对话入口；只有 `source=aily-blockly` 的嵌入模式才保持“纯数字孪生无 AI 面板”。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
