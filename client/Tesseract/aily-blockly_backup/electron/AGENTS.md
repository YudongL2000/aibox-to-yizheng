# electron/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/AGENTS.md

成员清单
main.js: Electron 主进程入口，负责窗口生命周期、协议处理与全局 IPC 装配。
preload.js: Renderer 预注入桥，向 Angular 暴露窗口、文件、终端、Tesseract IPC、数字孪生场景桥与 renderer 结构化日志入口。
window.js: 主进程窗口编排与子窗口广播中心，维护已打开窗口集合、初始化数据注入与带 revision 的数字孪生场景/preview-state envelope 缓存。
tesseract-ipc.js: Tesseract/n8n IPC 注册层，把 renderer 请求路由到本地 runtime 与 backend workflow/skills/hardware 能力。
tesseract-runtime.js: Tesseract Agent runtime 管理器，优先复用已启动 backend，再按需拉起本地进程并代理 agent/workflow/skills/hardware HTTP；支持 `TESSERACT_BACKEND_MODE=external`，把桌面端切到“只复用外部 backend、不自启托管 backend”的调试模式，并把关键运行态写入结构化日志归档。
n8n-runtime.js: 本地 n8n runtime 管理器，负责编辑器启动、URL 组装、项目 workflow 导入，并确保 embedded n8n 的 public API 与 agent 专用 API key 落入共享运行时文件，同时把会话状态写入结构化日志归档。
n8n-cli-bootstrap.js: embedded n8n 的 CLI bootstrap，修正 `@/` alias 与 pnpm virtual store 解析，确保 Electron/Node 启动时不会误命中错误的依赖变体。
runtime-utils.js: runtime 公共工具，提供端口探测、HTTP 轮询、子进程终止与结构化子进程日志采集能力。
logger.js: Electron 结构化日志总线，负责 session 归档、模块分流、JSONL 清单与 renderer/main/runtime 的统一落盘，并用 `AILY_LOG_CONSOLE_LEVEL` 控制终端镜像阈值。

法则
- Agent 端口只能有一个真相源；若 backend/.env 已声明 `AGENT_PORT`，Electron runtime 必须优先对齐并尝试复用现成服务。
- 若开发者显式启用 `TESSERACT_BACKEND_MODE=external`，Electron 只能 attach 已运行 backend，不能再偷偷自启子进程；这样 backend 重启与客户端编译才能解耦。
- renderer 不直接猜测本地服务状态，所有 runtime 生命周期都通过 `tesseract-ipc.js` 与 `n8n-runtime.js` 收口。
- backend `/api/workflow/create` 是 workflow 创建真相源；renderer 不得再绕回本地 snapshot 自拼部署请求。
- skills 库只通过 backend `/api/agent/skills` 与 `/api/agent/save-skill` 访问；renderer 不得再写本地 mock cards 假装是技能库。
- embedded n8n 不得再偷偷导入默认示例 workflow；项目工作区里只允许展示当前项目明确生成的 workflow。
- 数字孪生子窗口必须作为主窗口的显式业务子窗口创建，并在复用/主窗口聚焦时重新 lift 到顶层；不能再用普通无父窗口让它被主窗口盖住。
- 配置阶段的数字孪生更新必须优先服从 backend `config-state` 读后校验得到的 canonical scene；runtime/renderer 只能缓存和转发，不再自行推断挂载结果。
- `TESSERACT_HTTP_TIMEOUT_MS` 若未显式配置，transport 超时应自动跟随 `AGENT_LLM_TIMEOUT_MS + buffer`，避免 backend 还在生成而 Electron 先行 abort。
- embedded n8n 必须默认暴露 public API；否则 `/settings/api`、`/rest/api-keys`、`/api/v1/*` 会同时消失，UI 与 backend 会被同一个开关一起掐死。
- embedded n8n 的原始 API key 只能有一个共享真相源：`aily-blockly/.tesseract-runtime/n8n/api-access.json`；`n8n-runtime.js` 负责生产它，`tesseract-runtime.js` 负责消费它。
- pnpm virtual store 解析必须优先服从“父模块 peer 关系”和“更高版本候选”，不能按字母序随便捞一个包；否则 n8n 会在启动期因加载到错误的 transitive 依赖而假死成超时。
- 数字孪生当前场景必须在主进程缓存一份带 `revision/sourcePhase/responseType/summary` 的 envelope，再广播给子窗口；否则“AI 已进入配置态”和“新开的数字孪生窗口仍是旧场景”会永久分叉。
- 数字孪生 preview-state 必须与 scene 分开缓存，但同样要带 `revision/sourcePhase/responseType/summary` 再广播；子页上行的 model click / mic / speaker control 只应投到 preview-state，不要反向污染 scene 真相源。
- 运行时硬件接口必须通过 `tesseract-runtime.js` 统一转译到 backend `/api/agent/hardware/*`，renderer 不得自己拼 URL 或猜命令字面量。
- 运行时若出现“用户手动启动实例”和“客户端自拉实例”并存，优先消除重复实例，而不是继续堆例外分支。
- 所有 Electron 侧日志必须先变成 `{session,module,source,level,message,context}` 结构化记录，再落总日志和模块日志；禁止继续只靠字符串前缀伪装模块边界。
- 终端输出不是归档真相源；默认只镜像 `warn/error`。若要放大控制台细节，只通过 `AILY_LOG_CONSOLE_LEVEL=info|debug` 显式打开。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
