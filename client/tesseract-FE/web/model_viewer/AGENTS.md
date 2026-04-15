# model_viewer/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/AGENTS.md

成员清单
index.html: three.js viewer 的宿主页面，提供容器、加载遮罩与 importmap。
viewer.js: 数字孪生渲染核心，负责模型加载、只读/可编辑双模式、绝对 world 位姿、初始化/运行时模型缩放、滚轮缩放安全边界、JSON-safe host/viewer 协议与 viewer 诊断日志。
p2p_preview.html: camera p2p 预览宿主页，承载 ZLMRTCClient 连接、streamUrl 诊断与 iframe 状态回传。
p2p_preview.js: camera p2p 预览桥，负责 streamUrl 配置、显式 connect/disconnect、连接状态、错误回传与 postMessage runtime state，禁止拿到 streamUrl 就自动拨起预览。
ZLMRTCClient.js: p2p 预览依赖的本地 WebRTC/ZLMRTC 适配库，供 iframe 同级加载。

法则
- `viewer.js` 只能消费协议消息，不允许把 Flutter 业务状态硬编码进渲染层。
- 任何新增 host/viewer 消息，都必须同步更新 `lib/module/home/widget/model_3d_viewer.dart`。
- host/viewer 消息必须同时兼容字符串 JSON 与对象；three.js 端不能假设 Flutter Web 总能把 JS object 还原成 Dart `Map`。
- 灯光、位姿、选择都属于同一条 viewer 协议链；当 `drag=false` 时，选择与 gizmo 必须整体退场，不能留下半套调试 UI。
- viewer 发出的 `position/rotation` 必须是预览窗口全局坐标系的绝对值；host 下发时若父节点存在变换，viewer 负责还原 local。
- 缩放既要支持初始化 `scl`，也要支持运行时协议更新；viewer 只执行协议，不自己猜测哪个模型该更大。
- 相机缩放边界与 near/far 裁剪属于 viewer 本地职责，不能把“滚轮安全”寄托给 Flutter 页面层。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
