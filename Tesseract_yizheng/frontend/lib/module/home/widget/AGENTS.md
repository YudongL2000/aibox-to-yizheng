# widget/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/lib/module/home/AGENTS.md

成员清单
ai_interaction_window.dart: AI 双模交互中枢，负责教学模式/对话模式切换、workflow URL 回传、backend digital twin scene 注入与物理 cue 分发。
dialogue_mode/: 对话模式局部状态、DTO 映射与主卡片视图子模块。
model_3d_viewer.dart: Flutter Web 与 three.js iframe 的协议桥，管理 controller、channel、绝对 world transform、初始化/运行时缩放、灯光同步以及 `viewerReady/transformsChanged/rebuild/apply transforms` 的 viewer 诊断日志；loading shell 需与 Electron 数字孪生 skeleton 保持同一套文案、网格底与 shimmer 节奏。
digital_twin_preview_pane.dart: 数字孪生画布 overlay 配件层，统一渲染 mic/speaker/camera 诊断模块；活跃 session 直接展开为卡片，inactive session 默认收起为可展开按钮；mic/speaker 仅在设备真正 running 时显示活动波形，camera p2p 改为显式 connect/disconnect，并接收 runtime state / top control 状态；preview pane 本身不再额外挂 panel 或重复 top-control。
digital_twin_control_console.dart: 数字孪生右侧控制台，消费 controller 与设备列表，承载组件选中、接口锚点吸附、绝对位姿、组件大小、等比例滑轨、组件安装锚点、接口-组件残差、三层挂载诊断和灯光编辑 UI，当前不在桌面嵌入工作台默认挂载。
code_console_widget.dart: 构建/部署阶段的 JSON 控制台，当前不在桌面嵌入工作台默认挂载。
model_preview_page.dart: 单模型预览页，当前保持单层侧栏 + 画布结构。
assembly_checklist_panel.dart: 硬件组装清单面板，渲染组件需求列表与实时检测状态，支持别名匹配，并在全部就绪后直接显示“下发工作流/停止工作流”端侧操作按钮；面板自身负责唯一一层 shell，父层不得再套同语义容器。
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
- `home_workspace_page.dart` 现在把 `Digital Twin` 与 `Workflow` 组织成顶部浏览器式 tabs；切换时必须保留 `AiInteractionWindow` 会话与 digital twin scene，而不是销毁重建整个工作台。
- backend 配置态/对话态 scene 是唯一真相源；`ai_interaction_window.dart` 若消费到 `digitalTwinScene`，只能转发，不能重新拼一份本地模型列表。
- `dialogue_mode/` 只折叠 backend `dialogueMode` envelope，不得重新从消息文案、硬件桥事件或本地布尔值猜分支。
- `ai_interaction_window.dart` 只保留当前真实接入的 workflow/config/deploy 与 dialogue path；未接线的本地占位 widget/helper 一旦无引用必须删除，不能继续停留在总壳里制造假入口。
- `ai_interaction_window.dart`、`digital_twin_preview_pane.dart`、`assembly_checklist_panel.dart` 等主工作台组件必须优先消费 `context.spatial` 暴露的 semantic surface/status/button/input/list primitives；新增壳层样式禁止继续手写裸色值。
- preview、checklist、model preview 等主工作台活跃组件默认只允许一层直接语义容器；如果父页面已经提供 panel/stage，子组件必须输出扁平内容而不是继续再包一层同类 surface。
- `assembly_checklist_panel.dart` 在按钮区显现后也必须保持 scroll-safe；禁止再使用 `Expanded + ListView + 底部 CTA` 这类会在低高度侧栏里直接触发 `RenderFlex overflow` 的结构。
- `digital_twin_preview_pane.dart` 对 inactive preview session 必须优先走“折叠按钮 -> 点击展开”的密度控制；不要把所有 mic/speaker/camera 模块长期全量展开占满画布 overlay。
- `digital_twin_preview_pane.dart` 中的 camera 卡片不得再套第二层 data-block 语义框；camera iframe 内部若已是视频面，Flutter 壳层只保留一层卡片与一层视频裁切区。
- 任何叠在 `model_3d_viewer.dart` 这个 HtmlElementView/iframe 之上的 Flutter overlay，只要需要交互，就必须显式经过 `PointerInterceptor`；否则浏览器会把点击落给底层 viewer。
- `home_workspace_page.dart` 的 compact Digital Twin 布局不得再把 checklist 写死成固定 `240px`；画布与 checklist 必须共享剩余高度，让 checklist 在父级 shrink 时也能继续内部滚动。
- `interaction_modules/` 与 `dialogue_mode/` 的消息气泡、选择卡、确认卡、上传预览和 CTA 现在也必须走同一套 Spatial dark shell 语法；不允许再回到蓝紫渐变、荧光发光和散落的 `Color(0x...)` 叶子样式。
- `model_3d_viewer.dart`、`digital_twin_control_console.dart` 与 `code_console_widget.dart` 也必须视为主工作台活跃链路的一部分：状态色、边框、mono 文本与 loading/error shell 优先复用 `SpatialDesignTokens` / `context.spatial`，禁止继续挂裸 cyan/white/monospace 常量。
- preview、workflow 与 checklist 等主工作台活跃组件必须默认无 hero header；只有内容本身不足以说明当前面板职责时，才允许补一个简短标题。

变更日志
- 2026-04-12: `Model3DLightingConfig` 默认背景 hex 与 web viewer fallback 对齐到 shell 深灰 `#121316`，修复数字孪生从 loading skeleton 切到 ready 后画布回蓝的问题。
- 2026-04-12: `model_3d_viewer.dart` 的 loading shell 改为跟随 `viewerReady` 结束，并对齐 Electron 数字孪生 skeleton 的网格底、stage 占位与 shimmer 动效，避免 Flutter iframe 内再出现旧进度条风格。
- 2026-04-12: camera preview 去掉 Flutter 内层 data-block 包壳，并联动 web `p2p_preview.html` 删除可见 badge/header/底部 overlay，减少 preview 区的嵌套框数量。
- 2026-04-12: digital twin preview 收敛成共享模块壳；inactive mic/speaker/camera 默认折叠为按钮，点击后才展开完整卡片，避免左侧预览面板被非活跃模块长期占满。
- 2026-04-12: `WorkflowDetailsWidget` 开始过滤空白 workflow 明细；当暂时没有可展示字段时，CTA 直接挂在 `WORKFLOW SPEC` 标题下方，避免标题和按钮之间出现空洞区。
- 2026-04-12: preview、workflow 卡片、dialogue card 和 code console 删除多余说明文案与空态提示，只保留必要状态词。
- 2026-04-12: 首页工作台改为顶部 tabs 主视图，Digital Twin 与 Workflow 不再以三栏同权并排呈现。
- 2026-04-12: 清理 ai_interaction_window.dart 内未接线的 workflow/config placeholder UI 与无引用状态字段，保持首页工作台只暴露真实链路。
- 2026-04-12: 数字孪生 preview、AI 交互窗口与 assembly checklist 第一波对齐 Spatial Wireframe dark shell，统一 panel/data-block/list-item/status chip 视觉语法。
- 2026-04-12: 数字孪生 preview 去掉独立标题栏；工作台 tabs 与内容面收敛成一层式结构，不再重复大块 surface hero。
- 2026-04-12: 数字孪生 preview、assembly checklist 与 model preview 第二波扁平化，删除 preview 外层 panel、父级二次 checklist 包壳与预览页双分隔/双容器，工作台顶部控制只保留一份。
- 2026-04-12: HomeWorkspacePage tabs、preview chip、dialogue/teaching 卡片、消息气泡与右侧输入区第三波收口到低圆角矩形语法，禁止继续使用 `radiusPill`、`999` 或 `radiusLg + 10` 这类胶囊壳层。
- 2026-04-12: assembly checklist 改为整卡 `SingleChildScrollView + ConstrainedBox`，避免按钮区出现后在桌面侧栏/嵌入态触发底部 `RenderFlex overflow` 黄黑警戒条。
- 2026-04-12: compact Digital Twin 布局把 checklist 从固定 `240px` 改成和画布按 `3:2` 分配剩余高度，修复外层 `Column` 在矮窗口下把 checklist 顶出底部 9px 的 overflow。
- 2026-04-12: 数字孪生配件 preview 不再占独立列，改为由 HomeWorkspacePage 叠加到 stage 内部，保持单画布阅读路径。
- 2026-04-12: HomeWorkspacePage 给 stage 内 top controls 和配件 overlay 补上 `PointerInterceptor`，修复 HtmlElementView viewer 吃掉按钮点击导致无法展开/触发的问题。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
