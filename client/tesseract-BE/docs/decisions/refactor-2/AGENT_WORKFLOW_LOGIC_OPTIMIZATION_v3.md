# Agent 工作流逻辑优化方案 v3

**目标**: 完整的节点配置 + 灵活的组合能力，而非固定的工作流模板

**核心理念**: 组件化设计 + 组装规则，让 Agent 根据需求自由组合

---

## 设计哲学

### 拒绝的方案
```
❌ 精简版工作流（丢失完整性）
❌ 固定三条模板（丧失灵活性）
❌ 只教节点配置（无法串联）
```

### 采用的方案
```
✅ 完整的功能组件库（每个组件 2-4 节点）
✅ 灵活的组装规则（如何识别需求 → 选择组件 → 串联）
✅ 数据流转规范（组件间如何传递数据）
✅ 示例作为参考（不是模板）
```

---

## 分层架构设计

```
┌─────────────────────────────────────────────────────────┐
│  Layer 4: 质量标准                                       │
│  最小节点数、必需检查点、错误处理                         │
├─────────────────────────────────────────────────────────┤
│  Layer 3: 组装规则                                       │
│  需求分析 → 组件选择 → 串联规范 → 数据流转                │
├─────────────────────────────────────────────────────────┤
│  Layer 2: 功能组件库                                     │
│  输入组件 | 处理组件 | 判断组件 | 输出组件                 │
├─────────────────────────────────────────────────────────┤
│  Layer 1: 节点配置规范                                   │
│  IF v2 格式 | 容错表达式 | 环境变量 | timeout             │
└─────────────────────────────────────────────────────────┘
```

---

## Layer 2: 功能组件库（核心新增）

### 设计原则
```
1. 每个组件是完整的、可独立工作的功能单元
2. 组件包含 2-4 个节点（httpRequest + Set 配对）
3. 组件有明确的输入契约和输出契约
4. 组件可以自由组合、替换、扩展
```

### 组件分类

#### 类别 1: 输入采集组件（INPUT）

```typescript
// 组件结构定义
interface InputComponent {
  name: string;
  description: string;
  nodes: NodeConfig[];           // 完整节点配置
  outputContract: string[];      // 输出字段约定
  envVars: string[];             // 所需环境变量
}
```

##### 1.1 摄像头输入组件
```json
{
  "name": "camera_input",
  "description": "摄像头抓拍并提取图片数据",
  "nodes": [
    {
      "name": "httpRequest - 摄像头抓拍",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "parameters": {
        "url": "={{$env.CAMERA_SNAPSHOT_URL || \"http://robot.local/api/camera/snapshot\"}}",
        "options": { "timeout": 60000 }
      }
    },
    {
      "name": "Set - 提取图片数据",
      "type": "n8n-nodes-base.set",
      "typeVersion": 2,
      "parameters": {
        "values": {
          "string": [
            {
              "name": "imageBase64",
              "value": "={{$json.imageBase64 || $json.image || ($json.data && $json.data.imageBase64) || \"\"}}"
            }
          ]
        },
        "options": {}
      }
    }
  ],
  "outputContract": ["imageBase64"],
  "envVars": ["CAMERA_SNAPSHOT_URL"]
}
```

##### 1.2 麦克风输入组件
```json
{
  "name": "microphone_input",
  "description": "麦克风录音并提取音频数据",
  "nodes": [
    {
      "name": "httpRequest - 麦克风录音",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "parameters": {
        "url": "={{$env.MIC_CAPTURE_URL || \"http://robot.local/api/mic/capture\"}}",
        "options": { "timeout": 60000 }
      }
    },
    {
      "name": "Set - 提取音频数据",
      "type": "n8n-nodes-base.set",
      "typeVersion": 2,
      "parameters": {
        "values": {
          "string": [
            {
              "name": "audioData",
              "value": "={{$json.audioData || $json.audio || ($json.data && $json.data.audioData) || \"\"}}"
            }
          ]
        },
        "options": {}
      }
    }
  ],
  "outputContract": ["audioData"],
  "envVars": ["MIC_CAPTURE_URL"]
}
```

##### 1.3 定时触发组件
```json
{
  "name": "schedule_trigger",
  "description": "定时触发工作流",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1,
      "parameters": {
        "rule": { "interval": [{}] }
      }
    }
  ],
  "outputContract": [],
  "envVars": []
}
```

##### 1.4 Webhook 触发组件
```json
{
  "name": "webhook_trigger",
  "description": "外部 HTTP 请求触发工作流",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "parameters": {
        "httpMethod": "POST",
        "path": "={{$parameter.webhookPath || \"trigger\"}}",
        "options": {}
      }
    }
  ],
  "outputContract": ["body"],
  "envVars": []
}
```

---

#### 类别 2: AI 处理组件（PROCESS）

##### 2.1 yolov8 人脸/物体识别组件
```json
{
  "name": "yolov8_identify",
  "description": "调用 yolov8 进行人脸/物体识别",
  "inputContract": ["imageBase64"],
  "nodes": [
    {
      "name": "httpRequest - yolov8 识别",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "parameters": {
        "method": "POST",
        "url": "={{$env.YOLOV8_API_URL || \"http://ai.local/api/yolov8/identify\"}}",
        "options": { "timeout": 60000 }
      }
    },
    {
      "name": "Set - 解析识别结果",
      "type": "n8n-nodes-base.set",
      "typeVersion": 2,
      "parameters": {
        "values": {
          "string": [
            {
              "name": "person",
              "value": "={{$json.person || $json.bestMatch || $json.name || ($json.result && $json.result.person) || \"\"}}"
            },
            {
              "name": "label",
              "value": "={{$json.label || $json.class || ($json.result && $json.result.label) || \"\"}}"
            }
          ],
          "number": [
            {
              "name": "confidence",
              "value": "={{$json.confidence || ($json.result && $json.result.confidence) || 0}}"
            }
          ]
        },
        "options": {}
      }
    }
  ],
  "outputContract": ["person", "label", "confidence"],
  "envVars": ["YOLOV8_API_URL"]
}
```

##### 2.2 yolov8 手势识别组件
```json
{
  "name": "yolov8_gesture",
  "description": "调用 yolov8 进行手势识别",
  "inputContract": ["imageBase64"],
  "nodes": [
    {
      "name": "httpRequest - yolov8 手势识别",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "parameters": {
        "method": "POST",
        "url": "={{$env.YOLOV8_GESTURE_API_URL || \"http://ai.local/api/yolov8/gesture\"}}",
        "options": { "timeout": 60000 }
      }
    },
    {
      "name": "Set - 解析手势结果",
      "type": "n8n-nodes-base.set",
      "typeVersion": 2,
      "parameters": {
        "values": {
          "string": [
            {
              "name": "gesture",
              "value": "={{$json.gesture || $json.label || ($json.result && $json.result.gesture) || \"\"}}"
            }
          ],
          "number": [
            {
              "name": "confidence",
              "value": "={{$json.confidence || ($json.result && $json.result.confidence) || 0}}"
            }
          ]
        },
        "options": {}
      }
    }
  ],
  "outputContract": ["gesture", "confidence"],
  "envVars": ["YOLOV8_GESTURE_API_URL"]
}
```

##### 2.3 ASR 语音识别组件
```json
{
  "name": "asr_recognize",
  "description": "调用 ASR 进行语音转文字",
  "inputContract": ["audioData"],
  "nodes": [
    {
      "name": "httpRequest - ASR 语音识别",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "parameters": {
        "method": "POST",
        "url": "={{$env.ASR_API_URL || \"http://ai.local/api/asr\"}}",
        "options": { "timeout": 60000 }
      }
    },
    {
      "name": "Set - 解析语音文本",
      "type": "n8n-nodes-base.set",
      "typeVersion": 2,
      "parameters": {
        "values": {
          "string": [
            {
              "name": "text",
              "value": "={{$json.text || $json.transcript || ($json.data && $json.data.text) || \"\"}}"
            }
          ]
        },
        "options": {}
      }
    }
  ],
  "outputContract": ["text"],
  "envVars": ["ASR_API_URL"]
}
```

##### 2.4 StructBERT 情绪分类组件
```json
{
  "name": "structbert_emotion",
  "description": "调用 StructBERT 进行情绪分类",
  "inputContract": ["text"],
  "nodes": [
    {
      "name": "httpRequest - StructBERT 情绪分类",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "parameters": {
        "method": "POST",
        "url": "={{$env.STRUCTBERT_EMO_API_URL || \"http://ai.local/api/structbert/emotion\"}}",
        "options": { "timeout": 60000 }
      }
    },
    {
      "name": "Set - 解析情绪结果",
      "type": "n8n-nodes-base.set",
      "typeVersion": 2,
      "parameters": {
        "values": {
          "string": [
            {
              "name": "emotion",
              "value": "={{$json.label || $json.emotion || ($json.result && $json.result.emotion) || \"\"}}"
            }
          ],
          "number": [
            {
              "name": "emoConfidence",
              "value": "={{$json.confidence || ($json.result && $json.result.confidence) || 0}}"
            }
          ]
        },
        "options": {}
      }
    }
  ],
  "outputContract": ["emotion", "emoConfidence"],
  "envVars": ["STRUCTBERT_EMO_API_URL"]
}
```

##### 2.5 LLM 文本生成组件
```json
{
  "name": "llm_generate",
  "description": "调用 LLM 生成回复文本",
  "inputContract": ["prompt"],
  "nodes": [
    {
      "name": "httpRequest - LLM 文本生成",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "parameters": {
        "method": "POST",
        "url": "={{$env.LLM_API_URL || \"http://ai.local/api/llm\"}}",
        "options": { "timeout": 60000 }
      }
    },
    {
      "name": "Set - 解析 LLM 回复",
      "type": "n8n-nodes-base.set",
      "typeVersion": 2,
      "parameters": {
        "values": {
          "string": [
            {
              "name": "generatedText",
              "value": "={{$json.text || $json.answer || $json.content || ($json.data && $json.data.text) || \"\"}}"
            }
          ]
        },
        "options": {}
      }
    }
  ],
  "outputContract": ["generatedText"],
  "envVars": ["LLM_API_URL"]
}
```

---

#### 类别 3: 条件判断组件（DECISION）

##### 3.1 单条件判断组件
```json
{
  "name": "single_condition",
  "description": "单条件 IF 判断",
  "nodes": [
    {
      "name": "IF - {{conditionName}}",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 1
          },
          "conditions": [
            {
              "id": "{{uuid}}",
              "leftValue": "={{$json.{{fieldName}}}}",
              "rightValue": "{{expectedValue}}",
              "operator": {
                "type": "string",
                "operation": "equals",
                "name": "filter.operator.equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      }
    }
  ],
  "outputContract": ["true分支", "false分支"]
}
```

##### 3.2 多条件 AND 判断组件
```json
{
  "name": "multi_condition_and",
  "description": "多条件 AND 判断（所有条件都满足）",
  "nodes": [
    {
      "name": "IF - {{conditionName}}",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 1
          },
          "conditions": [
            {
              "id": "{{uuid1}}",
              "leftValue": "={{$json.{{field1}}}}",
              "rightValue": "{{value1}}",
              "operator": {
                "type": "string",
                "operation": "equals",
                "name": "filter.operator.equals"
              }
            },
            {
              "id": "{{uuid2}}",
              "leftValue": "={{$json.{{field2}}}}",
              "rightValue": "{{value2}}",
              "operator": {
                "type": "string",
                "operation": "equals",
                "name": "filter.operator.equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      }
    }
  ],
  "outputContract": ["true分支", "false分支"]
}
```

##### 3.3 多条件 OR 判断组件
```json
{
  "name": "multi_condition_or",
  "description": "多条件 OR 判断（任一条件满足）",
  "nodes": [
    {
      "name": "IF - {{conditionName}}",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 1
          },
          "conditions": [
            {
              "id": "{{uuid1}}",
              "leftValue": "={{$json.{{field1}}}}",
              "rightValue": "{{value1}}",
              "operator": { "type": "string", "operation": "equals", "name": "filter.operator.equals" }
            },
            {
              "id": "{{uuid2}}",
              "leftValue": "={{$json.{{field2}}}}",
              "rightValue": "{{value2}}",
              "operator": { "type": "string", "operation": "equals", "name": "filter.operator.equals" }
            }
          ],
          "combinator": "or"
        },
        "options": {}
      }
    }
  ],
  "outputContract": ["true分支", "false分支"]
}
```

---

#### 类别 4: 输出执行组件（OUTPUT）

##### 4.1 机械手执行组件
```json
{
  "name": "mechanical_hand_execute",
  "description": "机械手执行手势动作",
  "inputContract": ["gesture"],
  "nodes": [
    {
      "name": "Set - 配置手势参数",
      "type": "n8n-nodes-base.set",
      "typeVersion": 2,
      "parameters": {
        "values": {
          "string": [
            { "name": "handGesture", "value": "={{$json.gesture || \"default\"}}" }
          ]
        },
        "options": {}
      }
    },
    {
      "name": "httpRequest - 机械手执行",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "parameters": {
        "method": "POST",
        "url": "={{$env.ROBOT_HAND_API_URL || \"http://robot.local/api/hand/gesture\"}}",
        "options": { "timeout": 60000 }
      }
    }
  ],
  "outputContract": ["executeResult"],
  "envVars": ["ROBOT_HAND_API_URL"]
}
```

##### 4.2 机械臂执行组件
```json
{
  "name": "mechanical_arm_execute",
  "description": "机械臂执行动作",
  "inputContract": ["armAction"],
  "nodes": [
    {
      "name": "Set - 配置臂部参数",
      "type": "n8n-nodes-base.set",
      "typeVersion": 2,
      "parameters": {
        "values": {
          "string": [
            { "name": "action", "value": "={{$json.armAction || \"default\"}}" }
          ]
        },
        "options": {}
      }
    },
    {
      "name": "httpRequest - 机械臂执行",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "parameters": {
        "method": "POST",
        "url": "={{$env.ROBOT_ARM_API_URL || \"http://robot.local/api/arm/action\"}}",
        "options": { "timeout": 60000 }
      }
    }
  ],
  "outputContract": ["executeResult"],
  "envVars": ["ROBOT_ARM_API_URL"]
}
```

##### 4.3 底盘移动组件
```json
{
  "name": "chassis_move",
  "description": "底盘移动控制",
  "inputContract": ["direction", "distance"],
  "nodes": [
    {
      "name": "Set - 配置移动参数",
      "type": "n8n-nodes-base.set",
      "typeVersion": 2,
      "parameters": {
        "values": {
          "string": [
            { "name": "moveDirection", "value": "={{$json.direction || \"forward\"}}" }
          ],
          "number": [
            { "name": "moveDistance", "value": "={{$json.distance || 100}}" }
          ]
        },
        "options": {}
      }
    },
    {
      "name": "httpRequest - 底盘移动",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "parameters": {
        "method": "POST",
        "url": "={{$env.ROBOT_BASE_API_URL || \"http://robot.local/api/base/move\"}}",
        "options": { "timeout": 60000 }
      }
    }
  ],
  "outputContract": ["moveResult"],
  "envVars": ["ROBOT_BASE_API_URL"]
}
```

##### 4.4 屏幕显示组件
```json
{
  "name": "screen_display",
  "description": "屏幕显示内容（emoji/图片/文字）",
  "inputContract": ["displayContent"],
  "nodes": [
    {
      "name": "Set - 配置显示参数",
      "type": "n8n-nodes-base.set",
      "typeVersion": 2,
      "parameters": {
        "values": {
          "string": [
            { "name": "emoji", "value": "={{$json.displayContent || $json.emoji || \"开心\"}}" }
          ]
        },
        "options": {}
      }
    },
    {
      "name": "httpRequest - 屏幕显示",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "parameters": {
        "method": "POST",
        "url": "={{$env.SCREEN_EMOJI_API_URL || \"http://robot.local/api/screen/emoji\"}}",
        "options": { "timeout": 60000 }
      }
    }
  ],
  "outputContract": ["displayResult"],
  "envVars": ["SCREEN_EMOJI_API_URL"]
}
```

##### 4.5 TTS + 喇叭播报组件（组合）
```json
{
  "name": "tts_speaker_output",
  "description": "文本转语音并通过喇叭播放",
  "inputContract": ["text", "voice"],
  "nodes": [
    {
      "name": "Set - 配置 TTS 参数",
      "type": "n8n-nodes-base.set",
      "typeVersion": 2,
      "parameters": {
        "values": {
          "string": [
            { "name": "ttsText", "value": "={{$json.text || \"默认文案\"}}" },
            { "name": "ttsVoice", "value": "={{$json.voice || \"a\"}}" }
          ]
        },
        "options": {}
      }
    },
    {
      "name": "httpRequest - TTS 生成音频",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "parameters": {
        "method": "POST",
        "url": "={{$env.TTS_API_URL || \"http://ai.local/api/tts\"}}",
        "options": { "timeout": 60000 }
      }
    },
    {
      "name": "Set - 提取音频 URL",
      "type": "n8n-nodes-base.set",
      "typeVersion": 2,
      "parameters": {
        "values": {
          "string": [
            {
              "name": "audioUrl",
              "value": "={{$json.audioUrl || $json.url || ($json.data && $json.data.audioUrl) || \"\"}}"
            }
          ]
        },
        "options": {}
      }
    },
    {
      "name": "httpRequest - 喇叭播放",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "parameters": {
        "method": "POST",
        "url": "={{$env.SPEAKER_API_URL || \"http://robot.local/api/speaker/play\"}}",
        "options": { "timeout": 60000 }
      }
    }
  ],
  "outputContract": ["playResult"],
  "envVars": ["TTS_API_URL", "SPEAKER_API_URL"]
}
```

---

## Layer 3: 组装规则（核心新增）

### 3.1 需求分析规则

```markdown
# 用户需求分析步骤

STEP 1: 识别触发方式
  - 定时/周期性任务 → schedule_trigger
  - 外部事件触发 → webhook_trigger
  - 传感器事件 → 对应传感器 + 事件监听

STEP 2: 识别输入来源
  - 需要看 → camera_input（摄像头）
  - 需要听 → microphone_input（麦克风）
  - 外部数据 → webhook 数据提取

STEP 3: 识别处理需求
  - 识别人脸/物体 → yolov8_identify
  - 识别手势 → yolov8_gesture
  - 语音转文字 → asr_recognize
  - 情绪分析 → structbert_emotion
  - 生成回复 → llm_generate

STEP 4: 识别判断条件
  - 识别结果是否特定值 → single_condition
  - 多条件同时满足 → multi_condition_and
  - 多条件任一满足 → multi_condition_or

STEP 5: 识别输出执行
  - 手势动作 → mechanical_hand_execute
  - 臂部动作 → mechanical_arm_execute
  - 移动 → chassis_move
  - 显示 → screen_display
  - 语音播报 → tts_speaker_output
```

### 3.2 串联规范

```markdown
# 组件串联规范

1. 数据流向: 左 → 右（触发 → 输入 → 处理 → 判断 → 输出）

2. 输入输出契约匹配:
   - 上游组件的 outputContract 必须包含下游组件的 inputContract
   - 例: camera_input(输出 imageBase64) → yolov8_identify(需要 imageBase64) ✅

3. Set 节点桥接:
   - 当上游输出与下游输入字段名不匹配时，用 Set 节点做映射
   - 例: 上游输出 name，下游需要 person → Set 节点映射

4. 分支处理:
   - IF 节点 true 分支连接满足条件的处理
   - IF 节点 false 分支可选连接其他处理或留空

5. 并行执行:
   - 同一节点可连接多个下游（并行执行）
   - 例: Set 响应配置 → [机械手执行, TTS+喇叭播放]（并行）
```

### 3.3 组装示例

**用户需求**: "见到老刘竖个中指骂人"

**需求分析**:
```
触发: 定时检测（schedule_trigger）
输入: 摄像头（camera_input）
处理: 人脸识别（yolov8_identify）
判断: 是否老刘（single_condition: person == "liu"）
输出:
  - 机械手竖中指（mechanical_hand_execute）
  - TTS播报骂人（tts_speaker_output）
```

**组装流程**:
```
schedule_trigger
    ↓
camera_input (2节点: httpRequest摄像头 + Set提取图片)
    ↓
yolov8_identify (2节点: httpRequest识别 + Set解析结果)
    ↓
single_condition (1节点: IF person=="liu")
    ↓ (true分支)
Set - 配置响应 (gesture="middle_finger", text="滚")
    ↓ (并行)
├── mechanical_hand_execute (2节点: Set配置 + httpRequest执行)
└── tts_speaker_output (4节点: Set配置 + httpRequest TTS + Set提取URL + httpRequest喇叭)
```

**节点总数**: 1 + 2 + 2 + 1 + 1 + 2 + 4 = **13 节点**

---

## Layer 4: 质量标准

### 4.1 最小节点数检查
```
硬件机器人工作流最低标准:
  - 触发器: 1 个
  - 输入采集: 至少 2 个 (httpRequest + Set)
  - AI处理: 至少 2 个 (httpRequest + Set)
  - 条件判断: 至少 1 个 (IF)
  - 输出执行: 至少 4 个 (Set + httpRequest × n)

最低总节点数: 10 个
```

### 4.2 必需检查点
```
✅ 所有 httpRequest 使用环境变量: {{$env.XXX || "fallback"}}
✅ 所有 httpRequest 包含 timeout: 60000
✅ 所有数据提取使用容错表达式: {{$json.x || $json.y || ""}}
✅ 所有 IF 使用 v2 格式: combinator + operator{type,operation,name}
✅ 每个硬件API前后有对应的 Set 节点做数据准备/结果处理
✅ 无孤立节点（所有节点都在 connections 中）
```

### 4.3 灵活性保障
```
✅ 组件可替换: camera_input ↔ microphone_input
✅ 组件可扩展: 添加更多 AI 处理组件
✅ 流程可变化: 单分支 / 多分支 / 并行
✅ 条件可组合: AND / OR / 嵌套
✅ 输出可叠加: 同时执行多个输出组件
```

---

## 实施计划

### Phase 1: 组件库实现
```
文件: src/agents/prompts/workflow-components.ts
内容:
  - 定义组件接口
  - 实现 4 类 15 个组件
  - 导出组件库
```

### Phase 2: 组装规则实现
```
文件: src/agents/prompts/assembly-rules.ts
内容:
  - 需求分析规则
  - 串联规范
  - 质量检查函数
```

### Phase 3: System Prompt 集成
```
文件: src/agents/prompts/architect-system.ts
更新:
  - 渲染组件库到 Prompt
  - 渲染组装规则到 Prompt
  - 添加质量检查指令
```

### Phase 4: Few-Shot 更新
```
文件: src/agents/prompts/few-shot-examples.ts
更新:
  - 保留 topology + keyNodes
  - 添加 componentAssembly 字段（说明用了哪些组件）
  - 不再提供完整 JSON（由组件组装）
```

---

## 工作量估算

| Phase | 任务 | 工时 |
|-------|------|------|
| Phase 1 | 定义组件接口 + 实现 15 个组件 | 2 小时 |
| Phase 2 | 编写组装规则 | 1 小时 |
| Phase 3 | System Prompt 集成 | 1 小时 |
| Phase 4 | Few-Shot 更新 | 30 分钟 |
| 测试 | 生成测试 + 验证 | 1.5 小时 |
| **总计** | | **6 小时** |

---

## 预期效果

### 完整性
```
节点数量: 4 → 10-15 ✅
硬件API调用: 0 → 5-8 ✅
数据转换节点: 2 → 5-8 ✅
```

### 灵活性
```
组件可替换: 输入/处理/输出可自由选择 ✅
流程可变化: 单分支/多分支/并行都支持 ✅
需求适应性: 不限于三种固定模式 ✅
```

### 质量稳定性
```
环境变量覆盖率: 100% ✅
容错表达式覆盖率: 100% ✅
IF v2 格式合规率: 100% ✅
```

---

**位置**: `/mnt/e/tesseract/docs/refactor_2/AGENT_WORKFLOW_LOGIC_OPTIMIZATION_v3.md`
**最后更新**: 2026-01-17

