# 节点配置确认机制 - 执行文档

> 版本: v1.0 | 日期: 2026-01-18
> 目标: 在工作流生成前，让用户通过前端界面确认场景特定的节点配置

## 1. 功能概述

### 1.1 问题背景

当前工作流生成存在的问题：
- Set 节点的业务配置（如 TTS 音色、显示 emoji、手势类型）使用硬编码默认值
- 用户无法在生成前自定义这些配置
- 不同场景需要不同的配置选项

### 1.2 解决方案

在 `understanding` 阶段识别到“需要配置的场景”时直接返回 **config_required**，不新增独立阶段：

```
用户意图 → 意图解析(understanding) → config_required → [用户提交配置] → generating → workflow_ready
                                     ↑
                               仍保持 understanding
```

### 1.3 配置类型

| 类型 | 交互模式 | 节点类型 | 配置项 |
|------|----------|----------|--------|
| **单选** | `single` | TTS | 音色 (a/b/c) |
| **单选** | `single` | 屏幕 | emoji (开心/难过/愤怒) |
| **单选** | `single` | 底盘 | 动作 (前进/后退/旋转90°) |
| **多选** | `multi` | 机械手 | 手势 (石头/剪刀/布/中指/V/大拇指) |
| **多选** | `multi` | yolov8手势 | 识别手势 (剪刀/石头/布/中指/V/大拇指) |
| **多选** | `multi` | StructBERT | 情绪标签 (开心/难过/微笑) |
| **多选** | `multi` | 机械臂 | 动作 (放下/抬起夹两下/挥钳子) |
| **图片** | `image` | yolov8人脸 | 人脸图片 (老刘/老付/老王) |

---

## 2. 数据结构设计

### 2.1 新增 AgentResponseType

```typescript
// src/agents/types.ts
export type AgentResponseType =
  | 'guidance'
  | 'summary_ready'
  | 'config_required'    // 新增：需要配置确认
  | 'workflow_ready'
  | 'error'
  | 'select_single'
  | 'select_multi'
  | 'image_upload';
```

### 2.2 新增 ConfigItem 类型

```typescript
// src/agents/types.ts

/** 单个配置项 */
export interface NodeConfigItem {
  /** 配置项唯一标识 */
  id: string;
  /** 对应的 InteractionField */
  field: InteractionField;
  /** 交互模式 */
  mode: 'single' | 'multi' | 'image';
  /** 显示标题 */
  title: string;
  /** 描述说明 */
  description?: string;
  /** 可选项列表 */
  options: InteractionOption[];
  /** 默认选中值（单选为 string，多选为 string[]） */
  defaultValue?: string | string[];
  /** 多选时的最小/最大选择数 */
  minSelections?: number;
  maxSelections?: number;
  /** 图片模式：是否允许上传 */
  allowUpload?: boolean;
  /** 图片模式：上传提示 */
  uploadHint?: string;
}

/** 配置确认请求 */
export interface NodeConfigRequest {
  /** 场景类型 */
  scenario: string;
  /** 需要配置的项目列表 */
  items: NodeConfigItem[];
}

/** 用户提交的配置结果 */
export interface NodeConfigResult {
  /** 配置项ID -> 选中值的映射 */
  values: Record<string, string | string[]>;
  /** 图片配置项ID -> 图片数据的映射 */
  images?: Record<string, { name: string; base64: string }[]>;
}
```

### 2.3 扩展 AgentResponse

```typescript
// src/agents/types.ts
export type AgentResponse =
  | { /* ... existing types ... */ }
  | {
      type: 'config_required';
      message: string;
      /** 配置请求 */
      configRequest: NodeConfigRequest;
      /** 当前已确认的实体 */
      confirmedEntities?: Record<string, string>;
      /** 蓝图信息（用于前端展示流程概览） */
      blueprint?: WorkflowBlueprint;
      metadata?: {
        /** 显示跳过按钮（使用默认配置） */
        showSkipButton?: boolean;
        /** 显示确认按钮 */
        showConfirmButton?: boolean;
      };
    };
```

### 2.4 扩展 AgentSession

```typescript
// src/agents/types.ts
export interface AgentSession {
  // ... existing fields ...

  /** 用户确认的节点配置 */
  nodeConfig?: NodeConfigResult;
  /** 是否已完成配置确认 */
  configConfirmed?: boolean;
}
```

---

## 3. 配置项定义

### 3.1 配置项常量

```typescript
// src/agents/node-config-options.ts

import { NodeConfigItem, InteractionOption } from './types';

// ============================================================================
// 选项定义
// ============================================================================

export const TTS_VOICE_OPTIONS: InteractionOption[] = [
  { label: '音色 A（标准女声）', value: 'a' },
  { label: '音色 B（温柔女声）', value: 'b' },
  { label: '音色 C（活力男声）', value: 'c' },
];

export const SCREEN_EMOJI_OPTIONS: InteractionOption[] = [
  { label: '开心 😊', value: '开心' },
  { label: '难过 😢', value: '难过' },
  { label: '愤怒 😠', value: '愤怒' },
];

export const CHASSIS_ACTION_OPTIONS: InteractionOption[] = [
  { label: '前进', value: 'forward' },
  { label: '后退', value: 'backward' },
  { label: '顺时针旋转 90°', value: 'rotate_cw_90' },
];

export const HAND_GESTURE_OPTIONS: InteractionOption[] = [
  { label: '石头 ✊', value: 'rock' },
  { label: '剪刀 ✌️', value: 'scissors' },
  { label: '布 🖐️', value: 'paper' },
  { label: '中指 🖕', value: 'middle_finger' },
  { label: '手势 V ✌️', value: 'v_sign' },
  { label: '大拇指 👍', value: 'thumb_up' },
];

export const YOLO_GESTURE_OPTIONS: InteractionOption[] = [
  { label: '剪刀', value: 'scissors' },
  { label: '石头', value: 'rock' },
  { label: '布', value: 'paper' },
  { label: '中指', value: 'middle_finger' },
  { label: '手势 V', value: 'v_sign' },
  { label: '大拇指', value: 'thumb_up' },
];

export const EMOTION_LABEL_OPTIONS: InteractionOption[] = [
  { label: '开心', value: 'happy' },
  { label: '难过', value: 'sad' },
  { label: '微笑', value: 'smile' },
];

export const ARM_ACTION_OPTIONS: InteractionOption[] = [
  { label: '放下', value: 'lower' },
  { label: '抬起同时反复夹两下钳子', value: 'raise_and_clamp_twice' },
  { label: '挥挥钳子', value: 'wave_clamp' },
];

export const FACE_PROFILE_OPTIONS: InteractionOption[] = [
  { label: '老刘', value: 'liu' },
  { label: '老付', value: 'fu' },
  { label: '老王', value: 'wang' },
];

// ============================================================================
// 配置项模板
// ============================================================================

export const NODE_CONFIG_TEMPLATES: Record<string, NodeConfigItem> = {
  tts_voice: {
    id: 'tts_voice',
    field: 'tts_voice',
    mode: 'single',
    title: 'TTS 音色配置',
    description: '选择语音播报使用的音色',
    options: TTS_VOICE_OPTIONS,
    defaultValue: 'a',
  },
  screen_emoji: {
    id: 'screen_emoji',
    field: 'screen_emoji',
    mode: 'single',
    title: '屏幕 Emoji 配置',
    description: '选择屏幕显示的表情',
    options: SCREEN_EMOJI_OPTIONS,
    defaultValue: '开心',
  },
  chassis_action: {
    id: 'chassis_action',
    field: 'chassis_action',
    mode: 'single',
    title: '底盘动作配置',
    description: '选择底盘移动动作',
    options: CHASSIS_ACTION_OPTIONS,
    defaultValue: 'forward',
  },
  hand_gestures: {
    id: 'hand_gestures',
    field: 'hand_gestures',
    mode: 'multi',
    title: '机械手手势配置',
    description: '选择机械手需要执行的手势（可多选）',
    options: HAND_GESTURE_OPTIONS,
    defaultValue: ['rock'],
    minSelections: 1,
    maxSelections: 6,
  },
  yolo_gestures: {
    id: 'yolo_gestures',
    field: 'yolo_gestures',
    mode: 'multi',
    title: 'YOLOv8 手势识别配置',
    description: '选择需要识别的手势类型（可多选）',
    options: YOLO_GESTURE_OPTIONS,
    defaultValue: ['rock', 'scissors', 'paper'],
    minSelections: 1,
    maxSelections: 6,
  },
  emotion_labels: {
    id: 'emotion_labels',
    field: 'emotion_labels',
    mode: 'multi',
    title: 'StructBERT 情绪识别配置',
    description: '选择需要识别的情绪类型（可多选）',
    options: EMOTION_LABEL_OPTIONS,
    defaultValue: ['happy', 'sad'],
    minSelections: 1,
    maxSelections: 3,
  },
  arm_actions: {
    id: 'arm_actions',
    field: 'arm_actions',
    mode: 'multi',
    title: '机械臂动作配置',
    description: '选择机械臂需要执行的动作（可多选）',
    options: ARM_ACTION_OPTIONS,
    defaultValue: ['raise_and_clamp_twice'],
    minSelections: 1,
    maxSelections: 3,
  },
  face_profiles: {
    id: 'face_profiles',
    field: 'face_profiles',
    mode: 'image',
    title: '人脸识别配置',
    description: '选择或上传需要识别的人脸',
    options: FACE_PROFILE_OPTIONS,
    defaultValue: [],
    allowUpload: true,
    uploadHint: '支持上传 JPG/PNG 格式的人脸照片',
  },
};
```

### 3.2 场景到配置项的映射

```typescript
// src/agents/node-config-options.ts

/** 场景类型 -> 需要配置的项目 */
export const SCENARIO_CONFIG_MAPPING: Record<string, string[]> = {
  rock_paper_scissors: [
    'tts_voice',      // 倒数播报音色
    'screen_emoji',   // 结果显示emoji
    'hand_gestures',  // 机械手手势
    'yolo_gestures',  // 手势识别范围
  ],
  gesture_interaction: [
    'tts_voice',      // 语音播报音色
    'hand_gestures',  // 机械手手势
    'face_profiles',  // 人脸识别目标
  ],
  emotion_interaction: [
    'tts_voice',      // 安慰语音音色
    'screen_emoji',   // 表情显示
    'emotion_labels', // 情绪识别范围
    'arm_actions',    // 机械臂动作
  ],
};

/** 根据场景获取配置项列表 */
export function getConfigItemsForScenario(scenario: string): NodeConfigItem[] {
  const configIds = SCENARIO_CONFIG_MAPPING[scenario] || [];
  return configIds
    .map((id) => NODE_CONFIG_TEMPLATES[id])
    .filter((item): item is NodeConfigItem => item !== undefined);
}
```

---

## 4. 流程设计

### 4.1 状态机扩展

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Agent Phase Flow                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  understanding ──► config_required ──► generating ──► deploying
│       │                 │              │              │
│       ▼                 ▼              ▼              ▼
│   guidance         (configRequest)  workflow_ready  deployed
│   select_*         
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

不新增独立阶段：
- 触发：当理解阶段识别到“需要配置的场景”，直接返回 `config_required`
- 继续：用户提交配置后进入 `generating`

### 4.2 交互流程

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. 用户输入: "见到老刘竖个中指骂人"                                         │
├──────────────────────────────────────────────────────────────────────────┤
│ 2. Agent 响应: type='config_required'                                     │
│    message: "请确认以下配置项："                                            │
│    configRequest: {                                                       │
│      scenario: 'gesture_interaction',                                     │
│      items: [                                                             │
│        { id: 'tts_voice', mode: 'single', title: 'TTS音色', ... },       │
│        { id: 'hand_gestures', mode: 'multi', title: '机械手手势', ... },  │
│        { id: 'face_profiles', mode: 'image', title: '人脸识别', ... }    │
│      ]                                                                    │
│    }                                                                      │
│    metadata: { showSkipButton: true, showConfirmButton: true }           │
├──────────────────────────────────────────────────────────────────────────┤
│ 3. 前端渲染配置表单，用户填写后点击 [确认配置]                               │
├──────────────────────────────────────────────────────────────────────────┤
│ 4. 用户提交: { values: { tts_voice: 'a', hand_gestures: ['middle_finger'] } }
├──────────────────────────────────────────────────────────────────────────┤
│ 5. Agent 响应: type='workflow_ready'                                      │
│    message: "工作流已生成，共12个节点"                                      │
│    workflow: { nodes: [...], connections: {...} }                        │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 5. API 设计

### 5.1 现有 API 扩展

**POST /api/agent/chat**

请求体扩展：
```typescript
interface ChatRequest {
  sessionId: string;
  message: string;
  /** 节点配置结果（当前一轮为 config_required 时提交） */
  nodeConfig?: NodeConfigResult;
  /** 是否跳过配置（使用默认值） */
  skipConfig?: boolean;
}
```

### 5.2 响应示例

**config_required 响应**：
```json
{
  "type": "config_required",
  "message": "在生成工作流前，请确认以下配置：",
  "configRequest": {
    "scenario": "rock_paper_scissors",
    "items": [
      {
        "id": "tts_voice",
        "field": "tts_voice",
        "mode": "single",
        "title": "TTS 音色配置",
        "description": "选择语音播报使用的音色",
        "options": [
          { "label": "音色 A（标准女声）", "value": "a" },
          { "label": "音色 B（温柔女声）", "value": "b" },
          { "label": "音色 C（活力男声）", "value": "c" }
        ],
        "defaultValue": "a"
      },
      {
        "id": "hand_gestures",
        "field": "hand_gestures",
        "mode": "multi",
        "title": "机械手手势配置",
        "options": [...],
        "defaultValue": ["rock", "scissors", "paper"],
        "minSelections": 1,
        "maxSelections": 6
      }
    ]
  },
  "blueprint": {
    "intentSummary": "石头剪刀布游戏",
    "componentSelection": {
      "scenario": "rock_paper_scissors",
      "topology": "定时触发 → 倒数播报 → ..."
    }
  },
  "metadata": {
    "showSkipButton": true,
    "showConfirmButton": true
  }
}
```

---

## 6. 前端交互设计

### 6.1 配置表单组件结构

```
┌─────────────────────────────────────────────────────────────────┐
│  节点配置确认                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ TTS 音色配置                                    [单选]    │    │
│  │ 选择语音播报使用的音色                                     │    │
│  │ ○ 音色 A（标准女声）                                      │    │
│  │ ● 音色 B（温柔女声）  ← 选中                              │    │
│  │ ○ 音色 C（活力男声）                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 机械手手势配置                                  [多选]    │    │
│  │ 选择机械手需要执行的手势（可多选）                          │    │
│  │ ☑ 石头 ✊    ☑ 剪刀 ✌️    ☑ 布 🖐️                       │    │
│  │ ☐ 中指 🖕    ☐ 手势V ✌️   ☐ 大拇指 👍                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 人脸识别配置                                   [图片]    │    │
│  │ 选择或上传需要识别的人脸                                   │    │
│  │ ☑ 老刘    ☐ 老付    ☐ 老王                              │    │
│  │ [+ 上传新人脸]                                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐                          │
│  │  使用默认配置   │  │   确认配置    │                          │
│  └───────────────┘  └───────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 前端组件设计

```typescript
// 伪代码 - React 组件结构
interface NodeConfigFormProps {
  configRequest: NodeConfigRequest;
  onSubmit: (result: NodeConfigResult) => void;
  onSkip: () => void;
}

function NodeConfigForm({ configRequest, onSubmit, onSkip }: NodeConfigFormProps) {
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [images, setImages] = useState<Record<string, FileInfo[]>>({});

  return (
    <div className="node-config-form">
      <h3>节点配置确认</h3>

      {configRequest.items.map((item) => (
        <ConfigItemRenderer
          key={item.id}
          item={item}
          value={values[item.id]}
          onChange={(v) => setValues({ ...values, [item.id]: v })}
          onImageChange={item.mode === 'image' ? (imgs) => setImages({ ...images, [item.id]: imgs }) : undefined}
        />
      ))}

      <div className="actions">
        <Button onClick={onSkip}>使用默认配置</Button>
        <Button primary onClick={() => onSubmit({ values, images })}>确认配置</Button>
      </div>
    </div>
  );
}
```

---

## 7. 实现步骤

### Phase 1: 类型定义与数据结构 (预计 2h)

**文件修改**：
1. `src/agents/types.ts`
   - 添加 `config_required` 到 `AgentResponseType`
   - 添加 `NodeConfigItem`、`NodeConfigRequest`、`NodeConfigResult` 类型
   - 扩展 `AgentResponse` 添加 `config_required` 分支
   - 扩展 `AgentSession` 添加 `nodeConfig` 字段

2. `src/agents/node-config-options.ts` (新建)
   - 定义各类配置选项常量
   - 定义配置项模板
   - 实现 `getConfigItemsForScenario` 函数

### Phase 2: 后端逻辑实现 (预计 4h)

**文件修改**：
1. `src/agents/session-service.ts`
   - 添加 `setNodeConfig` 方法
   - 添加 `getNodeConfig` 方法
   - 扩展会话状态管理

2. `src/agents/intake-agent.ts`
   - 在 `understanding` 阶段识别到需要配置时直接返回 `config_required`
   - 添加 `generateConfigRequest` 方法
   - 添加 `handleConfigSubmit` 方法
   - 支持跳过配置（使用默认值）

3. `src/agents/workflow-architect.ts`
   - 修改 `buildUserMessage` 使用用户配置
   - 添加配置注入到 scenarioGuidance

### Phase 3: API 层适配 (预计 2h)

**文件修改**：
1. `src/agent-server/server.ts`
   - 扩展 chat 接口支持 `nodeConfig/skipConfig` 参数
   - 在同一接口内处理配置提交
2. `src/agent-server/websocket.ts`
   - `user_message` 支持携带 `nodeConfig/skipConfig`

### Phase 4: 测试 (预计 2h)

**测试文件**：
1. `tests/unit/agents/node-config-options.test.ts` (新建)
   - 测试配置项映射
   - 测试默认值

2. `tests/unit/agents/intake-agent.test.ts`
   - 添加配置确认流程测试

---

## 8. 关键代码示例

### 8.1 IntakeAgent 配置请求生成

```typescript
// src/agents/intake-agent.ts

private generateConfigRequest(
  scenario: string,
  blueprint: WorkflowBlueprint
): AgentResponse {
  const items = getConfigItemsForScenario(scenario);

  if (items.length === 0) {
    // 无需配置，直接进入生成阶段
    return this.startWorkflowGeneration(/* ... */);
  }

  return {
    type: 'config_required',
    message: '在生成工作流前，请确认以下配置：',
    configRequest: {
      scenario,
      items,
    },
    blueprint,
    metadata: {
      showSkipButton: true,
      showConfirmButton: true,
    },
  };
}
```

### 8.2 配置注入到工作流生成

```typescript
// src/agents/workflow-architect.ts

private buildUserMessage(request: WorkflowRequest): string {
  const selection = request.blueprint?.componentSelection;
  const nodeConfig = request.nodeConfig; // 用户确认的配置

  // 将用户配置注入到 scenarioGuidance
  let configuredGuidance = selection?.scenarioGuidance ?? '';
  if (nodeConfig && selection?.scenario) {
    configuredGuidance = this.injectUserConfig(configuredGuidance, nodeConfig);
  }

  // ... 构建 userMessage
}

private injectUserConfig(guidance: string, config: NodeConfigResult): string {
  // 替换 guidance 中的默认值为用户选择的值
  let result = guidance;

  for (const [key, value] of Object.entries(config.values)) {
    switch (key) {
      case 'tts_voice':
        result = result.replace(/"ttsVoice", "value": "[^"]+"/g,
          `"ttsVoice", "value": "${value}"`);
        break;
      case 'screen_emoji':
        result = result.replace(/"resultEmoji", "value": "[^"]+"/g,
          `"resultEmoji", "value": "${value}"`);
        break;
      // ... 其他配置项
    }
  }

  return result;
}
```

---

## 9. 注意事项

### 9.1 向后兼容

- `config_required` 为可选响应，场景无配置项时自动跳过
- 前端未升级时，用户可通过发送"继续"或"确认"跳过配置
- 默认配置保证工作流可正常生成

### 9.2 性能考虑

- 配置项列表在内存中缓存，无需数据库查询
- 图片上传使用 Base64，单张限制 2MB
- 会话超时后配置信息一同清理

### 9.3 扩展性

- 新增配置项只需修改 `NODE_CONFIG_TEMPLATES`
- 新增场景映射只需修改 `SCENARIO_CONFIG_MAPPING`
- 支持动态配置项（从数据库加载）

---

## 10. 验收标准

1. **功能验收**
   - [ ] 三类场景均能正确触发配置确认
   - [ ] 单选/多选/图片三种模式均可正常交互
   - [ ] 跳过配置后使用默认值生成
   - [ ] 用户配置正确注入到生成的工作流

2. **API 验收**
   - [ ] `config_required` 响应格式正确
   - [ ] `nodeConfig` 参数正确处理
   - [ ] 错误情况返回友好提示

3. **测试验收**
   - [ ] 单元测试覆盖率 > 80%
   - [ ] 集成测试通过

---

## 附录 A: InteractionField 完整映射

| InteractionField | 配置项 ID | 对应节点 | 影响字段 |
|------------------|-----------|----------|----------|
| `tts_voice` | `tts_voice` | Set - 配置 TTS 参数 | `ttsVoice` |
| `screen_emoji` | `screen_emoji` | Set - 配置显示参数 | `emoji`, `resultEmoji` |
| `chassis_action` | `chassis_action` | Set - 配置移动参数 | `moveDirection` |
| `hand_gestures` | `hand_gestures` | Set - 配置手势参数 | `gesture`, `handGesture` |
| `yolo_gestures` | `yolo_gestures` | IF - 手势判断 | `rightValue` (条件值) |
| `emotion_labels` | `emotion_labels` | IF - 情绪判断 | `rightValue` (条件值) |
| `arm_actions` | `arm_actions` | Set - 配置臂部参数 | `armAction` |
| `face_profiles` | `face_profiles` | IF - 人脸判断 | `rightValue` (条件值) |

---

**文档结束**
