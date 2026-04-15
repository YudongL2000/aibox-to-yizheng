# contracts/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/009-mqtt-hardware-live/AGENTS.md

成员清单
mqtt-runtime-contract.md: 定义云侧 MQTT 心跳、命令下发、命令回包与内部归一化事件的契约。
digital-twin-preview-contract.md: 定义 aily-blockly 与嵌入式 Flutter 数字孪生之间的 scene/preview 同步契约。

法则
- 契约文件必须描述跨边界消息形状与状态流，不写实现细节。
- 任何 runtime 字段增删都必须先改这里，再改代码。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
