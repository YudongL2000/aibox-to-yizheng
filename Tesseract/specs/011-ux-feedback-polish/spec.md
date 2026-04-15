# Feature Specification: UX Feedback Polish

**Feature Branch**: `011-ux-feedback-polish`  
**Created**: 2025-07-14  
**Status**: In Review  
**Input**: User description: "6 项 UX 反馈修复：(1) 数字孪生加载态/品牌/硬件状态位置/窗口层级/本地库尺寸；(2) 热插拔去掉 mock 插入 UI 改为真实心跳检测；(3) 图表渲染失败修复+需求总结阶段提前出初步流程图；(4) 渲染卡片颜色统一为紫色主题；(5) 教学→对话模式会话隔离+技能卡片置顶；(6) debug 后端澄清问题生成失败（ReflectionEngine 已返回 direct_accept 仍进入无限澄清循环）。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 教学/对话会话完全隔离且技能卡片置顶 (Priority: P1)

作为在教学模式中已完成几轮工作流构建的用户，当我切换到对话模式时，我希望进入一个独立的新会话，而不是继承教学模式的上下文；我还希望在对话模式顶部立即看到现有技能库卡片，而不是等待 Agent 在对话气泡中推送。

**Why this priority**: 教学→对话的会话污染会导致 Agent 拿错 context：错误地认为用户"已配置了某个工作流"，推荐不相关技能，甚至拒绝重新理解需求。这是对话闭环能否正确运行的基础。

**Independent Test**: 在教学模式完成一次工作流构建后切换到对话模式，检查：(1) 对话历史只包含对话模式自身的消息；(2) 页面顶部渲染技能库卡片列表，不依赖 Agent 回复触发。

**Acceptance Scenarios**:

1. **Given** 用户在教学模式完成了多轮工作流构建, **When** 用户切换到对话模式, **Then** 对话框内必须显示一个全新的会话，历史记录不包含教学模式的任何消息。
2. **Given** 对话模式刚刚打开, **When** 页面完成初始化, **Then** 技能库中已有的技能卡片必须出现在对话区域顶部，作为独立的卡片列表渲染，而不是嵌在 Agent 气泡中。
3. **Given** 对话模式当前技能卡片列表已展示, **When** 用户在对话框中发送新消息, **Then** 顶部技能卡片列表保持可见，不被新消息替换或遮盖。
4. **Given** 用户在对话模式完成了几轮交互后切换回教学模式, **When** 再次进入教学模式, **Then** 教学模式恢复到切换前的状态，对话模式的消息不出现在教学历史中。

---

### User Story 2 - 后端澄清引擎不再进入无限循环 (Priority: P1)

作为在教学模式中描述硬件需求的用户，我希望 Agent 在理解我的意图后直接给出需求总结或追问一次，而不是反复问我同样的问题或停在"还需要更多信息"状态。

**Why this priority**: ReflectionEngine 在 LLM 已返回 `decision: direct_accept` 且 `missing_info: []` 的情况下仍读取旧 session 状态，判定 `缺失 2 项关键信息`，导致无限澄清循环。这直接阻断用户进入后续工作流生成阶段，是优先级最高的功能性 bug。

**Independent Test**: 在教学模式描述一个完整的工作流需求（含设备类型、动作和触发条件），发送后观察后端日志：当 LLM 返回 `direct_accept` 时，系统必须进入需求总结阶段，而不是再次发送澄清问题。

**Acceptance Scenarios**:

1. **Given** 用户发送了一条包含完整设备与动作描述的需求, **When** LLM 判定 `decision: direct_accept` 且 `missing_info: []`, **Then** 系统必须立即进入需求总结阶段，不得再发送澄清问题。
2. **Given** LLM 在上一轮返回了 `missing_info` 非空, **When** 用户补充了所有缺失信息之后 LLM 再次评估返回 `direct_accept`, **Then** 系统必须识别本轮 LLM 响应（非上轮 session 历史），并进入总结阶段。
3. **Given** LLM 返回 `direct_accept` 但 `confidence` 低于阈值, **When** ReflectionEngine 处理该响应, **Then** 系统可以选择进一步澄清，但必须基于本轮 LLM 结果，而不是 session 历史中的旧 `missing_info`。
4. **Given** 系统已多次进入澄清循环, **When** 诊断后端日志, **Then** 每轮 ReflectionEngine 判断所用的 `missingInfoCount` 必须来自当前 LLM 调用的 `missing_info.length`，日志中不得出现新旧不一致的矛盾记录。

---

### User Story 3 - 流程图在需求总结阶段即刻渲染且格式正确 (Priority: P1)

作为在教学模式中确认需求的用户，我希望在 Agent 给出需求总结时就能看到一张预览流程图（而不是等到工作流生成完成才出现），并且图表不报渲染失败错误。

**Why this priority**: 当前流程图仅在最终工作流生成后才出现，需求总结阶段是纯文本。同时 mermaid 渲染因格式不匹配（flowchart LR 被包裹在 JSON 字符串中）导致 `No diagram type detected` 错误，使整个图表功能实际失效。这两个问题合并修复，完成后用户在需求确认阶段就能可视化校验流程方向。

**Independent Test**: 发送一个完整工作流描述，在 AI 返回需求总结气泡时，页面必须紧接着渲染一个流程图；图表中节点以正确的 mermaid flowchart LR 格式显示，不出现 `No diagram type detected` 错误字符串。

**Acceptance Scenarios**:

1. **Given** Agent 完成需求总结生成, **When** 需求总结消息展示在聊天界面, **Then** 同一气泡或紧随其后的气泡必须渲染一张基于当前需求的初步流程图。
2. **Given** 初步流程图数据从后端到达前端渲染器, **When** mermaid 引擎解析该数据, **Then** 图表必须成功渲染，不出现 `No diagram type detected matching given configuration` 错误信息。
3. **Given** 后端生成的 mermaid 代码包含节点标签含特殊字符（如双引号、中文）, **When** 前端渲染, **Then** 图表必须正常显示所有节点，不截断内容。
4. **Given** 最终工作流生成完成后, **When** 确认工作流阶段的流程图出现, **Then** 该图表必须是完整的最终版（节点数据与生成工作流匹配），而不是与需求总结阶段相同的初步版。

---

### User Story 4 - 热插拔阶段显示真实检测状态并移除 mock UI (Priority: P2)

作为在热插拔阶段等待系统检测硬件连接的用户，我希望看到真实的检测反馈——哪些组件已接入、哪些仍缺失——而不是一行静态提示"请在下方按钮区域选择一个接口，模拟把当前硬件插入对应位置"。

**Why this priority**: mock UI 在演示环境以外毫无实际作用，且会误导用户认为系统在等待他们"模拟插入"而非真实连接；但它不阻断工作流主闭环，因此优先级低于前三项。

**Independent Test**: 进入热插拔阶段，不触碰任何模拟按钮，确认 UI 不再显示 mock 插入提示；将目标硬件真实接入，确认系统在心跳到达后自动识别并更新步骤状态。

**Acceptance Scenarios**:

1. **Given** Agent 进入热插拔/硬件配置步骤, **When** 相关界面渲染, **Then** 不得显示任何包含"模拟把当前硬件插入"字样的提示文本或按钮。
2. **Given** 热插拔步骤当前等待某组件接入, **When** MQTT 心跳上报该组件已在线, **Then** 步骤指示器必须自动更新，将该组件标记为已接入，无需用户手动确认。
3. **Given** 所有所需硬件均已通过真实心跳标记为在线, **When** 系统完成硬件校验, **Then** 热插拔步骤必须自动推进到下一配置步骤，而不是停在等待状态。
4. **Given** 等待超时（硬件长时间未接入）, **When** 超时触发, **Then** 系统必须展示一条明确的重试或跳过引导，而不是无限期停在心跳等待状态。

---

### User Story 5 - 桌面端视觉与品牌统一 (Priority: P2)

作为初次使用桌面端的用户，我希望看到一致的品牌命名（Tesseract / Tess）、清晰的硬件状态位置（顶部左上）、合理的窗口层级（Studio 在数字孪生之上）以及更小的本地库弹窗，使整体 UI 感觉精致而非拼凑。

**Why this priority**: 品牌和视觉一致性直接影响产品感知质量，这对于演示和第一印象关键，但不阻断任何主要功能流，因此优先级为 P2。

**Independent Test**: 启动桌面端，检查：(1) 所有 "Aily Blockly" 文案替换为 "Tesseract"，AI 角色名替换为 "Tess"；(2) 硬件连接状态显示在左侧导航顶部；(3) 同时打开 Studio 和数字孪生，Studio 在上层；(4) 所有聊天渲染卡片的主色调为紫色；(5) "我的本地库"弹窗宽度/高度约为原来的 75%。

**Acceptance Scenarios**:

1. **Given** 用户启动桌面端并查看顶部/侧边栏品牌文字, **When** 任何 UI 元素显示产品名, **Then** 必须显示 "Tesseract" 而非 "Aily Blockly"；AI 聊天角色必须显示 "Tess" 而非 "aily"。
2. **Given** 桌面端已加载且 MQTT 连接状态为已连接, **When** 用户查看左侧导航区域顶部, **Then** 必须能看到硬件连接状态指示器（含在线/离线状态和组件数），位于左侧菜单栏右侧顶部。
3. **Given** 用户同时打开数字孪生和 Studio 面板, **When** 两个窗口重叠, **Then** Studio 必须始终位于数字孪生之上，不被遮挡。
4. **Given** 聊天界面渲染包含背景色的卡片（需求总结卡、技能卡、配置卡）, **When** 用户查看这些卡片, **Then** 卡片主色调必须为紫色系（与现有操作按钮主题一致），不出现米白/奶油色背景。
5. **Given** 用户点击打开"我的本地库", **When** 弹窗出现, **Then** 弹窗尺寸必须约为原来的 75%（宽度和高度均缩小），且内容仍可正常滚动浏览。

---

### Edge Cases

- **数字孪生加载状态**：心跳尚未到达时数字孪生区域应显示加载占位（骨架屏或 spinner），而非灰色空白；心跳到达后平滑切换到正常渲染，不抖动。
- **会话切换时 context 为空**：若对话模式首次打开时技能库为空，顶部区域必须显示"暂无技能，前往教学模式生成"的空状态引导，而不是渲染空列表或崩溃。
- **mermaid 节点标签特殊字符**：后端生成的节点名称含 `"` 或 `\n` 时，前端必须 escape 处理后再传给 mermaid 渲染器。
- **ReflectionEngine 边界**：若 LLM 返回 `direct_accept` 但 `reasoning_summary` 字段为空，系统仍应进入需求总结阶段，不抛异常。
- **热插拔超时阈值**：超时时间应可配置（默认 30s），不应硬编码在前端渲染层。
- **品牌替换范围**：品牌替换只针对用户可见的 UI 文案；包名、bundle ID、日志字符串不在此轮替换范围内。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须在教学模式切换至对话模式时创建独立的新对话会话，教学模式历史消息不得出现在对话模式视图中。
- **FR-002**: 系统必须在对话模式初始化完成后，立即在对话区域顶部渲染来自本地技能库的技能卡片列表，不依赖 Agent 消息触发。
- **FR-003**: ReflectionEngine 在处理 LLM 响应时，必须使用本次 LLM 调用返回的 `missing_info.length` 作为缺失计数，而不得读取 session 历史中的旧 `missing_info` 数组。
- **FR-004**: 当 LLM 返回 `decision: "direct_accept"` 且 `missing_info: []` 时，系统必须立即退出澄清循环并进入需求总结阶段。
- **FR-005**: 系统必须在需求总结气泡生成后立即渲染一张基于当前需求的初步 mermaid 流程图，不等待最终工作流生成完成。
- **FR-006**: 后端向前端推送 mermaid 图表内容时，必须以纯 mermaid 代码字符串形式传递（例如以 `flowchart LR\n` 直接开头），不得将 mermaid 代码包裹在 JSON 对象中传递给渲染器。
- **FR-007**: 热插拔/硬件配置步骤的聊天 UI 中必须移除所有包含"模拟把当前硬件插入"等 mock 指引文案，对应按钮逻辑也必须同时删除。
- **FR-008**: 当 MQTT 心跳上报某硬件组件在线时，热插拔步骤指示器必须自动更新该组件状态，无需用户手动触发。
- **FR-009**: 热插拔等待阶段必须在超时（默认 30 秒）后展示重试/跳过引导，不得永久停在等待状态。
- **FR-010**: 桌面端所有用户可见的产品名称文案必须替换为 "Tesseract"，AI 角色名称必须替换为 "Tess"。
- **FR-011**: 硬件连接状态指示器必须显示在桌面端左侧导航区域顶部（左菜单栏右侧），保持持续可见。
- **FR-012**: 所有聊天渲染卡片（需求总结卡、技能卡、配置步骤卡）的主背景色必须使用紫色系主题色，替换现有米白/奶油色。
- **FR-013**: "我的本地库"弹窗的宽度和高度必须缩小至原来的约 75%，内容区域支持滚动。
- **FR-014**: 数字孪生区域在 MQTT 心跳首次到达前必须显示加载骨架屏，心跳到达后平滑显示模型，不得出现空白灰屏。
- **FR-015**: Studio / Skills 库窗口在与数字孪生窗口重叠时必须位于数字孪生之上（z-order 更高）。

### Key Entities *(include if feature involves data)*

- **DialogueSession**: 对话模式独立维护的会话对象，切换进入时创建，不与 TeachingSession 共享 history 数组。
- **ReflectionResult**: ReflectionEngine 处理 LLM 输出后得到的评估结果，必须包含 `decision`、`missingInfoCount`（来源为本轮 LLM 响应）。
- **PreliminaryDiagram**: 需求总结阶段生成的初步流程图，mermaid 纯文本格式，不含 JSON 包裹。
- **HardwarePresenceEvent**: MQTT 心跳解析后推送的组件在线/离线事件，热插拔步骤订阅该事件自动更新 UI 状态。
- **SkillCard**: 技能库中每个技能对应的展示单元，包含名称、简介、所需硬件列表与当前在线状态。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 教学→对话切换后，对话框内历史消息为空（0 条来自教学模式的消息）。
- **SC-002**: 对话模式初始化后，技能库中现有的全部技能卡片在 2 秒内渲染在对话区域顶部。
- **SC-003**: 后端日志中不再出现"LLM 返回 direct_accept 但系统仍输出澄清问题"的矛盾序列；验证：连续 5 次提交完整需求描述，每次均在 LLM 返回 direct_accept 后进入总结阶段。
- **SC-004**: 需求总结消息发出后 3 秒内，聊天界面出现初步流程图，且无 mermaid 渲染错误。
- **SC-005**: 热插拔 UI 不再出现任何"模拟插入"相关文案；连接真实硬件后，步骤状态在 5 秒内自动更新。
- **SC-006**: 桌面端视觉检查中所有用户可见 UI 元素均使用 "Tesseract"/"Tess" 命名，0 处残留旧名。
- **SC-007**: 聊天区域所有渲染卡片主色调视觉检查为紫色，0 处米白/奶油色背景。

## Assumptions

- 对话模式与教学模式共用同一个 `SessionService` 实例，区分依据是 `sessionType` 字段，本次通过在切换时创建新 session ID 实现隔离，不修改 `SessionService` 的多会话管理机制。
- 现有 mermaid 渲染组件（`aily-blockly` 中 `mermaid-renderer` 或同类组件）能够接受纯文本 mermaid 代码并正常渲染；渲染失败是因为输入格式被包裹在 JSON 中而非渲染引擎本身的问题。
- MQTT 心跳数据结构和 `HardwarePresenceEvent` 已在 010 阶段定义；本轮只是将热插拔 UI 订阅该事件，不修改心跳解析逻辑。
- 品牌替换仅限前端可见文案（Angular 模板、Flutter 组件、Electron 窗口标题），不修改包名、bundle ID 或构建脚本中的标识符。
- "我的本地库"弹窗当前有硬编码的像素尺寸，本次通过调整 CSS/样式单位缩小至 75%。
- 后端 ReflectionEngine 的修复只需改变读取 `missing_info` 的时机（使用当前 LLM response 对象而非 session history 累积值），不需要改变对话协议或 session 数据结构。
