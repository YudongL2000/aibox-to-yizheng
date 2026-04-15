# 共情场景节点规范（单一生效版）

## 1. 阶段说明
1. IntakeAgent：澄清需求并生成工作流骨架。
2. ConfigAgent：按节点顺序配置设备与参数。

## 2. notes 字段规范
每个节点必须包含以下一级字段：
- `extra`
- `topology`
- `device_ID`
- `session_ID`
- `title`
- `subtitle`
- `category`
- `sub`

`category` 允许值：
`MIC | LLM | CAM | HAND | YOLO-HAND | YOLO-RPS | FACE-NET | BASE | TTS | ASR | SCREEN | SPEAKER | WHEEL | RAM | ASSIGN | LLM-EMO`

## 3. 情感交互场景（emo）

### 3.1 场景目标
- 用户说自己难过：屏幕显示难过表情，机械臂放下，语音安慰。
- 用户对机器人微笑：屏幕显示开心表情，机械臂抬起并夹两下，语音回应。

### 3.2 触发器（`n8n-nodes-base.scheduleTrigger`）
```json
{
  "name": "schedule_trigger_30s",
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1.1,
  "notes": {
    "category": "BASE",
    "sub": {
      "seconds": 5               // 该场景固定
    }
  }
}
```

### 3.3 感知器（`n8n-nodes-base.httpRequest`）
#### 3.3.1 摄像头（CAM）
```json
{
  "name": "http_request_camera_snapshot",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.3,
  "notes": {
    "category": "CAM",
    "sub": {
      "output": "camera1"         // 该场景固定
    }
  }
}
```

#### 3.3.2 麦克风（MIC）
```json
{
  "name": "http_request_microphone_capture",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.3,
  "notes": {
    "category": "MIC",
    "sub": {
      "output": "microphone1"      // 该场景固定
    }
  }
}
```

### 3.4 处理器（`n8n-nodes-base.set`）
#### 3.4.1 YOLO 手势/表情识别（YOLO-HAND）
```json
{
  "name": "set_yolov8_expression",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "notes": {
    "category": "YOLO-HAND",
    "sub": {
      "yolov_input": "camera1",     // 该场景固定
      "yolov_output": "visionLabel" // 该场景固定
    }
  }
}
```

#### 3.4.2 ASR 识别（ASR）
```json
{
  "name": "set_asr_recognition",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "notes": {
    "category": "ASR",
    "sub": {
      "asr_input": "microphone1", // 该场景固定
      "asr_output": "asr_output"  // 该场景固定
    }
  }
}
```

#### 3.4.3 情绪分类（LLM-EMO）
```json
{
  "name": "set_llm_emotion",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "notes": {
    "category": "LLM-EMO",
    "sub": {
      "prompt": "你是一个情绪分类机器人，基于用户输入，仅判断用户情绪是[开心、悲伤、愤怒、平静]后输出对应的情绪关键词",
      "llm_emo_input": "asr_output",  // 该场景固定
      "llm_emo_output": "emotionText" // 该场景固定
    }
  }
}
```

#### 3.4.4 共情回复（LLM）
```json
{
  "name": "set_llm_reply",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "notes": {
    "category": "LLM",
    "sub": {
      "prompt": "你是一个共情机器人" // 该场景固定
    }
  }
}
```

#### 3.4.5 TTS 文本准备（TTS）
```json
{
  "name": "set_tts_text",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "notes": {
    "category": "TTS",
    "sub": {
      "TTS_input": "三、二、一！", // 同石头剪刀布场景配置这个节点的逻辑
      "audio_name": "emotionText" // 该场景固定，LLM需要有能力基于场景与前后逻辑来输出字段名
    }
  }
}
```

### 3.5 逻辑器（`n8n-nodes-base.if`）
```json
{
  "name": "if_emotion_is_happy",
  "type": "n8n-nodes-base.if",
  "typeVersion": 2.2,
  "notes": {
    "category": "BASE",
    "sub": {}
  }
}
```

#### 3.5.1 IF 连接规则（强制）
1. 触发器不得直接连接多个 `if`，触发器主链只能进入一个逻辑入口节点。
2. 多情绪判断必须使用多个 `if` 节点拆分（例如 `if_emotion_is_happy`、`if_emotion_is_sad`）。
3. 每个 `if` 仅使用 `true` 分支承载业务执行器，`false` 分支必须为空数组 `[]`。
4. 多个执行器在同一 `if` 的 `true` 分支并列连接。
5. 条件命中的执行参数必须在对应执行器 `notes.sub` 中显式赋值，不允许通过额外赋值节点兜底。
6. 情绪映射固定：`微笑/开心/高兴 -> happy`，`难过/悲伤/伤心 -> sad`。

```json
{
  "name": "if_emotion_is_sad",
  "type": "n8n-nodes-base.if",
  "typeVersion": 2.2,
  "notes": {
    "category": "BASE",
    "sub": {}
  }
}
```

### 3.6 执行器（`n8n-nodes-base.code`）
#### 3.6.1 机械手（HAND）
```json
{
  "name": "code_hand_execute",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "notes": {
    "category": "HAND",
    "sub": {
      "execute_gesture": "Rock"  // ["Waving","Put_down","Middle_Finger","Victory"] 用户在ConfigAgent阶段可配置，response.type=select_single ，同配置屏幕一样4选一
    }
  }
}
```

#### 3.6.2 屏幕（SCREEN）
```json
{
  "name": "code_screen_execute_emoji",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "notes": {
    "category": "SCREEN",
    "sub": {
      "execute_emoji": "Angry" // 同石头剪刀布场景配置这个节点的逻辑
    }
  }
}
```

#### 3.6.3 喇叭（SPEAKER）
```json
{
  "name": "code_speaker_play_audio",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "notes": {
    "category": "SPEAKER",
    "sub": {
      "audio_name": "count_down" // 基于前置TTS的输出变量名填充
    }
  }
}
```

## 4. 严格约束
1. `notes.sub` 必须严格按本文件定义的键和值生成。
2. 不允许新增、删除、改名或改值。
3. 处理器固定为 `n8n-nodes-base.set`。
4. 执行器固定为 `n8n-nodes-base.code`。
5. 单次 emo 工作流中，逻辑判断必须采用“多 `if` + `true` 分支执行”的模式。
6. 任意 `if` 的 `false` 分支不得挂载执行器节点。
7. 触发器只允许一条主链入口，不允许出现“一个触发器直接分叉到多个 `if`”。
