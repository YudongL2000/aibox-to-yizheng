# api/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/lib/server/AGENTS.md

成员清单
README.md: API 目录说明。
agent_chat_api.dart: Agent 对话 DTO 与请求层，当前负责解析 backend-first `digitalTwinScene` 与 `dialogueMode` envelope。
dialogue_mode_models.dart: 对话模式 envelope、硬件快照、教学接力与 UI 动作 DTO。
agent_validate_hardware_api.dart: 对话模式硬件校验 API 客户端。
agent_start_deploy_api.dart: 对话模式开始部署 API 客户端。
agent_confirm_api.dart: 蓝图确认接口。
agent_confirm_node_api.dart: 配置节点确认接口。
agent_reset_session_api.dart: Agent 会话重置接口。
agent_start_config_api.dart: 配置流程启动与配置态 DTO。
agent_upload_api.dart: Agent 图片上传接口。
ai_interaction_api.dart: 历史 AI 交互接口。
base_api_service.dart: API 调用基础服务。
health_check_api.dart: 健康检查接口。
login_api.dart: 登录鉴权接口。
workflow_api.dart: workflow 查询与操作接口。

法则
- DTO 层必须把后端字段别名在这里消化干净，UI 只能消费归一化后的 Dart 模型。
- `digitalTwinScene` / `digital_twin_scene` / `scene_config` 之类别名只允许在 `agent_chat_api.dart` 处理一次，禁止上层组件重复写兼容分支。
- `dialogueMode` envelope、`validate-hardware` 和 `start-deploy` 只允许在 DTO 层解析，不得让 UI 自己拼业务状态。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
