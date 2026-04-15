# server/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/AGENTS.md

成员清单
AGENTS.md: server 模块地图，约束 HTTP/MQTT/协议 DTO 的职责边界。
Http_config.dart: 统一维护 API 基础地址与环境入口。
Http_request.dart: HTTP 请求封装层。
api/: Agent/login/workflow 等 API DTO 与调用层。
core/: HTTP 错误与响应基础模型。
hardware_bridge/: 硬件桥 facade，统一 MiniClaw WebSocket 与 MQTT 事件归一化，并负责物理 cue transport。
mqtt/: 设备事件与发布订阅桥接。
serve_tmp/: 历史网络层实验代码，当前不在数字孪生主链路。
http_config_admission.dart: admission 侧配置入口。
http_request_upload.dart: 上传请求封装。

架构
- `server/` 只描述“后端协议长什么样”，不承担业务推理。
- backend 若新增 `digitalTwinScene` 这类运行时字段，必须先在 `api/` DTO 层收口，再交给上层 UI 消费，避免页面直接吃裸 JSON。
- 硬件桥只输出统一事件、状态快照与动作 transport，不直接判定业务分支；业务真相源必须来自 backend `dialogueMode` envelope。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
