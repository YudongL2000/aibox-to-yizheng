# Research: OpenClaw 对话模式

## Decision 1: 用单一对话状态机承载三条分支

**Decision**: 在 `frontend/lib/module/home/widget/ai_interaction_window.dart` 引入显式的对话模式状态机，把极速响应、协作引导、智能共创编码为同一 `phase/branch` 体系，而不是继续靠零散布尔值和消息卡片推断界面。

**Rationale**:
- 当前 AI 面板已经同时背着聊天、确认、配置、数字孪生回传，继续叠条件只会让“开始部署”“开启教学模式”“静默校验”互相串味。
- 这项功能的本质是会话状态迁移，不是单个按钮显隐。
- 一条状态机能天然表达“已就绪 -> 直接互动”“缺件 -> 校验中 -> 待部署”“未知 -> 教学接力”。

**Alternatives considered**:
- 继续在现有布尔状态上打补丁：实现快，但最容易把边界条件写成意外组合。
- 把每个分支拆成独立 widget：视觉上可分离，但会让同一个会话上下文分裂成三套逻辑。

## Decision 2: backend 输出 `dialogueMode` 包作为前端唯一业务真相源

**Decision**: 扩展现有 agent 响应结构，在 `response` 中增加 `dialogueMode` 包，包含 `branch`、`phase`、`skill`、`hardware`、`uiActions`、`physicalCue`、`teachingHandoff` 等字段；前端严格按该包渲染业务结论。

**Rationale**:
- 用户已明确要求“以 backend-Agent 输出为唯一真相源”，客户端不能再靠本地项目状态或旧渲染约定猜结论。
- 现有 HTTP/WS 契约已经围绕 `sessionId + response` 成型，扩展 envelope 比新增一套平行 API 更稳。
- 同一个 `dialogueMode` 包可以被 Flutter UI、数字孪生、后续桌面壳层共同消费。

**Alternatives considered**:
- 新开一套路由专门做对话模式：语义清晰，但会复制现有 session 体系。
- 让前端自己推导 `branch`：违背 backend-first 原则，也会让教学接力和部署按钮口径分裂。

## Decision 3: 硬件状态做前端适配层，后端负责最终校验

**Decision**: 在前端引入统一的本地硬件事件适配层，兼容 MiniClaw WebSocket (`ws://192.168.1.150:18789/`) 与现有 MQTT `device/usb/event`，只负责“插入/拔出/错误/心跳”标准化和即时 loading 反馈；真正的“是否满足技能需求”由 backend 二次校验后返回。

**Rationale**:
- 原型要求“插上的瞬间 UI 立即进入校验中”，这一拍应当靠离设备最近的客户端完成。
- 但“硬件是否真的满足当前技能”属于业务判断，必须回到 backend，避免 UI 误报 ready。
- 适配层让 MiniClaw WebSocket 与 MQTT 成为实现细节，不污染对话状态机。

**Alternatives considered**:
- 让 backend 直连本地硬件桥：可行，但会把本地网络拓扑和服务部署方式耦死。
- 仅依赖 MQTT：和当前 MiniClaw 联调图不一致，会把另一条现实接入路径排除在外。

## Decision 4: 先复用现有 HTTP Agent APIs，不把首版绑定到 backend WebSocket

**Decision**: 首版对话模式继续走现有 HTTP agent APIs 作为主交互链；硬件插拔即时感知由前端本地桥接触发，随后用明确的 backend 校验调用刷新 `dialogueMode` 状态。

**Rationale**:
- Flutter 端现有 `agent_chat_api.dart`、`agent_confirm_api.dart`、`agent_start_config_api.dart` 已可复用，变更面最小。
- 实时性真正关键的是“插入后 1 秒内显示校验中”，这一步前端本地事件就能满足。
- 把 backend WebSocket 留作后续增强，而不是首版必经路径，可显著降低落地复杂度。

**Alternatives considered**:
- 全链路切到 WebSocket：更实时，但会扩大改动面并延长验收链。
- 轮询设备状态：实现简单，但会破坏“插上的瞬间有反馈”的体验目标。

## Decision 5: 教学接力必须是显式 handoff 对象，不重搜也不重输

**Decision**: 当技能未命中时，backend 返回显式 `teachingHandoff` 对象，内含 `originalPrompt`、`prefilledGoal`、`entryMode` 和 `sourceSessionId`；前端点击“开启教学模式”后直接带着该对象跳转。

**Rationale**:
- 用户最痛的不是“不会跳”，而是“跳了以后还要重新输入一次”。
- `teachingHandoff` 作为显式对象，可以稳定穿过页面跳转、返回对话模式和后续埋点。
- 这也把“学习给花浇水”这类预填目标从 UI 文案提升为正式契约。

**Alternatives considered**:
- 只传一段 prompt 字符串：短期够用，但缺少来源会话和入口模式等上下文。
- 让教学页自己回读上一条消息：脆弱且容易在多轮对话里取错目标。
