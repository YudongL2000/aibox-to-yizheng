# Research: MQTT 硬件运行时闭环

## 决策 1：heartbeat 作为唯一硬件在线与挂载真相源

- **Decision**: backend 以 MQTT heartbeat 解析出的设备列表作为硬件连接与挂载状态的唯一输入；前端不得继续保留 mock 插口状态或本地猜测拓扑。
- **Rationale**: 用户明确要求“以 heartbeat 判断是否连接到硬件”且要按 heartbeat 中的组件名、接口、状态更新数字孪生。任何前端局部状态都会与 heartbeat 裂脑。
- **Alternatives considered**:
  - 保留现有 mock hotplug 按钮，仅把 heartbeat 作为旁路校验：会继续产生双真相源。
  - 让 `aily-blockly` 直接消费 MQTT 并自行解析：会让 backend Agent 和数字孪生再次分叉。

## 决策 2：云侧下发与命令回包统一进入日志窗口

- **Decision**: 底部日志窗口同时显示三类事件：heartbeat、发送到 `cloud2edge` 的命令、端侧命令回包。
- **Rationale**: `heartbeat.log` 已给出最可读的样式，而且用户需要系统级 debug 视角。把这三类事件放到同一个日志流里最符合“运行时闭环”目标。
- **Alternatives considered**:
  - 仅显示 heartbeat：用户无法确认具体下发了什么命令。
  - 仅显示命令：用户无法判断硬件是否在线和是否挂载到正确端口。

## 决策 3：数字孪生五口映射按真实硬件固定

- **Decision**: `3-1.2 -> port_1`、`3-1.3 -> port_2`、`3-1.4 -> port_3`、`3-1.6 -> port_4`、`3-1.7 -> port_7`，其余 mock 端口不再参与可插拔模块映射。
- **Rationale**: 这是用户给出的真实物理约束，继续保留八口 mock 按钮只会制造误导。
- **Alternatives considered**:
  - 保留八口并隐藏三个：仍会把 UI 建模建立在错误的硬件事实上。

## 决策 4：麦克风与扬声器作为内置外设，不走 detachable mount

- **Decision**: mic/speaker 在数字孪生底座顶部始终可见，通过独立控制状态进入 runtime 与预览面板，不参与 heartbeat detachable port 映射。
- **Rationale**: 用户明确指出这两个外设组件是内置的。把它们塞进 heartbeat 外接口模型会扭曲硬件语义。
- **Alternatives considered**:
  - 把 mic/speaker 伪装成 `port_5/port_6`：会与真实硬件设计矛盾。

## 决策 5：摄像头预览采用 P2P/WebRTC 独立通道

- **Decision**: 点击摄像头模型时，客户端通过 P2P/WebRTC 逻辑建立预览，而不是从 MQTT 通道拉视频。
- **Rationale**: `p2p_example.html` 已明确播放链路；MQTT 更适合作为控制与状态，不适合实时媒体预览。
- **Alternatives considered**:
  - 通过 MQTT 传视频帧：不符合现有示例，也不现实。
  - 在主客户端而非数字孪生左侧显示预览：不符合用户希望“在数字孪生窗口左侧确认”的目标。

## 决策 6：对话模式只消费 backend 的语义分流结果

- **Decision**: backend 负责基于真实 skills 库和当前 `HardwareRuntimeState` 判定 specs/001 分支 A/B/C 或 MimicLaw fallback；前端不再持有任何 mock skill 列表或硬编码 skill 选项。
- **Rationale**: 用户要求“通过后端强大的 Agent 来判断到底要不要分流”，且已经多次暴露出前端硬编码技能导致的裂脑问题。
- **Alternatives considered**:
  - 保留前端 mock 快捷技能作为 UX 提示：会继续让测试结果依赖前端假数据。

## 决策 7：工作流上传/停止基于 backend canonical workflow context 触发 MQTT

- **Decision**: 只有当 backend workflow 已真实生成、当前节点配置完整且 hardware runtime 可用时，UI 才展示上传/停止按钮；点击后由 backend 使用 canonical workflow payload 发送 MQTT 命令。
- **Rationale**: 这延续了此前 workflow 真相源闭环，避免 Angular/Electron 自己拼一个“上传版工作流”。
- **Alternatives considered**:
  - 在前端直接读取当前 n8n webview 页面拼装 payload：不可靠，且会再次与 backend workflow 真相源分裂。
