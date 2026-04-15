# home/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/AGENTS.md

成员清单
home_workspace_page.dart: 工作台总装页，消费数字孪生 controller，并在“纯数字孪生嵌入模式”与“顶部浏览器式 tabs 的 Digital Twin / Workflow 工作台模式”之间切换，同时负责与父窗口进行 JSON-safe 的数字孪生 scene ready-handshake、replay、consumed-ack、preview/runtime state 与 viewer-ready 诊断；当前保留一层工作台内容区 grid backdrop，并继续避免重复 surface 与双份 top control，配件 preview 已收进画布内部作为 overlay，不再占独立列。
home_main_page.dart: 首页入口与导航壳，负责把 prompt 路由到教学或对话工作台，并以更克制的 Spatial shell 收口首页输入区与案例带；首页默认仍不额外挂 backdrop/grid。
home_market_page.dart: 市场页占位入口，未接线阶段也必须维持统一的极简 Spatial shell，不能直接落回 Flutter Placeholder。
home_my_product_page.dart: 产品展示页，当前不在数字孪生主链路，并保持只展示核心标题与卡片信息。
controller/: Home 模块的数字孪生控制器层，承接场景、灯光与 viewer 协议状态。
model/: Home 模块本地模型层与轻量状态占位。
widget/: Home 模块组件层，承载 3D viewer、AI 辅助组件与调试部件。

架构
- `module/login/ui/splash_page.dart` 可基于查询参数把本地嵌入入口直接导向 `HomeWorkspacePage`；嵌入入口保持纯数字孪生，常规入口默认直接进入以 Digital Twin 为首屏的工作台。
- 数字孪生主链路: `HomeWorkspacePage -> Model3DViewer -> web/model_viewer/viewer.js`
- 工作台通过 `controller/digital_twin_console_controller.dart` 维护场景与灯光真相源；`home_workspace_page.dart` 负责读取 `assets/config/digital_twin_interfaces.json`、`assets/config/digital_twin_mount_profiles.json`、`assets/config/digital_twin_port_component_overrides.json`，并把结果收口到 Digital Twin tab 的画布 overlay preview + 数字孪生主画布。
- 数字孪生嵌入页必须把最近一次收到的 backend scene 保留下来；本地默认资产加载完成后只能重放该 scene，不能把已挂载组件重新覆盖回底座。
- `home_workspace_page.dart` 负责把跨运行时 `postMessage` 数据先归一化成 Dart 可消费结构，再交给 `DigitalTwinSceneConfig.tryParse`，避免 JS object / Dart Map 边界把 scene 静默吞掉；scene 应用后必须回传 consumed ack，并在 viewer 构建日志里打印 revision/modelIds。
- scene 被页面消费后，必须把 `revision/modelCount/modelIds` 以 consumed-ack 回传给父窗口；否则 Electron 侧无法确认“scene 已发出”和“scene 已生效”之间的断点。
- 默认打开数字孪生时只显示 `device-001 / 5.glb` 底座；硬件 mock 插拔产生的挂载态必须通过 backend scene + 父窗口消息注入，不允许页面自己猜测全套组件。
- scene envelope 现在要同时表达 preview sessions 与 top controls；preview 区与顶部 mic/speaker 控件不能再写死在页面里。
- `widget/ai_interaction_window.dart` 现在是首页工作台 Workflow tab 的正式对话入口；只有 `source=aily-blockly` 的嵌入模式才保持“纯数字孪生无 AI 面板”。
- 常规入口的工作台必须把 Digital Twin 与 Workflow 组织成顶部浏览器式 tabs；不能再回退成数字孪生、preview、AI 三栏同权并排，导致主任务层级不清。
- 常规工作台默认先落到 Digital Twin；Workflow 入口应该表现为“创建/打开工作流”的动作，而不是和主视图并列的第三类导航。
- `utils/spatial_design_ref.dart` 是首页工作台主题 token 的唯一真相源；主工作台新增/重构样式必须优先消费 semantic surface/text/status/button/list primitives，不再在壳层直接手写 `Color(0x...)`。
- `frontend/lib/main.dart` 会读取宿主传入的 `theme` query 参数；Flutter 首页、工作台与 viewer 占位态必须跟随 Electron 侧当前 theme，而不是各自硬编码 dark/light。
- `home_main_page.dart` 也属于 Flutter 默认活跃入口链路；登录成功后如果仍回到首页，用户首先看到的必须是当前 Spatial shell，而不是遗留的 cyan glow 首屏。
- Flutter 页级 shell 默认只允许一层 grid backdrop 与一层语义容器；禁止继续叠背景 grid/backdrop、外层 panel、内层 panel、内容 panel 四层同屏。
- Workflow / Digital Twin 主工作台里的侧栏卡片必须容忍矮高度约束；像 assembly checklist 这类会在底部追加 CTA 的组件，优先改成组件内自滚动，而不是依赖父级再给更高固定高度。
- compact 工作台布局同样不得用固定高度把 preview/canvas/checklist 串起来；剩余高度应由 `Expanded/Flexible` 分配，否则侧栏组件修成可滚动后，外层 `Column` 仍然会继续 overflow。
- 首页/产品页的占位导航和未接线交互壳一旦失去引用就应直接删除，不能继续作为“以后可能会用”的死代码挂在主链路文件里。
- 首页和工作台都必须遵守 less is more：如果 shell 已经表达页面身份，就不要再加第二层 hero、subtitle 或说明型段落。
- `home_market_page.dart` 这类未接线入口也必须留在统一视觉体系内；允许“稍后接入”，但不允许 `Placeholder()`、调试色块或无 token 的临时 UI。

变更日志
- 2026-04-12: home_market_page.dart 从 Placeholder 收敛为极简市场占位页，避免脱离主视觉体系。
- 2026-04-12: 首页、工作台和作品集页删去多余说明文案，只保留必要标题、状态与操作文案。
- 2026-04-12: 首页工作台改为顶部浏览器式 tabs，Digital Twin 与 Workflow 成为同级主视图，切换时保留 AI 会话与数字孪生状态。
- 2026-04-12: 清理 home_my_product_page.dart 的未接线导航状态，并收紧首页 AI 面板只保留实际接入的 workflow/config/deploy 链路。
- 2026-04-12: 常规启动默认进入 Digital Twin 主视图；只有 prompt 直达和显式 surface 参数才优先打开 Workflow。
- 2026-04-12: HomeWorkspacePage / AiInteractionWindow / preview / assembly checklist 第一波切到 Spatial Wireframe dark shell，工作台主链路统一采用 panel/data-block/list-item/status-chip 语法。
- 2026-04-12: HomeMainPage 重构为 Spatial dark landing shell，统一品牌头部、prompt 输入、设备快捷入口与 workflow 案例带，不再保留旧的赛博蓝渐变首页。
- 2026-04-12: 工作台二次收敛为一层 tabs + 内容面，删除 surface hero、重复 subtitle 与多余说明文案；首页案例带与作品集页同步压缩信息密度。
- 2026-04-12: 工作台、首页与模型预览页继续扁平化，移除 workspace 背景 grid/backdrop、preview 外层 panel、assembly 父级二次包壳与重复 top control，页级 shell 收敛到单层结构。
- 2026-04-12: Workflow / Digital Twin tab 内容区恢复单层 wireframe grid backdrop，用于保证工作台留白区可见网格，但仍禁止回到多层 backdrop/panel 叠加。
- 2026-04-12: assembly checklist 在工作台侧栏改为组件内自滚动，修复全部就绪后 CTA 区把清单卡挤出底部 9px 的 Flutter overflow。
- 2026-04-12: compact Digital Twin 工作台把 checklist 固定高改为弹性分配，修复外层布局在窄高窗口里继续报 9px overflow 的剩余问题。
- 2026-04-12: Digital Twin 页面基底与 tabbed workspace backdrop tone 改为跟 Workflow 共用同一套 page palette，避免切回 workflow 时出现不同底色语法。
- 2026-04-12: 配件 preview 从独立左列收进数字孪生画布内部，改为 stage overlay 展示，避免工作台被切成“配件区 + 画布区”两块。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
