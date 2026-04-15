# iframe/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/windows/AGENTS.md

成员清单
AGENTS.md: iframe 模块地图，描述外部页面承载器与桥接策略。
iframe.component.ts: 外部页面子窗口承载器，负责 URL 装载、加载态管理、Penpal 桥接与 IPC 更新分发，并把数字孪生 scene / preview-state 通过 JSON-safe postMessage 转发给 frontend 页面；数字孪生使用独立长加载窗以容纳 Flutter Web DDC 冷启动，同时消费子页 ready-handshake、consumed-ack、viewer-ready 与上行的 model click / mic / speaker control 事件；若 scene 连续无 ack，则按 revision 强制刷新嵌入页，行为对齐 n8n `loadURL` 式硬同步。新增 018 预览状态注入管道：`startPreviewStateRelay()` 订阅 combineLatest(MQTT + bridge)，将心跳 devices 映射为常驻的 mic/speaker/camera 三类 preview session 并区分 online 与 running，避免仅因在线就误报 LIVE；组装清单完成后不再要求返回对话窗口，`handleAssemblyWorkflowActionFromTwin()` 直接调用 Electron IPC 执行 workflow upload/stop，并把组装完成静默同步回聊天会话；`handleDeviceControlFromTwin()` 将 Flutter 上行的顶栏控制事件做 300ms 防抖后通过 electronAPI IPC 调用 MQTT 设备命令（麦克风开关、扬声器播放/停止）。
iframe.component.html: 通用嵌入窗口骨架，声明 loading/empty/iframe 与通知条布局；数字孪生场景展示专用 skeleton loading。
iframe.component.scss: 嵌入窗口视觉层，负责 iframe 区域、通知条与连线图操作栏样式，并定义数字孪生骨架屏与 shimmer 动效。

架构
- 该目录的职责是“把外部页面装进客户端”，不是替外部页面承担业务逻辑。
- 页面加载成功与 Penpal 桥接成功是两件不同的事；前者决定是否展示页面，后者只决定是否启用数据同步能力。
- 数字孪生页面不走 Penpal；scene 广播必须收敛成单一 `postMessage` 协议，避免 Flutter/three.js/Electron 三端各讲各话。
- 数字孪生首次加载前必须显示可感知的 skeleton，而不是灰色空白；加载态本身也是协议的一部分。
- 数字孪生加载超时不能复用普通 iframe 的 30 秒阈值；Flutter Web dev 模式会加载大量 DDC 脚本，宿主必须给足冷启动窗口，否则会把可恢复加载误判成失败。
- 数字孪生页面的 preview-state 也必须收敛成单一 `postMessage` 协议，并经 Electron 主进程缓存后再广播回子页；上行事件只负责汇报，不负责改写 scene。
- 诊断日志至少覆盖 `electron cache -> iframe push -> child ready -> consumed ack -> hard reload fallback` 五跳，否则定位不到“scene 算对了却没挂上”的断点。
- 跨运行时消息必须优先选择可序列化格式；`iframe.component.ts` 需要同时容忍字符串 JSON 与对象消息，不能把 child ready 或 canonical scene 堵死在类型边界上。
- 嵌入页冷启动存在时序竞争时，父窗口必须支持“子页 ready 后重放当前 scene”，不能假设第一页消息一定被接住。
- 父窗口必须记录最近一次推送的 scene summary，并在 child consumed-ack / viewer-ready 到达时输出 `revision/modelCount/modelIds` 对照日志；否则排障永远只能停留在“我以为已经发出去”。
- `setIframeUrl` 对归一化后的同一地址不得重复 `resetFrameLoadingState()`：否则 iframe 不二次触发 `load`，骨架屏会永久卡在「首帧心跳与场景状态同步」。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
