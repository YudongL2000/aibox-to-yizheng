# Skill Library + Dialogue Contract

## 1. Save Skill Candidate on Teaching Completion

When teaching/configuration reaches completion, the backend response must be able to carry a save candidate:

```json
{
  "type": "config_complete",
  "message": "硬件拼装完成！共配置了 6 个组件，工作流已准备就绪。",
  "totalConfigured": 6,
  "metadata": {
    "workflowId": "abc123"
  },
  "skillSaveCandidate": {
    "displayName": "石头剪刀布机器人",
    "summary": "识别用户出拳并控制机械手做出回应。",
    "keywords": ["石头剪刀布", "猜拳", "手势对战"],
    "requiredHardware": [
      {
        "componentId": "camera",
        "displayName": "摄像头",
        "acceptablePorts": ["port_7"]
      },
      {
        "componentId": "mechanical_hand",
        "displayName": "机械手",
        "acceptablePorts": ["port_2"]
      }
    ],
    "workflowId": "abc123",
    "sourceSessionId": "session-1"
  }
}
```

## 2. Save Skill Request/Response

Request:

```json
{
  "sessionId": "session-1"
}
```

Response:

```json
{
  "success": true,
  "skill": {
    "skillId": "skill_rps_20260402",
    "displayName": "石头剪刀布机器人",
    "summary": "识别用户出拳并控制机械手做出回应。",
    "keywords": ["石头剪刀布", "猜拳", "手势对战"],
    "requiredHardware": [
      {
        "componentId": "camera",
        "displayName": "摄像头",
        "acceptablePorts": ["port_7"]
      }
    ],
    "workflowId": "abc123",
    "workflowName": "石头剪刀布机器人",
    "createdAt": "2026-04-02T03:00:00.000Z",
    "updatedAt": "2026-04-02T03:00:00.000Z"
  },
  "library": {
    "total": 1,
    "updatedAt": "2026-04-02T03:00:00.000Z"
  }
}
```

## 3. List Skills Response

```json
{
  "success": true,
  "items": [
    {
      "skillId": "skill_rps_20260402",
      "displayName": "石头剪刀布机器人",
      "summary": "识别用户出拳并控制机械手做出回应。",
      "tags": ["摄像头", "机械手"],
      "requiredHardware": [
        {
          "componentId": "camera",
          "displayName": "摄像头",
          "acceptablePorts": ["port_7"]
        }
      ],
      "savedAt": "2026-04-02T03:00:00.000Z"
    }
  ]
}
```

## 4. Dialogue Envelope

The backend dialogue envelope must include real library previews and no frontend-generated mock skills:

```json
{
  "type": "dialogue_mode",
  "message": "我也想玩！但我现在还没长出手来。",
  "dialogueMode": {
    "branch": "hardware_guidance",
    "phase": "waiting_for_insert",
    "skill": {
      "skillId": "skill_rps_20260402",
      "displayName": "石头剪刀布机器人"
    },
    "librarySkills": [
      {
        "skillId": "skill_rps_20260402",
        "displayName": "石头剪刀布机器人",
        "summary": "识别用户出拳并控制机械手做出回应。",
        "tags": ["摄像头", "机械手"]
      }
    ],
    "hardware": { "validationStatus": "pending", "connectedComponents": [] },
    "uiActions": [],
    "teachingHandoff": null
  }
}
```
