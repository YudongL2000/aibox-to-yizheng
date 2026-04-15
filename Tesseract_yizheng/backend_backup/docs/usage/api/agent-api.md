# Agent Backend API

## 1. 基础信息

- API Base URL（默认）：`http://124.70.111.183:3005/`
- WebSocket URL（默认）：`ws://124.70.111.183:3005/ws`
- 端口/Host：
  - `AGENT_PORT`（默认 `3005`）
  - `AGENT_HOST`（默认 `0.0.0.0`）
- 请求体大小上限：`6mb`
- 认证：无
- 返回类型：`application/json`
- 静态文件：`/uploads/*`（人脸样本上传后可访问）

---

## 2. 通用响应包络（重要）

除少数纯结果接口（如 `/api/health`、`/api/workflow/create`、`/api/agent/config-state`）外，Agent 接口统一返回：

```json
{
  "sessionId": "string",
  "response": {
    "type": "guidance | summary_ready | workflow_ready | select_single | select_multi | image_upload | hot_plugging | config_input | config_complete | error",
    "message": "string"
  }
}
```

前端应统一走“包络解析”，不要假设所有接口直接返回 `response`。

---

## 3. AgentResponse 类型说明

### 3.1 `guidance`
用于继续收集需求。

可包含：
- `confirmedEntities`
- `missingInfo`
- `interaction`
- `metadata.showContinueButton`
- `metadata.showConfirmBuildButton`

### 3.2 `summary_ready`
需求摘要已可确认，前端可展示“确认构建”按钮。

可包含：
- `blueprint`
- `confirmedEntities`
- `missingInfo`
- `metadata.showContinueButton`
- `metadata.showConfirmBuildButton`

### 3.3 `workflow_ready`
工作流 JSON 已生成。

可包含：
- `workflow`
- `reasoning`
- `metadata.iterations`
- `metadata.nodeCount`

### 3.4 `select_single` / `select_multi` / `image_upload`
交互卡片类型。用于需求收敛阶段，也用于 ConfigAgent 阶段（例如 TTS/屏幕二次确认）。

字段：
- `interaction`: `InteractionRequest`
- `currentNode`（配置阶段可带）
- `progress`（配置阶段可带）
- `metadata.workflowId`（配置阶段可带）
- `metadata.showConfirmButton`（配置阶段通常为 `false`）

### 3.5 `hot_plugging`
当前节点需要硬件热插拔时返回。

字段：
- `currentNode`
- `progress`（可选）
- `totalNodes`（可选）
- `metadata.workflowId`
- `metadata.showConfirmButton`（通常为 `true`）

### 3.6 `config_input`
当前节点需要用户输入配置值时返回（例如语音合成文本）。

字段：
- `currentNode`
- `progress`（可选）
- `totalNodes`（可选）
- `metadata.workflowId`
- `metadata.showConfirmButton`（通常为 `false`）

### 3.7 `config_complete`
全部配置完成。

字段：
- `totalConfigured`
- `metadata.workflowId`

### 3.8 `error`
错误。

可包含：
- `details`

---

## 4. 核心数据结构（前端必用）

### 4.1 `InteractionRequest`

```json
{
  "id": "string",
  "mode": "single | multi | image",
  "field": "tts_voice | screen_emoji | chassis_action | hand_gestures | yolo_gestures | emotion_labels | arm_actions | face_profiles",
  "title": "string",
  "description": "string",
  "options": [{ "label": "string", "value": "string" }],
  "minSelections": 1,
  "maxSelections": 1,
  "selected": "string | string[]",
  "allowUpload": true,
  "uploadHint": "string"
}
```

> 注意：配置阶段里，`field: "tts_voice"` 目前被复用为“是否修改 TTS_input”的单选交互。前端应以 `title/description/options` 为准，不要按字面语义硬编码。

### 4.2 `ConfigurableNode`

```json
{
  "name": "string",
  "type": "n8n-nodes-base.set | n8n-nodes-base.httpRequest | n8n-nodes-base.code",
  "index": 0,
  "status": "pending | configuring | configured",
  "displayName": "string",
  "title": "string",
  "subtitle": "string",
  "category": "BASE | CAM | YOLO-RPS | TTS | RAM | ASSIGN | HAND | SPEAKER | SCREEN",
  "extra": "pending | configuring | configured",
  "configFields": {
    "needsTopology": true,
    "needsDeviceId": true,
    "needsTtsInput": false,
    "needsExecuteEmoji": false,
    "subKeys": ["string"]
  },
  "configValues": {
    "topology": "string",
    "device_ID": "string",
    "TTS_input": "string",
    "execute_emoji": "string",
    "sub": {
      "key": "value"
    }
  }
}
```

---

## 5. HTTP 接口

### 5.1 健康检查
**GET** `/api/health`

响应：
```json
{ "status": "ok" }
```

---

### 5.2 对话
**POST** `/api/agent/chat`

请求：
```json
{
  "message": "用户输入文本",
  "sessionId": "可选，首次不传"
}
```

响应：统一包络（见第 2 节）。

错误：
- `400`: `message is required`
- `500`: Agent 处理异常

> 行为说明：当会话已进入 `configuring` 阶段时，本接口会把 `message` 当作配置输入处理（不是普通意图对话）。

---

### 5.3 确认构建
**POST** `/api/agent/confirm`

请求：
```json
{ "sessionId": "必须" }
```

响应：统一包络。

错误：
- `400`: `sessionId is required`
- `500`: Agent 异常

---

### 5.4 确认构建（别名）
**POST** `/api/agent/confirm-build`

请求：
```json
{ "sessionId": "必须" }
```

响应：同 `/api/agent/confirm`。

---

### 5.5 重置会话
**POST** `/api/agent/reset-session`

请求：
```json
{ "sessionId": "必须" }
```

响应：
```json
{ "success": true }
```

---

### 5.6 上传人脸样本
**POST** `/api/agent/upload-face`

请求：
```json
{
  "profile": "老刘 | 老付 | 老王",
  "fileName": "laoliu.png",
  "contentBase64": "data:image/png;base64,..."
}
```

响应：
```json
{
  "success": true,
  "profile": "老刘",
  "fileId": "uuid",
  "fileName": "laoliu_<uuid>.png",
  "url": "/uploads/laoliu_<uuid>.png"
}
```

错误：
- `400`: `contentBase64 is required`
- `400`: `invalid base64 data`

---

### 5.7 创建 n8n 工作流
**POST** `/api/workflow/create`

请求（任一满足即可）：
```json
{
  "workflow": { "name": "string", "nodes": [], "connections": {} },
  "sessionId": "可选"
}
```
或
```json
{
  "sessionId": "..."
}
```

响应：
```json
{
  "workflowId": "string",
  "workflowName": "string",
  "workflowUrl": "string"
}
```

错误：
- `400`: `workflow or sessionId is required`
- `400`: n8n API 未配置（`N8N_API_URL/N8N_API_KEY`）

> 新行为：若传了 `sessionId` 且创建成功，后端会自动初始化 ConfigAgent 状态（前端可直接进入 `start-config`）。

---

### 5.8 开始配置流程
**POST** `/api/agent/start-config`

请求：
```json
{
  "sessionId": "必须",
  "workflowId": "可选",
  "workflowJson": { "name": "可选", "nodes": [], "connections": {} }
}
```

说明：
- 若 `workflowId` 与 `workflowJson` 同时提供，则会重新初始化配置状态。
- 否则使用会话里已初始化的配置状态。

响应：
```json
{
    "sessionId": "string",
    "response": {
    "type": "hot_plugging | config_input | select_single | image_upload | config_complete | error",
    "message": "string",
    "totalNodes": 5,
    "currentNode": { "name": "string" },
    "metadata": {
      "workflowId": "string",
      "showConfirmButton": false
    }
  }
}
```

错误：
- `400`: `sessionId is required`
- `500`: Config 异常

---

### 5.9 确认节点配置/拼装
**POST** `/api/agent/confirm-node`

请求（两种方式）：

1. 仅确认拼装完成（当前节点）
```json
{
  "sessionId": "必须"
}
```

2. 指定节点 + 配置值
```json
{
  "sessionId": "必须",
  "nodeName": "推荐传（currentNode.name）",
  "topology": "可选",
  "device_ID": "可选",
  "TTS_input": "可选",
  "execute_emoji": "可选",
  "sub": {
    "key": "value"
  }
}
```

字段说明：
- `sessionId`：必填，会话标识。
- `nodeName`：可选；传入时会走“指定节点配置确认”流程，不传时默认确认当前待拼装节点。
- `topology` / `device_ID` / `TTS_input` / `execute_emoji`：均为可选字符串字段，按节点能力按需传入。
- `sub`：可选对象，键值均为字符串（`Record<string, string>`）。

响应：
```json
{
    "sessionId": "string",
    "response": {
    "type": "hot_plugging | config_input | select_single | image_upload | config_complete | error",
    "message": "string",
    "currentNode": { "name": "string" },
    "progress": { "completed": 1, "total": 5 },
    "metadata": {
      "workflowId": "string",
      "showConfirmButton": true
    }
  }
}
```

错误：
- `400`: `sessionId is required`
- `500`: Config 异常

---

### 5.10 获取配置状态（用于刷新/断线恢复）
**GET** `/api/agent/config-state?sessionId=<id>`

响应：
```json
{
  "success": true,
  "data": {
    "workflowId": "string",
    "currentNode": { "name": "string" },
    "progress": {
      "total": 5,
      "completed": 2,
      "percentage": 40
    },
    "pendingCount": 3,
    "configuredCount": 2
  }
}
```

错误：
- `400`: `sessionId is required`
- `404`: `ConfigAgent not initialized`

---

## 6. WebSocket 协议

**URL**：`ws://localhost:3005/ws`

### 6.1 客户端发送

心跳：
```json
{ "type": "ping" }
```

用户消息：
```json
{ "type": "user_message", "sessionId": "可选", "message": "用户输入" }
```

确认构建：
```json
{ "type": "confirm_workflow", "sessionId": "必须" }
```

开始配置：
```json
{
  "type": "start_config",
  "sessionId": "必须",
  "data": {
    "workflowId": "可选",
    "workflowJson": { "name": "string", "nodes": [], "connections": {} }
  }
}
```

确认节点：
```json
{
  "type": "confirm_node",
  "data": {
    "sessionId": "必须",
    "nodeName": "可选",
    "topology": "可选",
    "device_ID": "可选",
    "TTS_input": "可选",
    "execute_emoji": "可选",
    "sub": { "key": "value" }
  }
}
```

拉取配置状态：
```json
{ "type": "get_config_state", "sessionId": "必须" }
```

### 6.2 服务端下发

```json
{ "type": "pong" }
```

```json
{
  "type": "agent_response",
  "sessionId": "string",
  "response": { "type": "...", "message": "..." }
}
```

```json
{
  "type": "config_state",
  "sessionId": "string",
  "data": {
    "workflowId": "string",
    "currentNode": {},
    "progress": {}
  }
}
```

```json
{ "type": "error", "message": "..." }
```

---

## 7. notes 字段（节点元数据）

当前项目内部标准：

```json
{
  "notes": {
    "title": "前端展示标题",
    "subtitle": "前端展示副标题",
    "category": "BASE | CAM | YOLO-RPS | TTS | RAM | ASSIGN | HAND | SPEAKER | SCREEN",
    "session_ID": "会话ID",
    "extra": "pending | configuring | configured",
    "topology": "可选字符串或 null",
    "device_ID": "可选字符串或 null",
    "sub": {
      "seconds": 0.5,
      "TTS_input": "...",
      "execute_emoji": "Peace"
    }
  }
}
```

兼容性说明：
- n8n API 最终要求 `notes` 为字符串；后端在 `create/update workflow` 时会自动序列化。
- 前端若直接读 n8n 返回值，需兼容 `notes` 可能是 JSON 字符串。

---

## 8. 前端对接建议流程

1. `POST /api/agent/chat`（首次不带 `sessionId`）
2. 循环对话，处理 `select_single/select_multi/image_upload`
3. 收到 `summary_ready` 后触发确认（`/api/agent/confirm-build`）
4. 收到 `workflow_ready` 后可调用 `/api/workflow/create`
5. 调用 `/api/agent/start-config` 进入配置
6. 根据 `response`：
   - `select_single`：渲染单选并继续发 `chat` 或 `confirm-node`
   - `hot_plugging`：显示硬件引导 + “已拼装完毕”按钮，提交 `/api/agent/confirm-node`
   - `config_input`：显示普通聊天输入框，由用户输入配置值后走 `/api/agent/chat`
7. 直到 `config_complete`

建议实现：
- 断线重连后调用 `/api/agent/config-state` 恢复 UI。
- 按 `metadata.showConfirmButton` 决定是否显示“已拼装完毕”按钮。
- `currentNode.configFields` + `currentNode.configValues` 用于动态渲染节点配置表单。
