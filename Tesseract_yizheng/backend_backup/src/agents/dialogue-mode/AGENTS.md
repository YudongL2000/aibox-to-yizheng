# dialogue-mode/
> L2 | 父级: ../CLAUDE.md

成员清单
dialogue-mode-service.ts: 对话模式真相源编排器，负责技能匹配、MimicLaw 兜底对话、MQTT runtime 硬件校验、部署确认与教学接力。
dialogue-mode-catalog.ts: 对话技能目录折叠器、输入分类与匹配规则，消费 skills 库记录并划分“特定技能请求/普通对话”边界。
dialogue-mode-router.ts: 对话模式语义路由器，调用 backend LLM 把用户输入判定为闲聊、已知技能或未知技能请求，规则分类只做兜底。
hardware-validation.ts: 本地硬件事件归一化与 readiness 计算，统一插拔、快照、失败与部署条件判断。
skill-library-repository.ts: skills 库 JSON 真相源，负责教学完成产物持久化、skills 列表读取与对话模式摘要折叠。

法则
- 该目录只处理 OpenClaw 对话模式，不得重新吸收 workflow/config 主链逻辑。
- backend 生成的 `dialogueMode` envelope 是唯一业务输出，前端只消费，不反推。
- 硬件桥事件必须先标准化再进入校验，不允许在 service 层直接猜原始 payload 语义。
- 普通寒暄/自由问答必须由 backend 语义路由器明确折叠成 `proxy_chat + relay`，前端只负责把原话转发给 MimicLaw，不能自己猜何时走 WS。
- MimicLaw `relay.chatId` 属于设备 transport 约束，不是业务会话 id；必须保持 ASCII-safe 且长度不超过 30，避免固件丢失回发映射。
- 已知技能不允许再靠硬编码数组维持；skills 库 JSON 才是教学模式与对话模式共享的唯一技能目录。
- 对话模式命中已有技能但缺硬件时，只能输出硬件缺失说明与 runtime 状态，不得再回退到 mock 热插拔入口；真实补齐动作必须通过 MQTT runtime command/heartbeat 进入 backend。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
