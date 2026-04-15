# frontend/ - Flutter Web 数字孪生与工作台

<directory>
assets/ - 数字孪生配置、图片、模型与视频资源
docs/ - 工程整改、代理与运维说明
lib/ - Flutter 业务源码，数字孪生、登录与网络层都在这里
lib/server/hardware_bridge/ - 本地硬件桥 facade，统一 MiniClaw WebSocket 与 MQTT 事件归一化
test/ - 数字孪生协议与模型回归测试
web/ - Flutter Web 入口与 three.js viewer 静态页
</directory>

<config>
pubspec.yaml - Flutter 依赖、资源清单与构建入口
analysis_options.yaml - Dart/Flutter 静态检查规则
dev_web_start.sh - 本地单入口启动脚本，拉起 18081 web-server 与 18082 同源代理
dev_web_stop.sh - 开发环境止血脚本，回收 18081/18082 残留进程
dev_web_proxy.js - 本地同源代理，给 Web 调试提供 API / n8n 代理出口
</config>

运行基线
- 当前有效路径：`/mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend`
- Flutter SDK：`/mnt/c/Users/sam/.codex/flutter/bin/flutter`
- 浏览器开发入口：`http://127.0.0.1:18082`
- 桌面端嵌入数字孪生直达入口：`http://127.0.0.1:18082/?entry=digital-twin&source=aily-blockly`

数字孪生主线
- 场景协议：`lib/module/device/model/device_event_model.dart`
- 场景 envelope：`lib/module/device/model/digital_twin_scene_envelope.dart`
- 挂载解算：`lib/module/device/model/digital_twin_mount_resolver.dart`
- 工作台单一真相源：`lib/module/home/home_workspace_page.dart`，当前桌面嵌入模式默认装配左侧 preview 区 + 数字孪生主画布，首页/教学入口则再挂载数字孪生 + AI 对话模式
- 桌面端场景注入：`lib/module/home/home_workspace_page.dart` 通过 `window.postMessage` 消费 aily-blockly 子窗口发来的 `tesseract-digital-twin-scene`
- 启动判流与本地嵌入直达：`lib/module/login/ui/splash_page.dart`
- Flutter Web 协议桥：`lib/module/home/widget/model_3d_viewer.dart`
- 左侧预览区：`lib/module/home/widget/digital_twin_preview_pane.dart`
- AI 注入入口：`lib/module/home/widget/ai_interaction_window.dart`，非嵌入工作台默认以 OpenClaw 对话模式挂载；`source=aily-blockly` 的嵌入链路仍保持纯数字孪生
- three.js 渲染端：`web/model_viewer/viewer.js`
- camera p2p 静态桥：`web/model_viewer/p2p_preview.html`、`web/model_viewer/ZLMRTCClient.js`
- 本地接口表：`assets/config/digital_twin_interfaces.json`
- 当前接口拓扑固定为 6 口：`port_1`~`port_4` + `port_hdmi` + `port_7`，其中 `port_hdmi` 是 screen 专用侧边 HDMI 口
- 本地组件安装锚点文件：`assets/config/digital_twin_mount_profiles.json`
- 本地接口-组件残差文件：`assets/config/digital_twin_port_component_overrides.json`
- backend-first 配置态 scene DTO：`lib/server/api/agent_chat_api.dart`
- backend-first 对话模式 envelope DTO：`lib/server/api/dialogue_mode_models.dart`
- 对话模式硬件校验与部署客户端：`lib/server/api/agent_validate_hardware_api.dart`、`lib/server/api/agent_start_deploy_api.dart`
- 本地硬件桥统一 facade：`lib/server/hardware_bridge/hardware_bridge_service.dart`

法则: Web 单入口·数字孪生收口·代理优先·文档同构
