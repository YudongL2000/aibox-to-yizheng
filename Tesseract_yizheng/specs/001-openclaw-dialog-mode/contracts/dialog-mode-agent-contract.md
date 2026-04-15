# Contract: Dialogue Mode Agent Envelope

## Goal

在不推翻现有 `sessionId + response` 结构的前提下，为对话模式增加一个 backend-first 的 `dialogueMode` 包，让 Flutter 客户端只做渲染和本地硬件事件接入，不自行推导业务结论。

## Request

### `POST /api/agent/chat`

```json
{
  "message": "跟我玩石头剪刀布",
  "sessionId": "optional-existing-session",
  "interactionMode": "dialogue",
  "teachingContext": null
}
```

### Request fields

| Field | Type | Required | Description |
|---|---|---|---|
| message | string | yes | 用户原始输入 |
| sessionId | string | no | 复用既有会话 |
| interactionMode | enum(`teaching`, `dialogue`) | yes | 本轮交互模式 |
| teachingContext | object/null | no | 从教学模式回流时的上下文 |

## Response

```json
{
  "sessionId": "sess_123",
  "response": {
    "type": "guidance",
    "message": "没问题！我看到装备全齐，我已经等不及要赢你一把了。",
    "dialogueMode": {
      "branch": "instant_play",
      "phase": "interacting",
      "skill": {
        "skillId": "skill_rps",
        "displayName": "石头剪刀布",
        "matchStatus": "matched",
        "confidence": 0.97,
        "gameplayGuide": "你先出拳，我会识别后马上回应。",
        "requiredHardware": [
          {"componentId": "camera", "displayName": "摄像头"},
          {"componentId": "mechanical_hand", "displayName": "机械手"}
        ]
      },
      "hardware": {
        "validationStatus": "success",
        "connectedComponents": [
          {"componentId": "camera", "deviceId": "cam-001", "portId": "port_7", "status": "ready"},
          {"componentId": "mechanical_hand", "deviceId": "hand-001", "portId": "port_2", "status": "ready"}
        ],
        "missingRequirements": []
      },
      "uiActions": [],
      "physicalCue": {
        "action": "hand_stretch",
        "autoTrigger": true,
        "targetComponentId": "mechanical_hand"
      },
      "teachingHandoff": null
    }
  }
}
```

## `dialogueMode` fields

| Field | Type | Description |
|---|---|---|
| branch | enum(`instant_play`, `hardware_guidance`, `teaching_handoff`, `validation_failed`) | 会话当前落在哪条分支 |
| phase | enum(`matching_skill`, `checking_hardware`, `waiting_for_insert`, `validating_insert`, `ready_to_deploy`, `deploying`, `interacting`, `handoff_ready`, `failed`) | 当前阶段 |
| skill | object/null | 命中技能的结构化描述 |
| hardware | object/null | 最新硬件状态与缺失项 |
| uiActions | UiAction[] | 当前应展示的按钮 |
| physicalCue | object/null | 需要自动或手动触发的物理反馈 |
| teachingHandoff | object/null | 未知技能时的教学接力对象 |

## UI actions

```json
{
  "id": "start_deploy",
  "label": "开始部署",
  "kind": "primary",
  "enabled": true
}
```

```json
{
  "id": "open_teaching_mode",
  "label": "开启教学模式",
  "kind": "primary",
  "enabled": true
}
```

| Field | Type | Description |
|---|---|---|
| id | string | 稳定动作 ID，前端按 ID 路由 |
| label | string | 按钮文案 |
| kind | enum(`primary`, `secondary`, `ghost`) | 视觉类型 |
| enabled | boolean | 是否可点击 |
| payload | object/null | 动作载荷，例如 handoff 对象 |

## Follow-up actions

### `POST /api/agent/dialogue/validate-hardware`

由前端在收到本地插拔事件后调用，用于让 backend 重新判断当前技能需求是否满足。

```json
{
  "sessionId": "sess_123",
  "event": {
    "eventType": "device_inserted",
    "componentId": "mechanical_hand",
    "deviceId": "hand-001",
    "portId": "port_2"
  }
}
```

返回仍使用标准 `sessionId + response.dialogueMode` envelope。

### `POST /api/agent/dialogue/start-deploy`

只有 `phase=ready_to_deploy` 时允许调用。返回 `branch=hardware_guidance`、`phase=deploying|interacting` 的新状态，并附带 `physicalCue.action=wake`。

## Contract rules

- 前端不得在没有 `dialogueMode` 的情况下自行生成“开始部署”或“开启教学模式”按钮。
- `branch=instant_play` 时 `uiActions` 必须为空。
- `branch=teaching_handoff` 时 `uiActions` 中必须包含 `open_teaching_mode`。
- `phase=validating_insert` 期间前端可以本地显示 loading，但不得播报“准备好了”，直到 backend 返回新的 `dialogueMode`。
