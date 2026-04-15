# services/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/AGENTS.md

成员清单
action.service.ts: UI 动作分发总线，连接主窗口工具与编辑器动作。
at-command.service.ts: AT 指令相关服务，封装串口侧命令交互。
auth.service.ts: 用户认证状态服务，管理登录态与身份缓存。
background-agent.service.ts: 后台 Agent 会话执行器，处理 SSE/tool call 编排。
builder.service.ts: 构建服务，驱动项目编译与构建流程。
cmd.service.ts: 命令执行服务，封装本地 shell 调用。
config.service.ts: 全局配置服务，负责配置读写与缓存。
connection-aws/: AWS 连接子模块，封装云端连接能力。
connection-graph.service.ts: 连接图服务，维护节点连接关系。
converter.service.ts: 转换服务，负责工程/格式转换流程。
cross-platform-cmd.service.ts: 跨平台命令服务，处理目录复制/创建等文件系统动作。
electron.service.ts: Electron 环境封装服务，暴露平台与窗口能力。
esploader.service.ts: ESP Loader 相关服务，处理烧录前装配。
esptool-py.service.ts: esptool.py 调用服务，处理 ESP 固件烧录。
feedback.service.ts: 反馈上报服务，负责用户反馈提交。
firmware.service.ts: 固件服务，管理固件下载与安装链路。
hardware-runtime.service.ts: 硬件运行时真相源，桌面端优先走本地 `electronAPI.tesseract.hardwareStatus()`，浏览器场景才回退到 HTTP/WS；统一汇聚 heartbeat/command 日志、顶栏状态快照，并把 canonical digitalTwinScene 主动同步进 Electron scene cache。
hardware-runtime.service.spec.ts: 硬件运行时服务回归测试，锁住本地 IPC 优先级、HTTP fallback、WS 命令回包、renderer 日志写入与 digitalTwin scene cache 同步行为。
iwindow.service.ts: 窗口消息服务，封装 Electron 窗口间通信。
log.service.ts: 运行日志服务，承接应用日志与日志视图消费。
model-project.service.ts: 项目模型服务，组织项目级模型元数据。
model-train.service.ts: 模型训练服务，组织训练任务状态。
notice.service.ts: 通知服务，处理提示与公告分发。
npm.service.ts: npm 依赖服务，负责包安装与依赖检查。
onboarding.service.ts: 引导服务，管理首次使用/引导流程。
platform.service.ts: 平台差异服务，统一路径分隔符与平台判断。
project.service.spec.ts: ProjectService 回归测试，锁住项目打开/关闭行为。
project.service.ts: 项目总控服务，维护当前项目路径、路由切换与新建/打开/关闭流程。
serial.service.ts: 串口服务，封装端口打开、关闭与数据读写。
settings.service.ts: 设置服务，管理用户设置与偏好。
sscma-command.service.ts: SSCMA 命令服务，承接模型/设备相关指令。
tesseract-project.service.spec.ts: Tesseract 项目真相源测试，锁住 workflow 快照与视图同步目标契约。
tesseract-project.service.ts: Tesseract 项目真相源，负责项目模式识别、workflow 快照持久化与工作区 workflow 对齐目标广播。
tesseract-skill-library.service.ts: Tesseract skills 库真相源，统一 renderer 侧 skills 列表读取、保存入库与新技能飞入动画信号。
translation.service.ts: 翻译服务，处理 i18n 文案切换。
ui.service.ts: UI 状态服务，驱动页脚、终端与界面级状态，并统一承载子窗口 `keepAboveMain/windowRole` 打开意图。
update.service.ts: 更新服务，处理版本检查与更新流程。
uploader.service.ts: 上传服务，负责固件或资源上传。
workflow.service.ts: 工作流服务，封装工作流相关业务调用。

法则
- `ProjectService.currentProjectPath` 只代表当前活动项目上下文；真正“当前该显示哪个 workflow”只能服从 `TesseractProjectService` 的 workflow 快照与视图同步目标。
- `tesseract-project.service.ts` 是项目级 workflow 真相源；聊天层、工作区层不得各自再长出第二套 pending target 状态。
- `tesseract-skill-library.service.ts` 是 renderer 侧 skills 列表唯一真相源；Skill Center 与聊天动作不得各自偷偷缓存一份本地技能数组。
- 服务层的项目路径与 workflow 引用一旦分离，左侧工作区就会重新掉回主页或旧流程；任何修改都必须优先验证这条单向同步链。
- `UiService.openWindow()` 传递的不只是尺寸和 path；涉及数字孪生等关键子窗口时，层级意图也必须显式声明，不能再靠默认 BrowserWindow 顺序碰运气。
- `hardware-runtime.service.ts` 只消费本地 Tesseract runtime / backend HTTP fallback 状态与命令回包，不得混入 MimicLaw relay 逻辑；日志写入必须经 `log.service.ts` 统一落盘到 renderer 日志面板；数字孪生 scene 也必须从这里单向推进到 Electron cache，不能再让聊天层与 heartbeat 层各推一套。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
