# aily-chat/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/AGENTS.md

成员清单
aily-chat.component.ts: 聊天主容器，负责模式切换、消息流转、历史会话、Skills 入库确认与 Tesseract backend Agent 桥接，并支持嵌入 `Assistant` 支持层或独立子窗口两种呈现。
aily-chat.component.html: 聊天窗口模板，展示消息流、输入区、模式切换、模型选择与 token budget 提示。
aily-chat.component.scss: 聊天窗口样式，承载嵌入态壳层、教学/对话子模式切换条与输入区的 dark-first Spatial shell 视觉层，并在 chat 局部覆盖低圆角 token，避免深色主题继续回到 14px/22px 大圆角。
components/: 消息渲染组件树，承接 aily markdown block、对话模式卡片与动作按钮事件。
services/: 协议与后端访问层，负责旧 Agent 会话管理、Tesseract backend session/workflow 桥接与响应适配。

法则
- `currentMode === 'tesseract'` 时，消息必须走 `TesseractChatService`，不能再落回旧 `ChatService`。
- Tesseract 内部再细分 `teaching/dialogue` 子模式；子模式只能由 `AilyChatComponent` 统一持有，viewer 不得偷偷改本地状态。
- 有效聊天模式必须优先从当前工作区事实推导；Tesseract 路由/项目一旦成立，旧持久化 `agent` 配置不得回弹。
- Tesseract 按钮动作只服从 backend `sessionId/workflowId/workflowUrl`；项目路径缺失时允许继续，不再制造“当前没有打开项目”的前端假约束。
- 已创建 workflow 必须优先回流到客户端 `tesseract-studio` 活动工作区；只会外部浏览器打开而不更新应用内工作区，等同于闭环断裂。
- `openWorkflowInClientWorkspace()` 不只是路由跳转，它还必须显式发布 workflow view target；只改 URL 不通知左侧 webview，同样会停在旧主页。
- “创建工作流”成功后的客户端内自动切换不能依赖 `currentProjectPath` 已经被旧状态写对；当当前路径暂时为空但仍处于 Tesseract 工作区时，容器也必须允许把结果重新同步回左侧主工作区。
- 对话模式下的硬件插拔事件只能先经 `DialogueHardwareBridgeService` 归一化，再调用 backend `validate-hardware`；禁止容器或 viewer 本地猜业务分支。
- 对话模式下的普通聊天是否透传 MimicLaw，也只能服从 backend `dialogueMode.relay`；容器只做代理，不得重写 backend 的技能判定。
- 教学完成后的“是否存入 Skills 库”确认必须服从 backend `skillSaveCandidate`；容器只能负责触发保存与打开 Skill Center，不得本地再猜候选技能内容。
- Skills 的轻量调用态与完整 Skill Center 都在聊天外层的 `Assets` 语义下被唤起；AilyChat 只负责发出动作，不承担整个支持层导航。
- `config_complete` 的 CTA 只允许上传到硬件、停止工作流与打开工作流三类，不允许再把 mock 热插拔或硬编码端口选择带回前台。
- “上传到硬件 / 停止工作流” 的用户提示必须服从 backend receipt 的真实 `status`；未 ack 或后端未启用时，容器不得直接渲染成 done。
- 配置阶段的数字孪生场景也只服从 backend `digitalTwinScene`；聊天窗口只能转发给子窗口，不能本地再猜一遍组件挂载。
- 旧登录浮层只允许存在于 Agent/QA 模式；Tesseract 模式若仍渲染 `<app-login>`，等同于把历史认证逻辑误接进 backend-first 链路。
- UI 必须显式暴露当前模式；模式已经切换但按钮仍显示旧标签，等同于制造调试幻觉。
- aily-chat 主面板、技能条、模式切换、token budget 与输入区必须统一消费 `spatial-design-ref.scss` 的 semantic vars；不要再在同一主链路混入局部硬编码青紫 glow。
- chat 宿主允许局部覆盖 `--radius-*` token，把消息气泡、viewer 卡片、输入区与 CTA 收敛到低圆角矩形；禁止在 viewer 里继续写死 `999px` 胶囊。
- `x-aily-board-viewer`、`x-aily-library-viewer`、`x-aily-button-viewer`、`x-aily-task-action-viewer`、`x-aily-blockly-viewer`、`x-aily-component-recommendation-viewer` 这类通用 viewer 必须显式使用 `var(--radius-base/sm)`，不能假设宿主 `radius-pill` 会一直被压到小值。

变更日志
- 2026-04-12: aily-chat.component.ts 开始按 hardware receipt 的 `queued/sent/acknowledged/failed` 渲染上传/停止状态，避免未真正下发也显示“已上传到硬件”。
- 2026-04-12: aily-chat.component.scss 重构为 Spatial Wireframe operator console，技能卡/输入区/资源托盘/bridge 状态统一改成实线边框 + 虚线分隔 + mono meta label 语法。
- 2026-04-12: chat 宿主和 x-dialog viewer 第三波去胶囊化，用户/TESS 气泡、配置引导、蓝图卡、CTA 与底部输入壳统一收敛到 4-6px 低圆角。
- 2026-04-12: board/library/button/task-action/blockly/recommendation viewer 第四波去胶囊化，去掉内联 `999px` 和 `radius-lg` 卡片，避免 AI chat 在不同消息类型里回弹成大圆角。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
