# 009-mqtt-hardware-live/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/AGENTS.md

成员清单
spec.md: 功能规格源文件，定义 MQTT 真硬件联动的用户故事、边界与验收标准。
plan.md: 实现规划主文件，约束 backend、aily-blockly、frontend 三段链路的唯一真相源设计。
research.md: Phase 0 研究结论，记录 MQTT/P2P/日志/数字孪生协议的关键技术决策。
data-model.md: 领域模型说明，定义 heartbeat、command、preview、skills routing 等核心实体。
quickstart.md: 人工验收脚本，描述从启动到 heartbeat、上传工作流、媒体预览的联调路径。
tasks.md: 依赖有序的实现任务清单，作为 `/speckit.implement` 的执行账本。
checklists/: 规格质量检查目录，确保 spec 在进入计划阶段前没有歧义残留。
contracts/: 运行时契约目录，描述 MQTT、WS、数字孪生 scene、媒体预览等跨边界协议。

法则
- 本目录只承载 `009-mqtt-hardware-live` 这一条 feature 的规格资产，不混入其他 feature 的临时实验。
- 任何新增契约、研究结论、任务阶段，都必须在这里落盘，避免“实现先走、规格失忆”。
- 这一 feature 的设计核心是“heartbeat/command 真相源单向流动”；凡是文档里出现第二真相源，都应立即删掉或降级为缓存。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
