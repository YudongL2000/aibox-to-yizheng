# model_viewer/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/AGENTS.md

成员清单
index.html: three.js viewer 的宿主页面，提供容器、加载遮罩、缩略导航 HUD 与 importmap；loading 视觉必须与 Electron digital twin skeleton 保持同一套网格底、stage 占位与中文文案。
viewer.js: 数字孪生渲染核心，负责模型加载、只读/可编辑双模式、绝对 world 位姿、初始化/运行时模型缩放、滚轮缩放安全边界、缩略图驱动的只读平移导航、JSON-safe host/viewer 协议与 viewer 诊断日志。
p2p_preview.html: camera p2p 预览宿主页，承载 ZLMRTCClient 连接、隐藏 stream/status 诊断节点与 iframe 状态回传；视觉层默认只保留扁平视频区，并移除浏览器原生播放器控件。
p2p_preview.js: camera p2p 预览桥，负责 streamUrl 配置、显式 connect/disconnect、连接状态、错误回传与 postMessage runtime state，禁止拿到 streamUrl 就自动拨起预览，并且必须兼容诊断 DOM 被隐藏后的更新。
ZLMRTCClient.js: p2p 预览依赖的本地 WebRTC/ZLMRTC 适配库，供 iframe 同级加载。

法则
- `viewer.js` 只能消费协议消息，不允许把 Flutter 业务状态硬编码进渲染层。
- 任何新增 host/viewer 消息，都必须同步更新 `lib/module/home/widget/model_3d_viewer.dart`。
- host/viewer 消息必须同时兼容字符串 JSON 与对象；three.js 端不能假设 Flutter Web 总能把 JS object 还原成 Dart `Map`。
- 灯光、位姿、选择都属于同一条 viewer 协议链；当 `drag=false` 时，选择与 gizmo 必须整体退场，不能留下半套调试 UI。
- 当 `drag=false` 时，主画布鼠标只保留旋转/缩放；平移必须交给右下缩略导航图，不能再把主画布左键拖拽绑成 pan。
- viewer 发出的 `position/rotation` 必须是预览窗口全局坐标系的绝对值；host 下发时若父节点存在变换，viewer 负责还原 local。
- 缩放既要支持初始化 `scl`，也要支持运行时协议更新；viewer 只执行协议，不自己猜测哪个模型该更大。
- 相机缩放边界与 near/far 裁剪属于 viewer 本地职责，不能把“滚轮安全”寄托给 Flutter 页面层。
- `p2p_preview.html` 不得重复绘制与 Flutter 宿主已提供的 badge/header/status shell；camera iframe 内优先只保留视频面本身，避免出现多层嵌套框。
- `p2p_preview.html` 不得回退到浏览器原生 `video controls`；camera 播放控制统一由 Flutter 外层的 connect/disconnect CTA 提供。

变更日志
- 2026-04-12: `index.html` 的静态 overlay 从旧蓝色进度条改为 Electron 对齐的 skeleton loading，修复数字孪生在 Flutter / Electron 兼容链路里仍露出旧 loader 的问题。
- 2026-04-12: `index.html` / `viewer.js` 默认画布底色与加载遮罩统一改为 dark shell 深灰 `#121316`，避免 viewer ready 后从加载态深灰跳回旧深蓝。
- 2026-04-12: `index.html` / `viewer.js` 为只读 `drag=false` 模式新增右下缩略导航图；主画布恢复成旋转/缩放，平移改由缩略图拖拽完成。
- 2026-04-12: camera p2p iframe 去掉浏览器原生播放器控件，保持预览区只显示纯视频画面。
- 2026-04-12: camera p2p iframe 去掉可见 badge/header/底部 overlay，只保留扁平视频区；stream/status 诊断节点改为隐藏 DOM，继续由 `p2p_preview.js` 维护。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
